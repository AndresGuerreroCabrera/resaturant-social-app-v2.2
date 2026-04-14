# ADR 001 — Migration Strategy

## Estado
Accepted

## Contexto

El proyecto actual es un MVP web de una app social de restaurantes construido como repositorio plano, sin workspace, sin tipado, sin tests y sin migraciones versionadas. La app está formada por varias páginas HTML estáticas, un CSS monolítico y dos scripts centrales: uno de UI/mapa y otro que actúa como backend embebido en el navegador.

La base actual depende de un único archivo SQL y el contrato real del sistema hoy es: frontend hablando directamente con tablas de Supabase.

Esto genera varios problemas estructurales:

- `database.js` mezcla auth, caché, validación, queries, reglas de negocio y estado global.
- El modelo está duplicado: `restaurants` y `desired_restaurants` representan el mismo concepto con distinto estado.
- `recommendations` copia datos del restaurante en lugar de referenciar un lugar canónico.
- `friendships` se duplica mediante un trigger espejo.
- No existe una frontera real entre frontend y backend.

Además, el sistema actual tiene riesgos de seguridad y privacidad relevantes:

- lógica sensible en cliente
- exposición excesiva de perfiles
- exposición del grafo social
- visibilidad incorrecta de recomendaciones privadas
- guard de sesión débil basado en `localStorage`
- secretos y claves embebidos en cliente

## Decisión

Se adopta una migración progresiva con estas decisiones de alto nivel:

### 1. Aislar el legacy
La app web actual se moverá a `apps/legacy-web` y quedará congelada funcionalmente salvo fixes críticos.

### 2. Crear un backend v2 separado del contrato actual
No se usará el esquema legacy actual como contrato futuro.  
Se construirá un backend v2 sobre el mismo proyecto Supabase, pero en un **schema nuevo** (`app`), con migraciones versionadas.

### 3. Boundary oficial del sistema
El boundary oficial será **híbrido**, con una regla estricta:

- los clientes hablan solo con `apps/api`
- Supabase queda detrás como infraestructura de auth, Postgres, storage y lógica SQL transaccional puntual
- Supabase no será consumido como backend público principal por la app móvil

### 4. Nuevo frontend estratégico
La app estratégica será `apps/mobile`, construida con **Expo + React Native + TypeScript**.

### 5. Modelo de dominio v2
El dominio v2 se basará en estas entidades principales:

- `app.places`
- `app.user_place_entries`
- `app.recommendation_posts`
- `app.recommendation_reactions`
- `app.friendships`
- `app.reputation_events`
- perfiles públicos mínimos y datos privados separados

### 6. Modelo usuario-lugar
Se adopta un modelo **unificado**:

- `app.places` como catálogo canónico
- `app.user_place_entries` como relación usuario-lugar
- una fila por `user + place`
- `status = wishlist | visited`

Si más adelante hace falta historial de visitas múltiples, se añadirá una tabla adicional sin romper este contrato base.

### 7. Modelo social
La v2 inicial usará **amistad simétrica** con una sola fila canónica por pareja.  
No habrá `follow` ni `request/accept` en la primera iteración.

### 8. Reglas de recomendaciones
Se fijan estas reglas:

- límite de **3 recomendaciones por usuario y semana**
- ciclo basado en **semana ISO**
- timezone: **Europe/Madrid**
- cuenta el número de `recommendation_posts` creados
- no se permite duplicar el mismo `place` por el mismo autor

### 9. Privacidad base
Se fijan estas reglas iniciales:

- perfiles: públicos mínimos
- wishlist: siempre privada
- visitas: públicas o privadas por entrada
- recomendaciones: solo públicas
- una recomendación solo puede publicarse desde una visita pública
- el grafo social no será público
- cada usuario verá sus amistades, pero no la red completa de terceros

### 10. Reputación / expertise
La reputación se modelará con:

- **eventos** como fuente de verdad
- **agregado materializado** para lectura rápida

Solo afecta expertise la **aceptación de una recomendación por otro usuario autenticado**.  
No afectarán expertise: publicar, rechazar, guardar en wishlist, visitar o añadir amistad.

La migración de expertise se hará **recomputando**, no copiando contadores legacy.

### 11. Estrategia de migración
La migración seguirá esta dirección:

- aislar legacy
- versionar Supabase
- crear schema v2
- levantar `apps/api`
- implementar dominio personal
- implementar social y recomendaciones
- crear app móvil
- hacer backfill repetible
- cutover con freeze corto
- dejar legacy read-only o deprecado

### 12. Estrategia de cutover
La estrategia elegida es:

- mismo proyecto Supabase
- schema v2 separado
- backfill ensayado
- freeze corto de escrituras legacy
- cutover controlado
- no dual-write prolongado

## Consecuencias

### Positivas
- desaparece el frontend como guardián de reglas críticas
- el esquema deja de ser API pública accidental
- se reduce la deuda estructural del MVP
- la app móvil nace sobre un contrato estable
- la migración puede hacerse de forma progresiva

### Costes
- hay que construir una capa API real
- hay que mantener legacy y v2 en paralelo durante una fase
- habrá trabajo de backfill y reconciliación
- parte del modelo actual no se puede conservar tal cual

## Qué no se hará por ahora

- reescribir el legacy a React/Next
- compartir UI entre web legacy y React Native
- hacer dual-write desde el inicio
- convertir la arquitectura en microservicios
- optimizar prematuramente push, analytics avanzados o discovery complejo