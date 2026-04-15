# Migration Phases

## Objetivo general

Migrar el MVP web actual a una arquitectura seria y mantenible con:

- `apps/legacy-web` para el sistema actual congelado
- `apps/api` como boundary oficial del backend
- `apps/mobile` como nuevo frontend estrategico
- Supabase/Postgres como infraestructura base
- schema v2 aislado en `app`
- migracion de datos con backfill y cutover controlado

---

## Resumen del estado actual

### Arquitectura actual

- repositorio ya reorganizado como workspace ligero
- `apps/legacy-web` es el unico sistema de producto operativo hoy
- `apps/api` ya contiene una capa de comandos de backend sin runtime HTTP real
- `apps/api` ya contiene una base asincrona interna de outbox/polling, pero todavia sin runtime ni handlers reales
- `apps/mobile` ya tiene scaffold Expo real, pero todavia sin integracion end-to-end con `apps/api`
- `packages/contracts` y `packages/domain` ya contienen una primera implementacion compartida del dominio y del boundary
- el legacy sigue siendo un frontend estatico multipagina
- el legacy sigue teniendo backend embebido en navegador
- el contrato real operativo actual sigue siendo `apps/legacy-web` contra tablas Supabase
- ya existe soporte operativo de backfill en SQL con schema `backfill` y scripts reejecutables en `supabase/seed/`
- siguen sin existir tests ni backend v2 operativo
- el tipado fuerte existe ya en paquetes compartidos, pero todavia no gobierna el sistema entero

### Deuda tecnica critica

- `database.js` mezcla demasiadas responsabilidades
- el modelo de dominio esta duplicado
- no existe `place` canonico
- `friendships` se duplica con espejo
- no hay frontera real entre frontend y backend

### Riesgos principales

- logica sensible en cliente
- exposicion excesiva de datos y grafo social
- visibilidad mal resuelta en recomendaciones
- sesion mal protegida en frontend
- claves y dependencias externas expuestas en cliente

### Piezas rescatables

- flujos de producto
- usuarios/Auth de Supabase
- datos legacy
- parte del lenguaje visual
- parte de reglas de negocio como referencia

### Piezas que deben desaparecer como contrato

- `database.js`
- frontend escribiendo directamente en tablas
- `supabase-schema.sql` como unica fuente de verdad
- separacion `restaurants` / `desired_restaurants`
- espejo automatico de amistades
- uso del schema legacy como dominio futuro

---

## Decisiones cerradas que gobiernan el plan

### Boundary oficial

Todos los clientes hablaran con `apps/api`.
Supabase queda detras como infraestructura.

### Modelo usuario-lugar

Se usara `app.user_place_entries` como tabla unificada con:

- una fila por `user + place`
- `status = wishlist | visited`

### Recomendaciones

- maximo: 3 por usuario y semana
- semana ISO
- timezone: Europe/Madrid
- cuenta `recommendation_posts`
- no duplicados por `author + place`

### Modelo social

- amistad simetrica
- una sola fila canonica por pareja
- sin `follow`
- sin `request/accept` en v2 inicial

### Privacidad base

- perfiles: publicos minimos
- wishlist: privada
- visitas: publicas o privadas por entrada
- recomendaciones: solo publicas
- grafo social: no publico

### Reputacion

- fuente de verdad: eventos
- agregado persistido para lectura
- solo afecta la aceptacion de recomendaciones por otro usuario
- migracion por recomputacion

### Supabase

- mismo proyecto para la migracion
- schema v2 separado
- el legacy no sera el contrato futuro

---

## Fase 1 - Aislar el legacy y crear la base del monorepo

**Objetivo**
Mover el proyecto actual a `apps/legacy-web` sin cambiar comportamiento.

**Cambios**

- crear estructura base de repo
- mover el proyecto actual a `apps/legacy-web`
- ajustar solo rutas/configuracion imprescindibles

**Afecta**

- archivos root actuales
- `package.json`
- `pnpm-workspace.yaml`
- `.gitignore`
- posible `vercel.json`

**Riesgos**

- rotura de rutas relativas
- rotura de despliegue estatico

**Done**

- legacy funcionando desde `apps/legacy-web`

**Notas de ejecucion (2026-04-14)**

- se creo `apps/legacy-web` y se movieron alli los 18 archivos del proyecto web actual
- se anadio configuracion minima en raiz: `package.json`, `pnpm-workspace.yaml`, `.gitignore` y `vercel.json`
- no se modifico la logica interna del legacy ni sus nombres de archivos
- se documento la reorganizacion en `docs/planning/repo-reorganization.md`
- contradiccion detectada y mantenida a proposito: el legacy sigue hablando directo con Supabase; no se corrige en esta fase

---

