# ADR 010 - Cutover Strategy

## Estado

Accepted

## Relacion con otros ADRs

Este ADR aterriza la estrategia de paso a produccion ya apuntada en:

- `001-migration-strategy.md`
- `003-migration-architecture.md`
- `005-sql-schema-v2.md`
- `006-security-and-rls.md`
- `007-backend-commands.md`
- `009-outbox-and-jobs.md`

Tambien depende de:

- `planning/backfill-plan.md`
- `cutover/backfill-runbook.md`

## Objetivo

Definir como pasar del sistema actual:

- `apps/legacy-web`
- schema legacy `public`

al sistema v2:

- `apps/api`
- schema `app`
- futura `apps/mobile`

sin dual-write prolongado, sin perder control operativo y sin dejar ambiguo el papel del legacy despues del corte.

## Estado real actual que condiciona el cutover

Hoy el repositorio esta en este punto:

- `apps/legacy-web` sigue siendo el unico cliente de producto operativo
- el legacy sigue escribiendo directamente sobre `public`
- `app.*` ya existe y esta modelado con RLS conservadora
- el backfill v1 -> v2 ya esta preparado, pero no rehearseado en runtime real
- `apps/api` ya contiene comandos y base asincrona, pero todavia no es un runtime HTTP productivo completo
- `apps/mobile` todavia no esta lista para ser parte del corte

Decision cerrada:

- el cutover no se podra ejecutar mientras `apps/api` no sea un backend operativo real con auth, adaptadores, query side, healthchecks y worker funcional

## Estrategia elegida

Se adopta un **cutover en dos etapas**, con un solo cambio de sistema de escritura y sin dual-write prolongado.

### Etapa 1 - Cutover del sistema de verdad

Objetivo:

- detener escrituras nuevas en `public`
- ejecutar backfill final
- pasar la escritura oficial a `apps/api` sobre `app`

Esta etapa es el corte critico.

### Etapa 2 - Rollout de superficies cliente

Objetivo:

- mantener estable el backend v2 ya activado
- mover el trafico nuevo hacia clientes que consuman `apps/api`
- lanzar `apps/mobile` despues de estabilizar la Etapa 1

Decision cerrada:

- `apps/mobile` no forma parte de la ventana critica de freeze
- primero cambia el sistema de verdad
- despues cambia la superficie cliente

## Por que no dual-write

Se mantiene la decision ya cerrada:

- no habra dual-write prolongado entre `public` y `app`

Justificacion:

- el sistema actual no tiene un boundary backend fiable para reconciliar escrituras en dos modelos distintos
- el legacy ya parte de un dominio mal modelado
- mantener dos sistemas de escritura al mismo tiempo elevaria mucho el riesgo de divergencia silenciosa
- un freeze corto con backfill final es mas auditable y mas reversible antes del primer write real en v2

## Rol del legacy antes, durante y despues del cutover

### Antes del cutover

- `apps/legacy-web` sigue operando en modo normal
- el sistema de verdad sigue siendo `public`

### Durante el freeze

- `apps/legacy-web` entra en `cutover_freeze`
- no se permiten nuevas escrituras de producto
- la UI debe mostrar banner o pantalla de mantenimiento/read-only temporal

### Despues del cutover exitoso

Decision cerrada:

- el legacy no debe seguir como cliente funcional read-only apoyado en `public`
- tras el corte, el legacy pasa a `deprecation`

Motivo:

- en cuanto v2 acepte nuevas escrituras, `public` deja de estar fresco
- un legacy "read-only" conectado a `public` mostraria datos obsoletos y daria una falsa sensacion de continuidad

Consecuencia:

- el modo posterior al corte debe ser una superficie de deprecacion o mantenimiento
- si se deja una vista informativa minima, debe advertir claramente que ya no es el producto activo ni una fuente de datos actualizada

## Rol del schema legacy `public`

Decision cerrada:

- `public` no se destruye en el cutover
- `public` queda congelado como referencia historica y ancla de rollback limitada
- `public` no vuelve a ser contrato de producto

Ventana minima decidida:

- mantener `public` sin cambios estructurales destructivos y sin escrituras de producto durante al menos 30 dias tras el corte exitoso

## Rol del schema v2 `app`

Decision cerrada:

- `app` pasa a ser el unico schema de escritura de producto tras el cutover
- toda escritura nueva entra por `apps/api`
- las lecturas de producto nuevas deben depender de `app` y de sus vistas/queries controladas

## Rol de `apps/api`

`apps/api` es condicion previa del corte.

Debe llegar al cutover con:

- runtime HTTP desplegable
- auth real y actor context valido
- adaptadores de persistencia para comandos y queries
- healthchecks
- logging y observabilidad minima
- worker del outbox operativo

Decision cerrada:

- no se habilitan escrituras v2 hasta que `apps/api` este listo y probado en staging

## Flags y modos operativos

No se implementan en este ADR, pero se fijan como controles esperados para ejecutar el corte.

