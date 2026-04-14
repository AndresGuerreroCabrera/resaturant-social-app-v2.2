# ADR 005 - SQL Schema v2

## Estado

Accepted

## Relacion con otros ADRs

Este ADR aterriza en base de datos las decisiones ya cerradas en:

- `001-migration-strategy.md`
- `003-migration-architecture.md`
- `004-domain-model-v2.md`

Tambien toma como referencia operativa:

- `packages/domain`
- `packages/contracts`

No introduce migraciones ejecutables todavia.
No cambia el boundary `cliente -> apps/api -> base de datos`.
No reabre el debate sobre `UserPlaceEntry`, amistad simetrica, limite semanal ni feed derivado.

## Objetivo

Definir el schema SQL v2 completo del core inicial antes de escribir migraciones reales, dejando cerrados:

- tablas canonicas y derivadas
- columnas
- claves primarias y foraneas
- unique constraints
- check constraints
- enums utiles
- indices esenciales
- uso de soft delete cuando aplique
- operaciones que exigiran transaccion
- criterios para backfill desde legacy

## Fuera de alcance

Este ADR no define todavia:

- migraciones SQL ejecutables
- RLS final y politicas de permisos
- triggers o funciones SQL completas
- runtime de `apps/api`
- tablas diferidas de media, notifications o activity stream generico

## Principios SQL del schema v2

1. Todo el sistema nuevo vive en schema `app`.
2. Todas las tablas canonicas usan `uuid` como PK, salvo relaciones naturales donde compensa una clave compuesta.
3. Los actores de negocio referencian `auth.users(id)`.
4. Las timestamps se guardan como `timestamptz` en UTC.
5. Los valores cerrados y pequenos se modelan con enums de Postgres.
6. Los tags del core inicial se mantienen como `text[]`, no como tablas normalizadas.
7. `hidden` se representa fisicamente como bandera separada, no como tercer estado.
8. El schema no arrastra ids legacy como parte del contrato canonico.
9. Los mapeos de backfill deben vivir en scripts o tablas auxiliares de migracion, no en tablas core de `app`.

## Diagrama logico textual

```text
auth.users
  1 -> 1 app.public_profiles
  1 -> 1 app.private_profiles
  1 -> n app.user_place_entries
  1 -> n app.recommendation_posts
  1 -> n app.recommendation_reactions
  1 -> n app.reputation_events (actor)
  1 -> n app.reputation_events (subject)
  1 -> n app.friendships.user_id_a
  1 -> n app.friendships.user_id_b

app.places
  1 -> n app.place_provider_references
  1 -> n app.user_place_entries
  1 -> n app.recommendation_posts

app.user_place_entries
  1 -> n app.recommendation_posts

app.recommendation_posts
  1 -> n app.recommendation_reactions
  1 -> n app.reputation_events

app.recommendation_reactions
  1 -> 0..1 app.reputation_events

app.reputation_summaries
  1 -> 1 auth.users

app.public_profile_stats_v
  <- derivado de public_profiles + user_place_entries + recommendation_posts + reputation_summaries
```

## Enums SQL recomendados

### `app.place_provider`

- `google_places`

### `app.entry_visibility`

- `public`
- `private`

### `app.user_place_status`

- `wishlist`
- `visited`

### `app.recommendation_reaction_kind`

- `accepted`
- `rejected`

### `app.reputation_event_type`

- `recommendation_accepted`

## Tablas canonicas

### 1. `app.public_profiles`

Row owner:

- `user_id`

Columnas:

| columna | tipo | notas |
| --- | --- | --- |
| `user_id` | `uuid` | PK y FK a `auth.users(id)` |
| `handle` | `text` | identificador publico, lowercase |
| `display_name` | `text` | nombre visible |
| `avatar_key` | `text` | nullable, sigue siendo preset o clave de asset |
| `bio` | `text` | nullable |
| `created_at` | `timestamptz` | no nulo |
| `updated_at` | `timestamptz` | no nulo |

Constraints criticos:

- PK en `user_id`
- unique en `handle`
- `handle` en lowercase y con patron compatible con `packages/contracts/src/profiles.ts`
- `char_length(display_name)` entre 1 y 80
- `bio` nullable con maximo 280 caracteres

Indices esenciales:

- unique btree sobre `handle`

### 2. `app.private_profiles`

Row owner:

- `user_id`

Columnas:

| columna | tipo | notas |
| --- | --- | --- |
| `user_id` | `uuid` | PK y FK a `auth.users(id)` |
| `onboarding_completed_at` | `timestamptz` | nullable |
| `created_at` | `timestamptz` | no nulo |
| `updated_at` | `timestamptz` | no nulo |

Constraints criticos:

- PK en `user_id`

Decision:

- `auth_email` no aparece aqui ni en ninguna tabla publica del schema `app`
- datos privados futuros de notifications o preferencias no se meten todavia en esta tabla

### 3. `app.places`

Entidad canonica del lugar.

Columnas:

| columna | tipo | notas |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `name` | `text` | nombre canonico visible |
| `formatted_address` | `text` | nullable |
| `locality` | `text` | nullable |
| `region` | `text` | nullable |
| `country_code` | `char(2)` | nullable, ISO 3166-1 alpha-2 |
| `latitude` | `double precision` | nullable |
| `longitude` | `double precision` | nullable |
| `dedupe_key` | `text` | nullable, solo cuando hay alta confianza de dedupe |
| `created_at` | `timestamptz` | no nulo |
| `updated_at` | `timestamptz` | no nulo |

Constraints criticos:

- PK en `id`
- `char_length(name)` entre 1 y 120
- `country_code` en uppercase cuando exista
- latitud y longitud nulas a la vez o presentes a la vez
- latitud entre -90 y 90
- longitud entre -180 y 180
- unique parcial sobre `dedupe_key` cuando no sea null

Indices esenciales:

- unique parcial sobre `dedupe_key`
- indice btree sobre `name`

Decision importante:

- no se impone una unique dura por `name + address` porque generaria falsos positivos en backfill y en carga manual
- la evitacion fuerte de duplicados vive primero en referencias externas de proveedor y despues en `dedupe_key`

### 4. `app.place_provider_references`

Relacion canonica entre un `place` interno y un identificador de proveedor externo.

Columnas:

| columna | tipo | notas |
| --- | --- | --- |
| `provider` | `app.place_provider` | parte de la clave natural |
| `provider_place_id` | `text` | parte de la clave natural |
| `place_id` | `uuid` | FK a `app.places(id)` |
| `is_primary` | `boolean` | marca la referencia principal del lugar |
| `created_at` | `timestamptz` | no nulo |

Constraints criticos:

- PK compuesta en `(provider, provider_place_id)`
- FK a `app.places(id)`
- unique parcial sobre `place_id` cuando `is_primary = true`

Indices esenciales:

- indice btree sobre `place_id`

Decision importante:

- esta tabla es la proteccion SQL principal contra duplicados cuando existe `place_id` de proveedor

### 5. `app.user_place_entries`

Relacion canonica usuario-lugar.

Row owner:

- `user_id`

Columnas:

| columna | tipo | notas |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK a `auth.users(id)` |
| `place_id` | `uuid` | FK a `app.places(id)` |
| `status` | `app.user_place_status` | `wishlist` o `visited` |
| `visibility` | `app.entry_visibility` | `wishlist` siempre privada |
| `is_hidden` | `boolean` | representa `hidden` sin romper el modelo |
| `note` | `text` | nullable |
| `tags` | `text[]` | no nulo, default array vacio |
| `visited_at` | `timestamptz` | nullable |
| `rating` | `smallint` | nullable, solo visitadas |
| `price_tier` | `text` | nullable, solo visitadas |
| `created_at` | `timestamptz` | no nulo |
| `updated_at` | `timestamptz` | no nulo |

Constraints criticos:

- PK en `id`
- FK a `auth.users(id)`
- FK a `app.places(id)`
- unique en `(user_id, place_id)`
- unique en `(id, user_id, place_id)` para soportar FK compuesta desde recomendaciones
- `array_length(tags, 1)` <= 12 cuando exista
- `rating` entre 1 y 5 cuando exista
- `note` nullable con maximo 2000 caracteres
- `price_tier` nullable con maximo 8 caracteres
- check de estado:
  - si `status = 'wishlist'`, entonces `visibility = 'private'`, `visited_at is null`, `rating is null` y `price_tier is null`
  - si `status = 'visited'`, entonces `visibility in ('public', 'private')`

Indices esenciales:

- unique `(user_id, place_id)`
- indice `(user_id, status, is_hidden, created_at desc)`
- indice parcial `(place_id, created_at desc)` para filas `status = 'visited' and visibility = 'public' and is_hidden = false`

Decision sobre `hidden`:

- se implementa fisicamente con `is_hidden boolean not null default false`
- no hay tabla aparte de ocultacion
- no se convierte `hidden` en nuevo valor del enum `status`

Decision sobre delete:

- no hay soft delete en `user_place_entries` en el core inicial
- quitar una wishlist o visita implica hard delete
- esto mantiene simple la unique `(user_id, place_id)` y evita ambiguedad en backfill

### 6. `app.friendships`

Relacion social simetrica con una sola fila canonica por pareja.

Row ownership:

- compartida por el par

Columnas:

| columna | tipo | notas |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `user_id_a` | `uuid` | FK a `auth.users(id)` |
| `user_id_b` | `uuid` | FK a `auth.users(id)` |
| `created_at` | `timestamptz` | no nulo |

Constraints criticos:

- PK en `id`
- unique en `(user_id_a, user_id_b)`
- `user_id_a <> user_id_b`
- `user_id_a < user_id_b` para canonizar el par

Indices esenciales:

- indice sobre `user_id_a`
- indice sobre `user_id_b`

Decision sobre delete:

- no hay soft delete inicial
- un `unfriend` sera hard delete de la fila canonica

### 7. `app.recommendation_posts`

Publicacion social derivada de una visita publica.

Row owner:

- `author_user_id`

Columnas:

| columna | tipo | notas |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `author_user_id` | `uuid` | FK a `auth.users(id)` |
| `place_id` | `uuid` | FK a `app.places(id)` |
| `source_entry_id` | `uuid` | id de `user_place_entries` origen |
| `cycle_iso_year` | `smallint` | ano ISO del ciclo |
| `cycle_iso_week` | `smallint` | semana ISO del ciclo |
| `cycle_timezone` | `text` | fijo a `Europe/Madrid` |
| `snapshot_place_name` | `text` | nombre publicado |
| `snapshot_formatted_address` | `text` | nullable |
| `snapshot_locality` | `text` | nullable |
| `snapshot_region` | `text` | nullable |
| `snapshot_country_code` | `char(2)` | nullable |
| `snapshot_latitude` | `double precision` | nullable |
| `snapshot_longitude` | `double precision` | nullable |
| `snapshot_rating` | `smallint` | nullable |
| `snapshot_note` | `text` | nullable |
| `snapshot_price_tier` | `text` | nullable |
| `snapshot_tags` | `text[]` | no nulo, default array vacio |
| `created_at` | `timestamptz` | no nulo |
| `removed_at` | `timestamptz` | nullable, soft delete |

Constraints criticos:

- PK en `id`
- FK a `auth.users(id)`
- FK a `app.places(id)`
- FK compuesta `(source_entry_id, author_user_id, place_id)` -> `app.user_place_entries(id, user_id, place_id)`
- unique dura en `(author_user_id, place_id)`
- `cycle_iso_week` entre 1 y 53
- `cycle_iso_year` razonable para negocio
- `cycle_timezone = 'Europe/Madrid'`
- `snapshot_rating` entre 1 y 5 cuando exista
- `snapshot_note` nullable con maximo 2000 caracteres
- `snapshot_price_tier` nullable con maximo 8 caracteres
- `array_length(snapshot_tags, 1)` <= 12 cuando exista
- coordenadas snapshot nulas a la vez o presentes a la vez

Indices esenciales:

- indice `(author_user_id, cycle_iso_year desc, cycle_iso_week desc, created_at desc)`
- indice parcial `(created_at desc, id)` donde `removed_at is null`
- indice `(place_id, created_at desc)`

