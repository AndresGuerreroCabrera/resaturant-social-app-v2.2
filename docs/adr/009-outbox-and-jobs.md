# ADR 009 - Outbox and Jobs

## Estado

Accepted

## Relacion con otros ADRs

Este ADR concreta la base asincrona operativa a partir de:

- `005-sql-schema-v2.md`
- `006-security-and-rls.md`
- `007-backend-commands.md`
- `008-recommendations-and-reputation.md`

No cambia el boundary oficial `cliente -> apps/api -> base de datos`.
Lo refuerza.

## Objetivo

Introducir una base asincrona simple y durable para que side effects futuros no rompan los comandos principales.

La base debe resolver:

- persistencia duradera del outbox
- reintentos controlados
- programacion diferida con `next_run_at`
- recuperacion razonable ante caidas del worker
- una estrategia de polling sencilla desde `apps/api`

## Modelo elegido

Se adopta un modelo de **outbox durable con polling**.

Decision cerrada:

- no se introduce infraestructura externa de colas
- no se crean microservicios ni un scheduler complejo
- el backend v2 persiste eventos internos en `app.outbox_events`
- un worker de `apps/api` reclama eventos listos, los procesa y actualiza su estado

## Objeto SQL elegido

La base durable vive en:

- `app.outbox_events`

Es una tabla operativa, no una entidad canonica del dominio.

## Tipos iniciales de evento

La primera ola solo cubre los side effects ya emitidos por el slice social:

- `recommendation_published`
- `recommendation_response_recorded`
- `reputation_event_recorded`

Decision cerrada:

- los tipos de evento se versionan por migracion SQL y por codigo interno
- anadir un nuevo tipo exigira actualizar SQL, worker y documentacion

## Shape operativo del outbox

Cada fila de `app.outbox_events` contiene al menos:

- `event_type`
- `aggregate_type`
- `aggregate_id`
- `payload`
- `status`
- `retry_count`
- `max_retries`
- `next_run_at`
- `locked_at`
- `locked_by`
- `lease_expires_at`
- `processed_at`
- `error_message`
- `created_at`
- `updated_at`

Decision cerrada:

- `payload` se guarda como `jsonb`
- el outbox mantiene suficiente metadata para operar, reintentar y auditar
- `lease_expires_at` existe para recuperar eventos atascados si un worker cae

## Estados

Estados oficiales del outbox:

- `pending`
- `processing`
- `processed`
- `failed`

### Ciclo de vida

1. `pending`
   - evento persistido y a la espera de ser reclamado
2. `processing`
   - worker lo reclamo y obtuvo una lease temporal
3. `processed`
   - side effect ejecutado correctamente
4. `failed`
   - se agotaron reintentos o el sistema decidio fallo terminal

Tambien se permite:

- `pending -> processing -> pending`

Ese camino representa un fallo transitorio y una reprogramacion mediante `next_run_at`.

## Estrategia de retries

Decision cerrada:

- el sistema usa retries simples con backoff exponencial
- `retry_count` cuenta reintentos ya consumidos tras errores
- `max_retries` define el maximo de reintentos tras el primer intento fallido

Parametros base decididos para la primera version:

- `batch_size = 25`
- `poll_interval_ms = 5000`
- `lease_duration_ms = 60000`
- `retry_base_delay_ms = 30000`
- `retry_max_delay_ms = 1800000`
- `default_max_retries = 12`

Tradeoff:

- es deliberadamente conservador y suficiente para el tamano actual del proyecto
- si el sistema crece, estos valores podran configurarse sin rehacer el modelo

## Estrategia de worker / polling

La primera estrategia operativa es:

- worker dentro de `apps/api`
- polling periodico
- claim por lotes pequenos
- lease temporal por fila
- reintentos por backoff

El worker base debe:

1. reclamar eventos listos o leases vencidas
2. procesar un lote acotado
3. marcar `processed` si todo va bien
4. reprogramar en `pending` con nuevo `next_run_at` si el error es reintentable
5. marcar `failed` cuando se agotan reintentos

Decision cerrada:

- el worker base existe ya como infraestructura interna de `apps/api`
- el runtime que lo ejecute periodicamente queda para la siguiente fase

## Seguridad y acceso

`app.outbox_events` queda cerrada a cliente.

Decision cerrada:

- `authenticated` no puede leer ni escribir la tabla
- no se crean vistas publicas del outbox
- el acceso queda reservado a `service_role` y backend
- la tabla tiene RLS activada sin politicas para cliente autenticado

Motivo:

- el outbox contiene payloads internos y errores operativos
- no es una superficie de producto ni una API SQL publica

## Integracion con el estado actual del backend

Queda alineado con lo ya implementado:

- `publish_recommendation` persiste `recommendation_published`
- `respond_to_recommendation` persiste `recommendation_response_recorded`
- una aceptacion valida persiste `reputation_event_recorded`

Decision cerrada:

- el comando principal sigue siendo sincronico solo para invariantes criticas
- los side effects futuros se desacoplan via outbox durable

## Que side effects entran ya

Entran ya como candidatos del sistema asincrono:

- notificaciones futuras sobre recomendaciones publicadas o respondidas
- telemetria de negocio
- fan-out interno
- recalculos derivados no criticos que no deban bloquear el comando

## Que queda fuera deliberadamente

Todavia no entra:

- push notifications reales
- media processing real
- workers distribuidos o infraestructura externa
- cron orquestado complejo
- retries con dead-letter separados
- runtime HTTP completo

## Tradeoffs

### Outbox sobre Postgres en el mismo sistema

Ventaja:

- una sola infraestructura
- misma transaccion que el comando de dominio
- menos piezas operativas

Coste:

- el throughput no compite con una cola externa dedicada

### Lease temporal en vez de locks permanentes

Ventaja:

- recupera eventos atascados si un worker cae

Coste:

- exige que el adapter de claim sea cuidadoso y atomico

### Polling sencillo

Ventaja:

- facil de operar y entender

Coste:

- no tiene la latencia minima ni el fan-out de una cola especializada

## Contradicciones detectadas

### Estado anterior de la documentacion

Antes de este ADR seguian abiertas dos afirmaciones que ya no son ciertas:

1. que la tabla fisica exacta del outbox seguia diferida
2. que la persistencia duradera del outbox seguia sin implementarse

Ambas quedan resueltas en esta fase mediante:

- migracion SQL de `app.outbox_events`
- base de worker/polling en `apps/api/src/async`

## Consecuencia practica para la siguiente fase

La siguiente fase debe cerrar:

- adaptador SQL real de `AsyncJobsStore`
- runtime que ejecute el polling worker
- handlers reales por tipo de evento
- politica de observabilidad y alertado del worker
- side effects concretos como push o media solo cuando entren en alcance
