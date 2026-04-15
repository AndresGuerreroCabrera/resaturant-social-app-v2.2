# Cutover Runbook

## Alcance

Este runbook define la secuencia exacta del cutover desde:

- legacy web + schema `public`

hacia:

- `apps/api` + schema `app`

No es un documento de despliegue real todavia.
Sirve para rehearsal y para preparar la futura ejecucion en produccion.

## Decision operativa principal

El corte se hace asi:

1. freeze corto del legacy
2. backfill final
3. validacion
4. apertura de escrituras v2
5. legacy en `deprecation`

No hay dual-write prolongado.

## Estado actual

Hoy este runbook aun no puede ejecutarse de punta a punta porque siguen pendientes:

- runtime HTTP real de `apps/api`
- adaptadores reales de persistencia y auth
- worker real del outbox
- rehearsal validado en staging
- mecanismo implementado de `cutover_freeze` y `deprecation` para el legacy

## Prechecks obligatorios

No iniciar la ventana si falla cualquiera de estos puntos:

- el entorno objetivo tiene aplicadas las migraciones v2 y de backfill
- existe backup o snapshot reciente y validado
- `supabase/seed/001_backfill_prechecks.sql` no muestra bloqueos inesperados
- el rehearsal de staging ya fue ejecutado y aprobado
- `apps/api` responde healthcheck y smoke tests
- auth real y sesiones estan comprobadas en el entorno objetivo
- el worker asincrono puede arrancar y procesar un evento de prueba
- el equipo de guardia y decision esta disponible durante toda la ventana
- el legacy puede mostrar `cutover_freeze` y `deprecation` sin editar logica interna durante la ventana

## Artefactos a tener preparados

- `docs/cutover/backfill-runbook.md`
- `supabase/seed/001_backfill_prechecks.sql`
- `supabase/seed/002_backfill_v1_to_v2.sql`
- `supabase/seed/003_backfill_postchecks.sql`
- `supabase/seed/004_backfill_rollback.sql`
- build candidata de `apps/api`
- configuracion del legacy para:
  - `mode=normal`
  - `mode=cutover_freeze`
  - `mode=deprecation`

## Secuencia exacta

### 1. Congelar cambios y confirmar versions

- congelar despliegues no esenciales
- confirmar commit o version candidata de `apps/api`
- confirmar version del legacy que expone `runtime-config.js`
- confirmar que no hay migraciones pendientes fuera del plan

Continuar solo si:

- todas las versiones estan identificadas y aprobadas

### 2. Ejecutar prechecks finales

- ejecutar `supabase/seed/001_backfill_prechecks.sql`
- guardar salida completa
- revisar conteos base y warnings

Abortar si:

- aparecen filas inesperadas en `app.*`
- cambian radicalmente los volumenes esperados
- hay errores no explicados en datos legacy

### 3. Desplegar `apps/api` en modo seguro

- desplegar la version candidata de `apps/api`
- dejar `API_WRITES_ENABLED=false`
- dejar `ASYNC_WORKER_ENABLED=false`
- verificar healthcheck

Continuar solo si:

- `apps/api` esta arriba y sano, pero todavia sin aceptar escrituras de producto

### 4. Activar `cutover_freeze` en el legacy

- publicar `apps/legacy-web/runtime-config.js` con `mode=cutover_freeze`
- validar que el legacy muestra banner o pantalla de mantenimiento
- validar que la UI no invita a seguir escribiendo

Continuar solo si:

- el freeze es visible y consistente

### 5. Aplicar freeze operativo sobre `public`

- bloquear a nivel operativo las escrituras de producto que el legacy hacia sobre `public`
- la medida concreta puede ser SQL temporal, revokes o mecanismo equivalente rehearseado previamente
- confirmar que ya no entran inserts/updates/deletes de producto en `public`

Abortar si:

- no se puede garantizar el bloqueo real de writes legacy

### 6. Ejecutar backfill final

- ejecutar `supabase/seed/002_backfill_v1_to_v2.sql`
- no introducir cambios manuales en `app.*` durante la ejecucion
- guardar timestamp de inicio y fin

Abortar si:

- la ejecucion falla
- la transaccion no queda claramente en estado conocido

### 7. Ejecutar postchecks y reconciliacion minima

- ejecutar `supabase/seed/003_backfill_postchecks.sql`
- revisar conteos por area
- revisar `backfill.skipped_records`
- hacer muestreo manual minimo de:
  - perfiles
  - places
  - user_place_entries
  - recomendaciones
  - amistades
  - reputacion

Continuar solo si:

- los skips son esperados y aceptados
- no hay divergencias bloqueantes

### 8. Abrir escrituras v2

- cambiar `API_WRITES_ENABLED=true`
- mantener todavia el acceso de cliente controlado
- ejecutar smoke writes reales contra `apps/api`