## Fase 2 - Meter Supabase bajo control de versiones

**Objetivo**
Dejar de depender de un unico SQL manual.

**Cambios**

- crear `supabase/`
- baseline del estado actual
- preparar estrategia de entornos y migraciones

**Afecta**

- `supabase/config.toml`
- `supabase/migrations/*`
- documentacion de entorno

**Riesgos**

- drift entre base real y baseline
- tocar `public` antes de tiempo

**Done**

- el estado puede recrearse en entorno limpio
- se pueden aplicar migraciones v2 sin tocar el legacy

**Notas de ejecucion (2026-04-14)**

- se preparo la estructura base de `supabase/` con `migrations/` y `seed/`
- se preparo el layout del repo para las siguientes fases con `apps/api`, `apps/mobile`, `packages/contracts`, `packages/domain` y `docs/cutover`
- `apps/legacy-web/supabase-schema.sql` queda explicitamente como artefacto legacy y no como nueva fuente de verdad
- `supabase/migrations/` ya contiene migraciones reales del schema v2, pero sigue pendiente el baseline del schema legacy `public`
- la fase 2 sigue pendiente de cerrar porque aun falta la estrategia operativa de versionado del legado y su baseline

---

## Fase 3 - Definir e implantar el schema v2

**Objetivo**
Crear el dominio serio en un schema nuevo.

**Cambios**

- tablas `app.*`
- constraints
- indices
- funciones transaccionales
- vistas/read models si hacen falta
- politicas minimas

**Afecta**

- `supabase/migrations/*`

**Riesgos**

- sobrediseno
- mapeo incorrecto del legado

**Done**

- existe schema v2
- aplica desde cero
- `public` legacy sigue intacto

**Notas de ejecucion (2026-04-14)**

- se cerro el modelado de dominio en `docs/adr/004-domain-model-v2.md` antes de escribir SQL final
- se confirmo de nuevo que el modelo oficial usuario-lugar sigue siendo `user_place_entries` unificado
- se fijaron entidades canonicas, derivadas y modulos diferidos para la v2
- se diseno el schema SQL v2 en `docs/adr/005-sql-schema-v2.md` antes de escribir migraciones ejecutables
- quedaron fijadas tablas, columnas, constraints criticos, indices esenciales y operaciones transaccionales esperadas
- se implementaron las migraciones SQL versionadas del schema `app` en `supabase/migrations/`
- se implemento `adr/006-security-and-rls.md` con RLS estricta, `grants` conservadores y vistas seguras para lectura publica controlada
- `authenticated` ya no puede escribir directamente en tablas core de `app`
- la capa de comandos del core ya se implementa en `apps/api`, pero siguen pendientes el baseline legacy y cualquier funcion SQL puntual que resulte necesaria

---

## Fase 4 - Levantar el backend v2 base

**Objetivo**
Tener una API real lista para crecer.

**Cambios**

- scaffold de `apps/api`
- auth
- config
- healthcheck
- manejo de errores
- acceso a datos
- contratos compartidos

**Afecta**

- `apps/api/**/*`
- `packages/contracts/**/*`
- `packages/domain/**/*`

**Riesgos**

- mala integracion auth/API
- configuracion fragil

**Done**

- request autenticada obtiene `me` desde v2

**Notas de ejecucion (2026-04-14)**

- se implementaron `packages/domain` y `packages/contracts` como base compartida para `apps/api` y `apps/mobile`
- `packages/domain` fija tipos de dominio, enums e invariantes puras sin I/O
- `packages/contracts` fija DTOs y validaciones Zod del boundary
- se implemento `docs/adr/007-backend-commands.md` para fijar el catalogo de comandos del backend
- `apps/api/src/commands` ya contiene la capa de aplicacion para `resolve_place`, perfiles, user-place, recomendaciones y friendships
- se definieron puertos transaccionales y errores de negocio del core inicial
- se ajustaron contratos compartidos para separar recomendaciones publicas frente a DTOs del propietario
- `apps/api` sigue sin runtime HTTP, auth real y adaptadores de persistencia

**Notas de refuerzo (2026-04-15)**

- se implemento una base asincrona simple para side effects con `app.outbox_events` y `apps/api/src/async`
- la estrategia elegida es outbox durable + polling worker interno
- la persistencia durable del outbox ya no queda pendiente
- siguen pendientes los adapters SQL reales, los handlers de eventos y el runtime que ejecute el polling

---

## Fase 5 - Nucleo de listas personales

**Objetivo**
Cubrir login, perfil propio, busqueda de lugar, wishlist y visited en v2.

**Cambios**

- endpoints de perfil
- proxy/control de busqueda de lugares
- CRUD de `user_place_entries`
- transicion `wishlist -> visited`
- visibilidad y validacion

**Afecta**

