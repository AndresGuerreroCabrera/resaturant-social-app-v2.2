# ADR 008 - Recommendations and Reputation

## Estado

Accepted

## Relacion con otros ADRs

Este ADR refuerza y concreta el slice social definido en:

- `004-domain-model-v2.md`
- `005-sql-schema-v2.md`
- `006-security-and-rls.md`
- `007-backend-commands.md`

No cambia decisiones ya cerradas sobre:

- `apps/api` como boundary oficial
- `UserPlaceEntry` unificado
- recomendaciones semanales
- amistad simetrica
- feed derivado
- reputacion basada en eventos

## Objetivo

Cerrar de forma operativa el flujo mas delicado del core social:

- publicar recomendacion
- reaccionar a recomendacion
- generar reputacion correcta
- actualizar agregados sincronamente cuando aplique
- emitir eventos internos desacoplados para notificaciones o jobs futuros

## Decision principal

El slice social queda dividido en dos capas claras:

### Flujo sincronico obligatorio

Se ejecuta dentro del comando backend y de una transaccion unica:

- validacion de ownership
- validacion de estado y visibilidad
- bloqueo de cuota o decision para evitar carreras
- insercion del `recommendation_post` o `recommendation_reaction`
- generacion de `reputation_event` cuando corresponda
- actualizacion de `reputation_summary` cuando corresponda
- escritura del outbox interno en la misma transaccion

### Side effects asincronos

Se disparan despues a partir del outbox:

- notificaciones futuras
- fan-out a jobs
- analytics o telemetria de negocio
- refrescos derivados no criticos que no deban bloquear el comando

Decision cerrada:

- el comando principal no envia push ni ejecuta jobs
- el comando solo persiste eventos internos de outbox
- la entrega real del outbox queda diferida a la fase de runtime/jobs

## Invariantes sincronas protegidas

### `publish_recommendation`

1. La `userPlaceEntry` origen debe existir.
2. Debe pertenecer al actor.
3. Debe tener `status = visited`.
4. Debe tener `visibility = public`.
5. No puede estar oculta (`is_hidden = false`).
6. El `place` asociado debe existir.
7. No puede existir otra recomendacion previa del mismo `author + place`.
8. El actor solo puede publicar hasta 3 recomendaciones por ciclo.
9. El ciclo se calcula por semana ISO en `Europe/Madrid`.
10. El post publicado conserva snapshot y FK a la entry origen.

### `respond_to_recommendation`

1. La recomendacion debe existir y seguir activa.
2. El actor no puede reaccionar a su propia recomendacion.
3. Solo se permite una reaccion persistida por `viewer + recommendation`.
4. `accepted` crea wishlist privada solo si el viewer no tiene ya entry para ese lugar.
5. `accepted` nunca degrada una visita existente a wishlist.
6. `rejected` no crea `userPlaceEntry`.
7. Solo `accepted` genera reputacion.
8. La reputacion se registra como `ReputationEvent`, no como contador ad hoc.
9. El agregado `reputation_summary` se actualiza de forma sincronica en la misma transaccion.

## Reglas temporales semanales

La cuota semanal queda fijada asi:

- maximo 3 publicaciones por usuario
- semana ISO
- timezone `Europe/Madrid`
- la cuota cuenta posts creados, no posts activos restantes
- retirar un post no devuelve cuota

Implementacion cerrada:

- el comando obtiene el ciclo desde `BackendCommandClock`
- el store de recomendaciones debe adquirir un lock por `author + cycle`
- el conteo de posts del ciclo se hace bajo ese lock

## Anti-duplicados

### Sincronicos en comando

- `publish_recommendation` consulta si el autor ya publico ese `place`
- `respond_to_recommendation` adquiere un lock por `viewer + recommendation` antes de leer y escribir

### Estructurales en SQL

- unique por `recommendation_posts(author_user_id, place_id)`
- unique por `recommendation_reactions(viewer_user_id, recommendation_post_id)`
- unique por `reputation_events(recommendation_reaction_id)`

Decision cerrada:

- el comando intenta devolver errores de negocio limpios
- SQL sigue siendo la ultima red de seguridad ante concurrencia o adaptadores defectuosos