Decision importante sobre duplicados:

- la regla "un autor no puede duplicar el mismo place" se protege con unique dura en `(author_user_id, place_id)`
- aunque exista `removed_at`, un post retirado no libera la posibilidad de republicar el mismo lugar en el core inicial

Decision importante sobre cuota semanal:

- no se crea tabla separada de cuotas
- el limite se modela con `cycle_iso_year`, `cycle_iso_week` y `cycle_timezone` sobre la propia fila
- el enforcement final de "maximo 3" necesitara transaccion y bloqueo, no solo constraints

### 8. `app.recommendation_reactions`

Decision persistida de un viewer sobre una recomendacion.

Row owner:

- `viewer_user_id`

Columnas:

| columna | tipo | notas |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `recommendation_post_id` | `uuid` | FK a `app.recommendation_posts(id)` |
| `viewer_user_id` | `uuid` | FK a `auth.users(id)` |
| `reaction` | `app.recommendation_reaction_kind` | `accepted` o `rejected` |
| `created_at` | `timestamptz` | no nulo |

Constraints criticos:

- PK en `id`
- FK a `app.recommendation_posts(id)`
- FK a `auth.users(id)`
- unique en `(viewer_user_id, recommendation_post_id)`

Indices esenciales:

- unique `(viewer_user_id, recommendation_post_id)`
- indice `(recommendation_post_id, created_at desc)`

Decision importante:

- no hay soft delete ni mutacion de reacciones en el core inicial
- la inmutabilidad se apoya en comandos backend y en no ofrecer update/delete de negocio

### 9. `app.reputation_events`

Fuente de verdad de reputacion.

Columnas:

| columna | tipo | notas |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `subject_user_id` | `uuid` | usuario impactado |
| `actor_user_id` | `uuid` | usuario que acepto |
| `recommendation_post_id` | `uuid` | FK a `app.recommendation_posts(id)` |
| `recommendation_reaction_id` | `uuid` | FK a `app.recommendation_reactions(id)` |
| `event_type` | `app.reputation_event_type` | hoy solo `recommendation_accepted` |
| `created_at` | `timestamptz` | no nulo |

Constraints criticos:

- PK en `id`
- FK a `auth.users(id)` para `subject_user_id`
- FK a `auth.users(id)` para `actor_user_id`
- FK a `app.recommendation_posts(id)`
- FK a `app.recommendation_reactions(id)`
- unique en `recommendation_reaction_id`
- `subject_user_id <> actor_user_id`

Indices esenciales:

- indice `(subject_user_id, created_at desc)`
- indice `(recommendation_post_id, created_at desc)`

Decision importante:

- la unicidad por `recommendation_reaction_id` protege que una aceptacion valida produzca como maximo un evento
- la verificacion de que `subject_user_id` coincide con el autor del post y que `actor_user_id` coincide con el viewer de la reaccion exige transaccion o funcion SQL

## Tablas y vistas derivadas

### 10. `app.reputation_summaries`

Agregado persistido para lectura rapida.

Columnas:

| columna | tipo | notas |
| --- | --- | --- |
| `user_id` | `uuid` | PK y FK a `auth.users(id)` |
| `score` | `integer` | no nulo, base inicial 1000 |
| `accepted_recommendation_count` | `integer` | no nulo, default 0 |
| `expertise_level_label` | `text` | nullable |
| `updated_at` | `timestamptz` | no nulo |

Constraints criticos:

- PK en `user_id`
- `accepted_recommendation_count >= 0`

Decision:

- `score` arranca en base 1000 por continuidad conservadora con el producto actual
- la formula exacta de reputacion sigue siendo detalle de backend/funcion y puede refinarse sin cambiar esta tabla

### 11. `app.public_profile_stats_v`

Read model derivado.

Columnas proyectadas:

- `user_id`
- `public_visited_count`
- `published_recommendation_count`
- `accepted_recommendation_count`
- `reputation_score`
- `expertise_level_label`

Fuente:

- `app.public_profiles`
- `app.user_place_entries`
- `app.recommendation_posts`
- `app.reputation_summaries`

Decision:

- se recomienda empezar como `view`, no como tabla materializada
- si el uso real lo exige, mas adelante puede pasar a materialized view o tabla derivada mantenida por comandos

### Feed derivado

No se propone tabla fisica de feed en el core inicial.

Decision:

- el feed de recomendaciones se resolvera con query o vista ligera sobre `recommendation_posts`, `public_profiles`, `places`, `reputation_summaries` y el estado de reaccion del viewer
- no se introduce `activity_event` ni un feed materializado general en esta fase

## Constraints que protegen invariantes clave

### Protegidos directamente por SQL

1. Un solo `public_profile` y un solo `private_profile` por usuario.
2. Un solo `UserPlaceEntry` activo por `user + place`.
3. Wishlist siempre privada y sin campos de visita.
4. Canonizacion de amistad en una sola fila ordenada.
5. Un solo `place_provider_reference` por `provider + provider_place_id`.
6. Un solo `RecommendationPost` por `author + place`.
7. Una sola `RecommendationReaction` por `viewer + recommendation`.
8. Como maximo un `ReputationEvent` por reaccion aceptada.
9. `hidden` separado del `status`.

### No protegibles solo con constraints simples

1. Publicar recomendacion solo desde una visita publica y no oculta.
2. Limite de 3 recomendaciones por usuario y semana.
3. Prohibir auto-reaccion a una recomendacion.
4. Hacer que una aceptacion cree o reutilice wishlist privada sin duplicar visita existente.
5. Garantizar que el `subject_user_id` del evento coincide con el autor real del post.

Estas reglas deben cerrarse con comandos backend transaccionales y, donde aporte, con funciones SQL o triggers en la fase siguiente.

## Operaciones que necesitaran transaccion

### 1. Resolver place + crear o actualizar `user_place_entries`

Necesita transaccion para:

- resolver si ya existe `place` por referencia de proveedor
- crear `place` y `place_provider_reference` si no existe
- crear o actualizar la fila unica `user_place_entries`

### 2. Promover wishlist a visited

Necesita transaccion para:

- bloquear la fila del usuario-lugar
- validar transicion `wishlist -> visited`
- actualizar visibilidad y metadatos de visita

### 3. Publicar recomendacion

Necesita transaccion para:

- bloquear el contexto del autor/ciclo
- validar que la entrada origen existe, pertenece al autor, esta visitada, publica y no oculta
- contar posts ya creados en ese ciclo
- insertar `recommendation_posts`
- opcionalmente recalcular read models derivados

Recomendacion de enforcement:

- usar transaccion serializable o bloqueo asesorado por `(author_user_id, cycle_iso_year, cycle_iso_week)`

### 4. Reaccionar a recomendacion

Necesita transaccion para:

- validar que no existe reaccion previa
- impedir auto-reaccion
- insertar `recommendation_reactions`
- si es `accepted`, crear o reutilizar wishlist privada
- si es `accepted`, crear `reputation_event`
- actualizar `reputation_summaries`

### 5. Crear amistad

Necesita transaccion para:

- normalizar el par ordenado
- insertar la unica fila canonica

## Estrategia de backfill preparada por el schema

### Legacy -> v2

- `public.profiles` -> `app.public_profiles` + `app.private_profiles`
- `public.restaurants` -> `app.user_place_entries` con `status = 'visited'`
- `public.desired_restaurants` -> `app.user_place_entries` con `status = 'wishlist'`
- `public.recommendations` -> `app.recommendation_posts`
- `public.recommendation_actions` -> `app.recommendation_reactions`
- `public.friendships` espejo -> `app.friendships` canonica

### Decision de backfill importante

- no se copiaran `expertise_rating` ni `accepted_recommendation_count` como verdad canonica
- `app.reputation_events` y `app.reputation_summaries` se recomputaran desde aceptaciones validas

### Preparacion para dedupe de places

- si el legacy trae `place_id`, se usa `app.place_provider_references`
- si no trae `place_id`, se crea `place` canonico sin referencia externa
- `dedupe_key` solo se rellenara cuando la migracion tenga alta confianza