Smoke writes minimos:

- `create_or_update_profile`
- `save_place_to_wishlist`
- `mark_place_visited`
- `publish_recommendation`
- `respond_to_recommendation`
- `add_friend`
- `remove_friend`

Abortar si:

- cualquiera de esos flujos falla
- aparecen errores de auth, ownership, RLS o transaccion no previstos

### 9. Activar worker asincrono

- cambiar `ASYNC_WORKER_ENABLED=true`
- verificar procesamiento de:
  - `recommendation_published`
  - `recommendation_response_recorded`
  - `reputation_event_recorded`

Continuar solo si:

- no hay atasco inmediato en outbox
- no aparecen fallos terminales masivos

### 10. Pasar el legacy a `deprecation`

- publicar `apps/legacy-web/runtime-config.js` con `mode=deprecation`
- mostrar mensaje claro de producto migrado
- retirar expectativas de escritura y de datos frescos

Decision importante:

- no devolver el legacy a un supuesto "read-only" funcional sobre `public`

### 11. Abrir el nuevo punto de entrada de producto

- habilitar el acceso del cliente que ya consume `apps/api`
- si todavia no existe `apps/mobile` lista para publico, limitar esta apertura a:
  - equipo interno
  - beta controlada
  - cohortes muy pequenas

Decision importante:

- `apps/mobile` se activa en una segunda ola, fuera de la ventana critica

### 12. Monitorizar estabilizacion inmediata

- monitorizar durante al menos 60 minutos:
  - errores 5xx
  - auth fallida
  - latencia anomala
  - backlog de outbox
  - primeros writes reales en `app`
  - soporte/incidencias reportadas

Continuar solo si:

- no aparece incidente severo abierto

## Criterios de abortar o continuar

### Abortar antes de abrir v2

Abortar y volver a legacy si ocurre cualquiera de estos casos antes del primer write real aceptado en v2:

- prechecks fallidos
- freeze legacy no fiable
- freeze de `public` no garantizado
- backfill final fallido
- postchecks con divergencias bloqueantes
- `apps/api` no pasa smoke tests

### Continuar con v2

Continuar solo si:

- el backfill final esta limpio o con skips aceptados
- `apps/api` ya escribe correctamente en `app`
- el worker procesa sin atasco inicial
- el legacy ya no ofrece una superficie enganosa de continuidad

### Incidente despues de abrir v2

Si ya se acepto al menos un write real en v2:

- no volver automaticamente al legacy como sistema de escritura
- congelar nuevas escrituras si hace falta
- mantener legacy en mantenimiento o `deprecation`
- entrar en modo fix-forward o en recuperacion especifica

## Rollback

### Caso A - rollback valido

Aplicable solo si todavia no se acepto ningun write real en v2.

Pasos:

1. dejar `API_WRITES_ENABLED=false`
2. dejar `ASYNC_WORKER_ENABLED=false`
3. mantener legacy en `cutover_freeze`
4. ejecutar `supabase/seed/004_backfill_rollback.sql` si hace falta limpiar `app.*`
5. retirar el freeze operativo sobre `public`
6. devolver `apps/legacy-web/runtime-config.js` a `mode=normal`
7. comunicar cancelacion del corte

### Caso B - rollback no simple

Si ya hubo writes reales en v2:

- no ejecutar rollback ciego sobre `app.*`
- no reabrir `public` como write source salvo prueba firme de cero trafico efectivo en v2
- congelar la entrada, investigar y decidir entre:
  - fix-forward rapido
  - mantenimiento extendido
  - plan de recuperacion especifico con reconciliacion

## Validacion funcional minima

Tras abrir v2 deben comprobarse como minimo:

- login y actor context valido
- lectura de perfil propio
- actualizacion de perfil
- guardar wishlist
- mover a visited
- publicar recomendacion valida
- reaccionar a recomendacion de otro usuario
- alta y baja de amistad

## Rollout de `apps/mobile`

`apps/mobile` no se mete dentro de la ventana critica.

Secuencia recomendada:

1. backend v2 estable tras cutover
2. 24-48h de estabilizacion minima
3. beta interna o cohortes pequenas
4. ampliacion progresiva

## Riesgos delicados a vigilar

- writes tardios del legacy entrando en `public`
- diferencias reales entre backfill rehearsal y backfill final
- auth o RLS fallando solo con trafico real
- outbox creciendo sin ser drenado
- usuarios entrando al legacy y creyendo que siguen en el sistema activo

## Resultado esperado al cerrar el cutover

- `public` congelado como referencia historica
- `app` como unica fuente de verdad activa
- `apps/api` como unico boundary de escritura
- legacy fuera del camino de escritura
- `apps/mobile` lista para rollout posterior, no para el mismo freeze