- `apps/api/**/*`
- `packages/contracts/**/*`
- migraciones adicionales si hacen falta

**Riesgos**

- duplicados por ausencia de `place_id`
- colisiones por nombre

**Done**

- un usuario puede hacer el flujo base completo solo contra API v2

**Notas de ejecucion (2026-04-14)**

- se implementaron los comandos `create_or_update_profile`, `save_place_to_wishlist` y `mark_place_visited` en la capa de comandos de `apps/api`
- el flujo de negocio ya esta definido fuera del frontend, pero siguen pendientes transporte HTTP, adapters de base de datos y query side de lectura

---

## Fase 6 - Social y recomendaciones en v2

**Objetivo**
Sacar del frontend las reglas sociales criticas.

**Cambios**

- amistades
- perfil publico
- publicaciones de recomendacion
- limite semanal
- feed
- accept/reject
- expertise

**Afecta**

- `apps/api/**/*`
- `packages/contracts/**/*`
- `supabase/migrations/*`

**Riesgos**

- regresiones de privacidad
- doble contabilizacion de expertise

**Done**

- ninguna regla critica queda solo en frontend

**Notas de ejecucion (2026-04-14)**

- se implementaron los comandos `publish_recommendation`, `respond_to_recommendation`, `add_friend` y `remove_friend` en `apps/api`
- el enforcement de negocio ya esta modelado en backend, pero faltan feed/query side, runtime HTTP y persistencia real

**Notas de refuerzo (2026-04-15)**

- se reforzo especificamente el flujo de recomendaciones, reacciones y reputacion
- `publish_recommendation` valida de forma explicita contra `userPlaceEntry` valida del actor y mantiene la regla `visited + public + not hidden`
- `respond_to_recommendation` serializa la decision del viewer con lock, impide auto-reaccion y mantiene una sola reaccion persistida por viewer
- la reputacion queda explicitamente modelada como `evento + agregado`, no como contador opaco
- los side effects futuros salen por outbox interno emitido desde `apps/api`, sin meter todavia notificaciones ni jobs reales

---

## Fase 7 - Crear la app movil Expo

**Objetivo**
Tener el nuevo frontend estrategico consumiendo v2.

**Cambios**

- scaffold Expo
- sesion
- cliente API
- navegacion
- pantallas core
- base de estado y cache

**Afecta**

- `apps/mobile/**/*`
- `packages/contracts/**/*`
- `packages/domain/**/*`

**Dependencias**

- fase 5 para el nucleo
- fase 6 para social/feed completo

**Riesgos**

- scope creep
- friccion con auth/token refresh

**Done**

- la app cubre auth, busqueda, wishlist, visited y perfil
- social cuando fase 6 este cerrada

**Notas de ejecucion (2026-04-15)**

- se creo la base real de `apps/mobile` con Expo + TypeScript + Expo Router
- la app ya tiene shell autenticada, tabs base, tema y providers
- se introdujo React Query como capa de estado remoto
- se preparo un cliente HTTP autenticado base orientado a `apps/api`
- la sesion base ya usa secure storage en nativo y fallback web
- `apps/mobile` ya consume `@savory/contracts` y `@savory/domain` como fuente compartida de verdad
- las pantallas iniciales usan stubs tipados y validados para no fingir integracion con un runtime HTTP todavia inexistente
- la fase queda iniciada a nivel de scaffold real y arquitectura interna, pero siguen pendientes auth real, endpoints reales y query side productivo

---

## Fase 8 - Preparar convivencia con backfill repetible

**Objetivo**
Poder migrar datos sin improvisacion.

**Cambios**

- scripts ETL
- reconciliacion por conteos y muestras
- runbook de migracion
- flags o modo read-only para legacy

**Afecta**

- scripts
- `docs/cutover/*`
- posibles cambios minimos en `apps/legacy-web`

**Riesgos**

- deriva de datos si escriben legacy y v2 a la vez

**Done**

- ensayo completo en staging
- informe de diferencias
- rollback documentado

**Notas de ejecucion (2026-04-15)**

- se implemento un schema operativo `backfill` para mappings, skips y reconciliacion sin contaminar `app.*`
- se implementaron scripts SQL reejecutables en `supabase/seed/` para:
  - prechecks
  - backfill principal
  - postchecks
  - rollback
- la resolucion de `places` se cerro de forma conservadora:
  - `provider_place_id` cuando existe
  - si no existe, reutilizacion del `place` con proveedor cuando otra fila coincide por `name + address`
  - si aun asi no hay proveedor, solo merge por `name + address` exactos tras normalizacion conservadora
  - si no hay confianza, la fila queda aislada
