# ADR 003 - Migration Architecture

## Estado

Accepted

## Relacion con otros ADRs

Este ADR no supersede `001-migration-strategy.md` ni `002-repo-structure.md`.
Los consolida en una vista tecnica unica del sistema objetivo para que las siguientes fases tengan una referencia arquitectonica estable.

## Estado actual del sistema legacy

El sistema actual sigue viviendo en `apps/legacy-web/` y hoy es el unico producto operativo del repositorio.

Su forma real es:

- frontend estatico multipagina con HTML, CSS y JavaScript vanilla
- navegacion por paginas como `index.html`, `auth.html`, `lista.html`, `deseados.html`, `recommendations.html`, `profile.html` y `friend-list.html`
- logica centralizada en `apps/legacy-web/database.js`
- SQL legacy centralizado en `apps/legacy-web/supabase-schema.sql`
- acceso directo desde navegador a Supabase
- integracion de Google Maps / Places desde cliente

Evidencias concretas del estado actual:

- `apps/legacy-web/database.js` inicializa el cliente de Supabase en navegador y ejecuta auth, lecturas, escrituras y reglas de negocio
- `apps/legacy-web/index.html` hace guard de sesion con `localStorage` y carga Google Maps con API key en cliente
- `apps/legacy-web/supabase-schema.sql` define tablas, triggers y politicas del modelo legacy en `public`

## Problemas estructurales del MVP actual

Los principales problemas del MVP actual son:

1. No existe una frontera real entre frontend y backend.
2. `database.js` mezcla auth, cache, validacion, consultas, estado global y reglas de negocio.
3. El modelo de usuario-lugar esta duplicado entre `restaurants` y `desired_restaurants`.
4. `recommendations` replica datos del restaurante en vez de apoyarse en un lugar canonico.
5. `friendships` se mantiene con espejo de filas, lo que complica integridad y backfill.
6. El schema legacy esta pensado para sacar el MVP, no para ser contrato de largo plazo.
7. Parte de la seguridad y de la privacidad queda desplazada al cliente.

Problemas de seguridad y privacidad observables:

- acceso directo del cliente a tablas y operaciones de negocio
- guard de sesion debil basado en `localStorage`
- datos y grafo social demasiado expuestos en el schema legacy
- clave de Google Maps embebida en cliente

## Arquitectura objetivo del sistema

La arquitectura objetivo despues de la migracion es:

```text
clients
  -> apps/mobile
  -> futuros clientes
     -> apps/api
        -> supabase auth
        -> postgres en schema app
        -> storage y servicios de infraestructura
```

Convivencia durante migracion:

```text
legacy actual
  apps/legacy-web
    -> acceso directo temporal a Supabase

sistema nuevo
  apps/mobile
    -> apps/api
      -> Supabase/Postgres
```

La excepcion de `apps/legacy-web -> Supabase` es temporal y existe solo para no romper el sistema actual durante la migracion.
No es el boundary objetivo del sistema.

## Por que React Native + Expo para el frontend estrategico

Se fija `apps/mobile` con React Native + Expo por estas razones:

- el producto objetivo necesita un frontend movil serio, no una prolongacion del HTML legacy
- Expo permite bootstrap rapido y mantenible sin asumir trabajo nativo prematuro
- la base actual ya es JavaScript, por lo que la transicion a TypeScript y a un stack movil JS/TS reduce friccion del equipo
- separa claramente el nuevo frontend del legacy, evitando intentar compartir UI DOM con React Native
- encaja con una migracion progresiva donde el contrato principal pasa a ser la API y no las tablas

Decision implicita:

- no se intentara reutilizar la UI del legacy como base del frontend estrategico
- el frontend nuevo nacera directamente sobre el boundary `apps/api`

## Por que Supabase/Postgres sigue siendo infraestructura valida

Supabase/Postgres sigue siendo valido como infraestructura porque:

- ya existe en el proyecto y concentra auth y datos reales del MVP
- Postgres sigue siendo una base solida para dominio transaccional, constraints, indices y funciones criticas
- permite reutilizar autenticacion e infraestructura sin rehacer toda la plataforma
- ofrece un camino razonable para migracion incremental dentro del mismo proyecto

Pero su rol cambia:

- deja de ser backend publico consumido directamente por clientes nuevos
- pasa a ser infraestructura detras de `apps/api`
- el schema nuevo se implementara separado del legado

## Por que el esquema legacy no sera contrato futuro

`apps/legacy-web/supabase-schema.sql` es un artefacto legacy de referencia, no la fuente de verdad nueva.

Razones:

- modela mal el concepto usuario-lugar al duplicarlo en dos tablas
- mezcla decisiones de MVP con contrato de producto
- contiene politicas y exposiciones excesivas para un sistema serio
- refleja acoplamiento directo cliente -> tabla
- no ofrece una base limpia para evolucionar dominio, privacidad, recomendaciones y reputacion

Decision cerrada:

- la fuente de verdad futura de base de datos vivira en `supabase/migrations/`
- el dominio nuevo se definira en schema `app`

## Modulos principales de dominio

Los modulos de dominio v2 quedan organizados conceptualmente asi:

### 1. Identity and Profile

- identidad de usuario basada en Supabase Auth
- perfil publico minimo
- datos privados fuera del contrato publico

### 2. Places

- lugar canonico compartido
- integracion de proveedor externo de lugares sin exponerlo como contrato principal

### 3. User Place Entries

- relacion usuario + lugar
- una fila por `user + place`
- `status = wishlist | visited`
- visibilidad definida por entrada

### 4. Recommendations

- publicaciones derivadas de visitas publicas
- limite semanal por usuario
- reacciones `accepted | rejected`

### 5. Social

- amistad simetrica
- una sola fila canonica por pareja
- grafo no publico

### 6. Reputation

- eventos como fuente de verdad
- agregado materializado para lectura
- expertise afectada solo por aceptaciones validas de recomendaciones

## Arquitectura del repositorio

La estructura actual del repositorio preparada para esta migracion es:

```text
/
  apps/
    legacy-web/
    api/
    mobile/
  packages/
    contracts/
    domain/
  supabase/
    migrations/
    seed/
  docs/
    adr/
    planning/
    cutover/
```

Responsabilidad de cada zona:

- `apps/legacy-web`: sistema actual congelado
- `apps/api`: boundary oficial futuro del backend
- `apps/mobile`: frontend estrategico futuro
- `packages/contracts`: contrato compartido entre clientes nuevos y API
- `packages/domain`: tipos y helpers de dominio compartibles
- `supabase/migrations`: fuente de verdad futura de base de datos
- `supabase/seed`: semillas de entorno
- `docs/`: decisiones, plan y runbooks

## Boundary cliente -> API -> base de datos

El boundary oficial del sistema nuevo es:

```text
cliente -> apps/api -> postgres/supabase
```

Reglas:

1. Ningun cliente nuevo hablara directamente con tablas de Supabase.
2. `apps/api` valida identidad, autorizacion, payloads y comandos de dominio.
3. La base de datos protege invariantes con constraints, indices, RLS y funciones transaccionales donde haga falta.
4. El cliente se limita a UI, estado local, navegacion y optimismo controlado.

Excepcion temporal:

- `apps/legacy-web` sigue hablando directo con Supabase durante la migracion.
- Esta contradiccion con el boundary objetivo es conocida y aceptada temporalmente.

## Estrategia de migracion

La migracion sigue este orden:

1. aislar el legacy
2. preparar el workspace y la estructura objetivo
3. meter Supabase bajo control de versiones
4. definir schema v2 en `app`
5. levantar `apps/api`
6. implementar dominio personal
7. implementar social y recomendaciones
8. crear `apps/mobile`
9. preparar backfill repetible
10. ejecutar cutover controlado

Principio rector:

- primero se fija estructura y boundary
- despues se construye dominio nuevo
- al final se migra trafico y escritura

## Estrategia de cutover frente a dual-write

La estrategia elegida es:

- backfill repetible
- ensayo previo
- freeze corto de escrituras legacy
- backfill final
- activacion de escritura en v2
- legacy read-only o deprecado

No se adopta dual-write prolongado.

Razones:

- incrementa complejidad operativa
- empeora reconciliacion
- aumenta superficie de errores
- es innecesario para este tamano y fase del proyecto

## Principios de seguridad

Los principios de seguridad del sistema objetivo son:

1. el cliente no es fuente de verdad de reglas criticas
2. las decisiones de autorizacion viven en backend y base de datos
3. el acceso publico a datos se minimiza por defecto
4. la wishlist es privada
5. las recomendaciones son solo publicas y solo salen de visitas publicas
6. el grafo social no es publico
7. secretos y claves de infraestructura no deben vivir en clientes nuevos
8. los campos sensibles no entran en contratos publicos
9. la base de datos debe tener constraints e invariantes explicitas
10. la reputacion debe poder recomputarse desde eventos

Campos que no deben exponerse en contratos publicos nuevos:

- `auth_email`
- tokens
- claims internos de auth
- ids internos que no formen parte del contrato publico
- metadata sensible de proveedores

## Que logica vive en cliente, backend y base de datos

### Cliente

- presentacion
- navegacion
- estado local
- cache de lectura
- optimismo no critico
- manejo de formularios

### Backend (`apps/api`)

- validacion de comandos
- autorizacion de casos de uso
- composicion de respuestas
- orchestration de dominio
- rate limiting y protecciones de borde cuando se implementen
- integracion con proveedores externos de forma controlada

### Base de datos

- constraints
- unicidad
- integridad referencial
- transacciones
- funciones criticas cuando aporten atomicidad
- persistencia de eventos y agregados derivados
- RLS como defensa adicional y no como sustituto de la API

## Decisiones arquitectonicas ya cerradas

Quedan cerradas y vigentes:

- `apps/legacy-web` como sistema legacy aislado
- `apps/api` como boundary oficial futuro
- `apps/mobile` con React Native + Expo
- Supabase/Postgres como infraestructura valida detras de la API
- schema v2 separado en `app`
- `user_place_entries` como modelo unificado usuario-lugar
- amistad simetrica con fila canonica
- limite de 3 recomendaciones por usuario y semana ISO en `Europe/Madrid`
- recomendaciones solo publicas
- wishlist privada
- reputacion basada en eventos con agregado persistido
- cutover con freeze corto y sin dual-write prolongado

## Decisiones pospuestas o deliberadamente fuera de alcance

Quedan fuera de alcance de este ADR y se cerraran en fases posteriores:

- framework exacto y stack interno de `apps/api`
- definicion exacta de contratos HTTP
- diseno detallado del schema v2 y nombres de columnas
- proveedor final y encapsulacion exacta de busqueda de lugares
- estrategia offline de la app movil
- push notifications
- observabilidad completa
- admin panel
- reescritura del legacy web
- detalles operativos de backfill y cutover

## Contradicciones detectadas al consolidar

### Codigo vs documentacion

1. El boundary objetivo ya esta fijado como `cliente -> apps/api -> base de datos`, pero el codigo real del legacy sigue usando `apps/legacy-web/database.js` para hablar directo con Supabase.
2. El sistema objetivo elimina el schema legacy como contrato futuro, pero el unico schema operativo hoy sigue siendo `apps/legacy-web/supabase-schema.sql`.

### Documentacion vs documentacion

1. `docs/README.md` reservaba `ADR 003` para otro documento futuro. Esta contradiccion se resuelve en esta fase fijando `ADR 003` como `migration-architecture`.

## Consecuencia practica para siguientes fases

Este ADR deja cerrada la vista de sistema.
Las siguientes fases no deben discutir de nuevo:

- si habra API propia
- si el frontend estrategico sera Expo
- si el schema legacy puede ser contrato futuro
- si se hara dual-write prolongado

Las siguientes fases si deben concretar:

- schema v2
- contratos
- comandos backend
- runbooks operativos