### Preparacion para mapear recomendaciones legacy

- `original_restaurant_id` del legacy sirve para unir recomendacion con la visita backfilleada
- si ese id no existe o esta roto, el fallback se hara por `owner_user_id + place + created_at` en la logica de migracion

## Canonicidad y ownership

### Canonico

- `app.public_profiles`
- `app.private_profiles`
- `app.places`
- `app.place_provider_references`
- `app.user_place_entries`
- `app.friendships`
- `app.recommendation_posts`
- `app.recommendation_reactions`
- `app.reputation_events`

### Derivado o materializado

- `app.reputation_summaries`
- `app.public_profile_stats_v`
- feed derivado por query o vista ligera

### Ownership de filas

- perfiles: `user_id`
- user-place: `user_id`
- recommendation post: `author_user_id`
- reaction: `viewer_user_id`
- reputation event: `subject_user_id` impactado y `actor_user_id` causante
- friendships: ownership compartido del par canonico

## Soft delete

### Se aplica

- `app.recommendation_posts` con `removed_at`

Motivo:

- preservar historia social
- no liberar cuota del ciclo
- permitir retirada o moderacion sin borrar trazabilidad

### No se aplica en el core inicial

- `app.public_profiles`
- `app.private_profiles`
- `app.places`
- `app.place_provider_references`
- `app.user_place_entries`
- `app.friendships`
- `app.recommendation_reactions`
- `app.reputation_events`
- `app.reputation_summaries`

Motivo:

- mantener simples las uniques y el backfill
- evitar complejidad innecesaria para el tamano actual del proyecto

## Tradeoffs principales

### `tags` como `text[]`

Ventaja:

- mantiene bajo el coste del core inicial

Coste:

- menos potencia de busqueda que una tabla normalizada

### `place_provider_references` separada

Ventaja:

- dedupe fuerte cuando existe proveedor
- separa identidad interna de identidad externa

Coste:

- una tabla extra respecto a guardar `provider_place_id` directo en `places`

### `dedupe_key` nullable

Ventaja:

- evita imponer una unique fragil por `name + address`

Coste:

- el backfill necesita criterio de alta confianza para poblarla

### `recommendation_posts` con snapshot plano

Ventaja:

- facilita lectura, indices y trazabilidad

Coste:

- duplica parte de la informacion del lugar y de la entrada origen

## Decisiones diferidas a ADRs o fases siguientes

- politicas RLS y estrategia exacta de permisos
- triggers/funciones SQL finales para `updated_at`
- formula exacta de reputacion y thresholds de `expertise_level_label`
- tablas de media assets
- tablas de notifications y push tokens
- tablas de custom user lists
- estrategia de merge de places ya referenciados

## Contradicciones detectadas al disenar el schema

### Codigo legacy vs schema v2

1. El legacy usa `public.restaurants` y `public.desired_restaurants`; v2 colapsa ambos en `app.user_place_entries`.
2. El legacy usa valores de visibilidad en espanol (`privado`, `publico`); v2 usa enums `private`, `public`.
3. El legacy mezcla `auth_email` y reputacion en `public.profiles`; v2 separa perfiles y mueve reputacion a estructuras derivadas.
4. El legacy guarda recomendaciones con columna `visibility`; v2 las modela como publicaciones siempre publicas.
5. El legacy duplica amistades con espejo; v2 usa una sola fila canonica.

### Documentacion vs documentacion

No se detecta contradiccion nueva con ADR 003 o ADR 004.
Este ADR traduce esas decisiones a SQL sin revertirlas.

## Consecuencia practica para la siguiente fase

La siguiente fase ya no debe discutir:

- que tablas core existen
- como se representa `hidden`
- donde va la cuota semanal
- como se evita duplicar `author + place`
- que parte del modelo es canonica y cual derivada

La siguiente fase si debe concretar:

- migraciones ejecutables
- nombres exactos de enums y constraints en SQL
- RLS y permisos
- funciones o triggers para invariantes transaccionales
- runbook de backfill apoyado en este schema