### Legacy

Lugar previsto:

- `apps/legacy-web/runtime-config.js`

Uso previsto:

- exponer `window.__LEGACY_RUNTIME_CONFIG__`
- definir `mode = normal | cutover_freeze | deprecation`
- permitir mensajes operativos, banner y bloqueo UI sin rehacer internamente el legacy

### API v2

Lugar previsto:

- variables de entorno de `apps/api`

Controles esperados:

- `API_WRITES_ENABLED=false|true`
- `ASYNC_WORKER_ENABLED=false|true`

Uso:

- arrancar `apps/api` desplegado pero con escrituras cerradas hasta pasar validaciones
- activar worker solo cuando el sistema de escritura v2 quede abierto

## Fases del cutover

### 1. Readiness y rehearsal

- rehearsal obligatorio en staging
- validacion del backfill con datos y reconciliacion real
- smoke tests completos sobre `apps/api`
- confirmacion de observabilidad, backups y personas de guardia

### 2. Preparacion T-1

- desplegar version candidata de `apps/api`
- preparar modo `cutover_freeze` y `deprecation` en el legacy
- confirmar ventana de bajo trafico
- congelar cambios no esenciales

### 3. Freeze de legacy

- activar `cutover_freeze` en `apps/legacy-web`
- bloquear escrituras legacy a nivel operativo
- confirmar que no entran writes nuevos en `public`

### 4. Backfill final

- ejecutar prechecks
- ejecutar backfill final sobre produccion
- ejecutar postchecks y reconciliacion minima

### 5. Activacion v2

- abrir escrituras en `apps/api`
- habilitar worker asincrono
- ejecutar smoke tests de escritura real contra v2

### 6. Estabilizacion inmediata

- monitorizar errores, auth, latencia, outbox y conteos basicos
- mantener el legacy en `deprecation`

### 7. Rollout de clientes nuevos

- arrancar con usuarios internos o cohortes pequenas
- lanzar `apps/mobile` despues de estabilizar la Etapa 1

## Condiciones previas obligatorias

No se ejecuta el cutover si falta alguna de estas condiciones:

- rehearsal de backfill completado y aceptado en staging
- runbook de backfill verificado con salidas guardadas
- `apps/api` operativo de verdad, no solo modelado
- smoke tests de comandos y query side pasando en staging
- auth real y manejo de tokens verificados
- worker del outbox y handlers minimos operativos
- backup o snapshot de la base antes de la ventana
- mecanismo de `cutover_freeze` y `deprecation` preparado en el legacy
- decision de ownership del corte y ventana horaria confirmadas

## Condiciones de exito

El cutover se considera exitoso cuando:

- `public` deja de recibir escrituras de producto
- el backfill final termina sin errores
- los postchecks y reconciliaciones no muestran divergencias bloqueantes
- `apps/api` acepta escrituras reales sobre `app`
- los flujos criticos pasan smoke tests:
  - perfil propio
  - wishlist
  - visited
  - publicar recomendacion
  - reaccionar a recomendacion
  - amistades
- el worker procesa eventos del outbox sin atasco critico
- el legacy queda en `deprecation` y deja de ser superficie de escritura

## Criterio de rollback

### Antes del primer write real aceptado en v2

Decision cerrada:

- el rollback a legacy es aceptable y forma parte del plan

Ruta:

- mantener freeze
- desactivar `apps/api`
- ejecutar rollback del backfill si hace falta
- reabrir legacy

### Despues del primer write real aceptado en v2

Decision cerrada:

- no existe rollback simple al legacy como sistema de escritura

Motivo:

- no hay dual-write
- en cuanto entra data nueva en `app`, `public` deja de ser recuperable como sistema activo sin reconciliacion adicional

Respuesta esperada:

- congelar nuevas escrituras si el incidente lo exige
- mantener legacy en mantenimiento/deprecacion
- resolver por fix-forward o por plan de recuperacion especifico

Excepcion muy limitada:

- solo se podria volver al legacy si se demuestra que no llego a aceptarse ninguna escritura real en v2 despues de abrirlo

## Riesgos principales

- freeze insuficiente y entrada de writes tardios en `public`
- backfill final con discrepancias no detectadas
- `apps/api` no suficientemente maduro el dia del corte
- outbox o worker bloqueando side effects importantes
- falsa idea de "legacy read-only" mostrando datos ya desactualizados

## Tradeoffs

### Freeze corto frente a dual-write

Ventaja:

- menos complejidad y menos estados intermedios

Coste:

- exige disciplina operativa en la ventana de corte

### Legacy deprecado frente a read-only funcional

Ventaja:

- evita exponer datos stale como si fueran actuales

Coste:

- el usuario pierde la continuidad visual del cliente viejo

## Fuera de alcance de este ADR

- despliegue real a produccion
- detalle de dashboards y alertas
- rollout funcional completo de `apps/mobile`
- migracion o archivado final del schema `public` pasado el periodo de estabilizacion
