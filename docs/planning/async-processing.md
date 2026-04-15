# Async Processing

## Objetivo de esta fase

Introducir una base asincrona simple y durable para que los comandos del backend no carguen con side effects no criticos.

## Que se implemento

### En base de datos

Se creo la migracion:

- `supabase/migrations/20260415143000_create_app_outbox_events.sql`

Incluye:

- enums de evento, aggregate y estado
- tabla `app.outbox_events`
- campos operativos de retries, scheduling, locking y errores
- indices para polling y trazabilidad
- cierre de acceso a cliente autenticado
- RLS activada sin politicas de cliente

### En `apps/api`

Se creo `apps/api/src/async/` con:

- `types.ts`
- `ports.ts`
- `worker.ts`
- `index.ts`

Esta capa deja preparado:

- `OutboxWriter` para comandos
- `AsyncJobsStore` para claim, complete, retry y fail
- `processAsyncBatch` para ejecutar un lote
- `createAsyncPollingWorker` como base de polling
- configuracion por defecto de lote, lease y backoff

## Side effects que ya usan el sistema

El sistema ya recibe estos eventos desde comandos del core social:

- `recommendation_published`
- `recommendation_response_recorded`
- `reputation_event_recorded`

## Como operarlo

La estrategia prevista es:

1. los comandos escriben eventos en `app.outbox_events` dentro de su misma transaccion
2. un worker de `apps/api` reclama eventos listos o leases vencidas por lotes
3. cada handler procesa su tipo de evento
4. si todo va bien, el evento pasa a `processed`
5. si falla, se reprograma con `next_run_at`
6. si agota reintentos, pasa a `failed`

Parametros base fijados:

- `batch_size = 25`
- `poll_interval_ms = 5000`
- `lease_duration_ms = 60000`
- `retry_base_delay_ms = 30000`
- `retry_max_delay_ms = 1800000`
- `default_max_retries = 12`

## Que falta implementar

Todavia falta:

- adapter real de `AsyncJobsStore` contra Postgres/Supabase
- claim SQL atomico con lease y recuperacion de eventos atascados
- runtime que ejecute el polling worker
- handlers reales de cada evento
- observabilidad minima del worker
- limpieza o archivado de eventos `processed` / `failed` si hiciera falta

## Lo que sigue fuera de alcance

- push notifications reales
- media processing real
- infraestructura externa de colas
- UI o endpoints publicos del outbox
- orquestacion compleja de jobs

## Riesgos residuales

- la base durable existe, pero aun no hay consumo real
- el comportamiento exacto ante eventos atascados depende del adapter SQL que se implemente despues
- no se ejecuto validacion runtime contra una base real en esta fase