- `restaurants` y `desired_restaurants` ya se migran al modelo unificado `user_place_entries`
- las recomendaciones privadas o que no cumplen reglas v2 se saltan y quedan registradas en `backfill.skipped_records`
- la reputacion no copia contadores legacy: se recompone desde aceptaciones migradas y se recalcula el score reconstruyendo la formula legacy de forma cronologica
- la fase queda iniciada a nivel de tooling y documentacion, pero todavia no validada en un rehearsal real sobre base de datos

---

## Fase 9 - Cutover controlado

**Objetivo**
Pasar la escritura real a v2 sin romper el legado.

**Cambios**

- freeze temporal de escrituras legacy
- backfill final
- activacion de `apps/api` como write boundary real
- rollout posterior de clientes nuevos
- legacy en freeze temporal y luego deprecado

**Afecta**

- configuracion de despliegue
- docs operativas
- quiza banner minimo en legacy

**Riesgos**

- perdida del ultimo delta
- problemas de sesion
- datos mal reconciliados

**Done**

- v2 es la unica fuente de escritura
- legacy deja de mandar sobre datos

**Notas de diseno (2026-04-15)**

- se cerro la estrategia de cutover en `docs/adr/010-cutover-strategy.md`
- se documento el runbook operativo en `docs/cutover/cutover-runbook.md`
- el corte queda dividido en dos etapas:
  - cambio del sistema de verdad a `app` via `apps/api`
  - rollout posterior de clientes nuevos, incluida `apps/mobile`
- se confirma de forma explicita que no habra dual-write prolongado
- se confirma de forma explicita que el legacy no seguira como cliente funcional read-only sobre `public` despues del corte; pasara a `deprecation`
- `public` queda como referencia historica y ancla de rollback limitada durante al menos 30 dias
- la fase queda iniciada a nivel de decision y runbook, pero sigue bloqueada por:
  - rehearsal real del backfill
  - runtime productivo de `apps/api`
  - mecanismos reales de freeze/deprecation en el legacy
  - rollout real de cliente nuevo

---

## Orden recomendado

1. Fase 1
2. Fase 2
3. Fase 3
4. Fase 4
5. Fase 5
6. Fase 6
7. Fase 7
8. Fase 8
9. Fase 9

### Regla importante

No construir `apps/mobile` antes de tener:

- dominio v2 cerrado
- schema v2
- seguridad
- comandos backend
- estrategia de backfill

---

## Que no se toca todavia

- reescritura del legacy a React/Next
- refactor estatico de `styles.css`
- limpieza cosmetica del JS legacy
- compartir UI entre DOM y React Native
- dual-write desde el inicio
- microservicios

---

## Que puede esperar

- reescritura web moderna
- push notifications
- analytics avanzados
- admin panel
- algoritmo de recomendaciones mas complejo
- design system compartido sofisticado

---

## Riesgos de migracion y cutover

- faltaran `place_id` en parte del legado
- habra que deduplicar por nombre/direccion
- `restaurants` y `desired_restaurants` colisionaran al unificarse
- las amistades espejo deben colapsarse a una fila canonica
- expertise no debe copiarse ciegamente
- acciones guest guardadas en `localStorage` no son migrables
- privacidad legacy de recomendaciones puede estar contaminada
- `auth_email` no debe entrar en contratos publicos v2
- mantener escrituras en paralelo demasiado tiempo encarece la reconciliacion

---

## Estado actual

- [x] Fase 1 - completada a nivel de repositorio el 2026-04-14; validacion manual pendiente
- [ ] Fase 2 - iniciada el 2026-04-14; migraciones v2 creadas, baseline legacy y estrategia de versionado pendientes
- [ ] Fase 3 - iniciada el 2026-04-14; dominio, ADR SQL, migraciones v2 y RLS cerrados, baseline legacy y funciones SQL puntuales pendientes
- [ ] Fase 4 - iniciada el 2026-04-14 y reforzada el 2026-04-15 con base asincrona durable; runtime `apps/api`, auth, adaptadores y handlers pendientes
- [ ] Fase 5 - iniciada el 2026-04-14 a nivel de capa de comandos; endpoints y query side pendientes
- [ ] Fase 6 - iniciada el 2026-04-14 y reforzada el 2026-04-15 en recomendaciones/reputacion; feed/read side, consumers del outbox y runtime siguen pendientes
- [ ] Fase 7 - iniciada el 2026-04-15 con scaffold Expo real, shell movil y cliente base; auth real e integracion con `apps/api` pendientes
- [ ] Fase 8 - iniciada el 2026-04-15 con schema `backfill`, scripts SQL de backfill y runbook; rehearsal real y validacion en staging pendientes
- [ ] Fase 9 - iniciada el 2026-04-15 a nivel de ADR y runbook; rehearsal completo, freeze real y ejecucion de produccion pendientes