## Reputacion y agregados

La reputacion queda resuelta asi:

- fuente de verdad: `app.reputation_events`
- agregado de lectura: `app.reputation_summaries`
- trigger de negocio: solo `accepted`
- `rejected` no toca reputacion
- auto-reaccion ya queda bloqueada antes de poder generar evento

La operacion aceptada debe producir en la misma transaccion:

1. `recommendation_reaction`
2. opcional `user_place_entry` del viewer
3. `reputation_event`
4. `reputation_summary` recalculado o actualizado
5. eventos internos de outbox

Decision cerrada:

- el agregado de reputacion no es la fuente de verdad
- el store de reputacion del backend debe devolver explicitamente `event + summary`
- esto evita reintroducir un contador opaco como contrato principal

## Outbox interno

Se fijan estos eventos internos minimos:

- `recommendation_published`
- `recommendation_response_recorded`
- `reputation_event_recorded`

Uso previsto:

- notificaciones futuras
- jobs asincronos
- integraciones internas

Decision cerrada:

- el outbox es infraestructura operativa, no entidad canonica del producto
- el comando lo escribe dentro de la misma transaccion del cambio de dominio
- su persistencia durable ya existe en `app.outbox_events`
- su consumo y entrega real quedan fuera de este ADR

## Reparto de responsabilidades

### En `apps/api`

- ownership del actor
- validaciones de negocio compuestas
- secuencia transaccional del flujo social
- decision de idempotencia
- emision del outbox interno

### En SQL / base de datos

- FK y uniques
- checks de shape
- RLS
- soporte de locking que implementen los adapters
- ultima defensa contra duplicados y eventos repetidos

### Asincrono posterior

- notificaciones
- jobs de fan-out
- analytics
- consumidores del outbox

## Errores de negocio que deben seguir expuestos

- `USER_PLACE_ENTRY_NOT_FOUND`
- `PLACE_NOT_FOUND`
- `RECOMMENDATION_NOT_FOUND`
- `RECOMMENDATION_NOT_PUBLISHABLE`
- `RECOMMENDATION_PLACE_ALREADY_PUBLISHED`
- `RECOMMENDATION_QUOTA_EXCEEDED`
- `RECOMMENDATION_SELF_RESPONSE_FORBIDDEN`
- `RECOMMENDATION_ALREADY_RESPONDED`

Decision cerrada:

- no se introducen errores publicos nuevos solo para outbox
- un fallo al persistir outbox debe tumbar la transaccion, no degradarse en silencio

## Tradeoffs

### Outbox dentro de la misma transaccion

Ventaja:

- garantiza que el evento interno no se pierde si el cambio de dominio si ocurrio

Coste:

- exige soporte de adaptador SQL real y runtime del worker en la siguiente fase

### Lock explicito en reaccion

Ventaja:

- reduce carreras y mejora la calidad del error devuelto

Coste:

- obliga a que el adapter SQL implemente un lock estable por `viewer + recommendation`

### Reputacion como evento + agregado

Ventaja:

- trazabilidad
- recomputacion posible
- menos riesgo de contadores corruptos

Coste:

- la aceptacion es mas pesada que un simple insert

## Decisiones diferidas

- politica de reintentos y deduplicacion de entrega
- formula final de `score` y thresholds de `expertise_level_label`
- runtime HTTP real y adaptadores concretos

## Contradicciones detectadas

### Estado actual del repo vs arquitectura final

1. El slice social del backend ya emite eventos internos y la base durable del outbox ya existe, pero todavia no hay adaptador SQL real ni runtime que los procese.
2. El legacy sigue publicando y reaccionando fuera de este flujo porque sigue acoplado a Supabase desde cliente.

Estas contradicciones son temporales y conocidas.
No se corrigen en esta fase para no romper el sistema legacy ni mezclarla con runtime real.

## Consecuencia practica para la siguiente fase

La siguiente fase debe cerrar:

- adaptadores concretos de `RecommendationsStore`, `ReputationStore`, `OutboxWriter` y `AsyncJobsStore`
- lock SQL real para cuota y respuesta
- consumo del outbox por jobs o notificaciones
- transporte HTTP y auth real sobre estos comandos
