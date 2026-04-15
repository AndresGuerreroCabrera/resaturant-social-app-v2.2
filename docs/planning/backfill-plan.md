# Backfill Plan

## Objetivo

Poblar `app.*` desde el schema legacy `public` sin romper el sistema actual y sin convertir el backfill en cutover.

La implementacion actual se apoya en:

- `supabase/migrations/20260415160000_create_backfill_schema.sql`
- `supabase/seed/001_backfill_prechecks.sql`
- `supabase/seed/002_backfill_v1_to_v2.sql`
- `supabase/seed/003_backfill_postchecks.sql`
- `supabase/seed/004_backfill_rollback.sql`

## Principios operativos

- el legacy no se toca de forma destructiva
- el backfill debe poder reejecutarse sin duplicar filas en v2
- las heuristicas de deduplicacion son conservadoras
- lo ambiguo se registra en `backfill.skipped_records` en lugar de forzarse
- los mappings viven en `backfill.*`, nunca en tablas canonicas `app.*`
- la seguridad sigue cerrada a `service_role`; no se abre acceso cliente para migrar

## Mapeo v1 -> v2

### Perfiles

Legacy:

- `public.profiles`

V2:

- `app.public_profiles`
- `app.private_profiles`
- `backfill.profile_mappings`

Migra limpio:

- `id` -> `user_id`
- `username` -> `display_name`
- `avatar` -> `avatar_key`
- `created_at` -> `created_at`

Migra transformado:

- `username_normalized` se normaliza y deduplica para `handle`
- `onboarding_completed_at` se rellena con `public.profiles.created_at` para no reonboardear usuarios legacy

No migra:

- `auth_email`

### Places

Legacy fuentes:

- `public.restaurants`
- `public.desired_restaurants`
- `public.recommendations`

V2:

- `app.places`
- `app.place_provider_references`
- `backfill.place_mappings`

Resolucion oficial:

1. si existe `place_id` no vacio, se usa `google_places` como referencia externa canonica
2. si una fila no tiene `place_id` pero coincide en `name + address` exactos con otra fila que si lo tiene, reutiliza ese `place` con referencia externa
3. si no existe `place_id`, solo se colapsan filas con `name + address` exactos tras normalizacion conservadora
4. si no hay `place_id` ni `address` confiable, la fila queda aislada y crea su propio `place`

Decision conservadora:

- no se hace merge por nombre solo
- no se intenta inferir localidad, region ni pais desde texto legacy

### Relacion usuario-place

Legacy:

- `public.restaurants`
- `public.desired_restaurants`

V2:

- `app.user_place_entries`
- `backfill.user_place_entry_mappings`

Regla de unificacion:

- una sola fila por `user + place`
- `restaurants` migra como `visited`
- `desired_restaurants` migra como `wishlist`
- si coexisten `visited` y `wishlist` para el mismo `user + place`, prevalece `visited`

Transformaciones:

- `wishlist` siempre queda `private`, aunque el legacy tuviera `publico`
- `wishlist` pierde `rating` y `price_tier` porque v2 no los admite en ese estado
- `created_at` de la entry unificada es la primera relacion conocida entre usuario y lugar
- `updated_at` de la entry unificada es la ultima fila legacy absorbida

### Recomendaciones

Legacy:

- `public.recommendations`

V2:

- `app.recommendation_posts`
- `backfill.recommendation_post_mappings`

Migra limpio:

- snapshot de nombre, direccion, comentario, rating, tags y precio
- `created_at`

Migra transformado:

- `cycle_iso_year` y `cycle_iso_week` se recalculan desde `created_at` en `Europe/Madrid`
- `source_entry_id` se resuelve primero por `original_restaurant_id` y luego por fallback `author + place`

No migra:

- recomendaciones `privado`
- recomendaciones sin `place` resoluble
- recomendaciones sin `source_entry` visitada publica valida
- duplicados por `author + place` mas alla de la primera publicacion
- publicaciones que rompan la cuota semanal v2; se conservan solo las 3 primeras por autor y semana ISO

### Reacciones

Legacy:

- `public.recommendation_actions`

V2:

- `app.recommendation_reactions`
- `backfill.recommendation_reaction_mappings`

Migra limpio:

- `accepted`
- `rejected`
- `created_at`

Migra transformado:

- las aceptaciones crean una wishlist sintetica solo si el viewer no tiene ya `user_place_entry`

No migra:

- reacciones a recomendaciones no migradas
- autoreacciones del autor a su propio post
- acciones guest de `localStorage`

### Reputacion

Legacy:

- `public.profiles.expertise_rating`
- `public.profiles.accepted_recommendation_count`
- trigger `handle_recommendation_acceptance`

V2:

- `app.reputation_events`
- `app.reputation_summaries`

Decision cerrada:

- no se copian contadores legacy como fuente de verdad
- se reconstruyen eventos desde aceptaciones migradas
- el `score` se recomputa reejecutando cronologicamente la formula legacy tipo Elo para preservar continuidad
- `accepted_recommendation_count` se recalcula desde eventos
- `expertise_level_label` se rellena con los thresholds legacy (`Basico`, `Curioso`, `Foodie`, `Gourmet`, `Maestro`) como etiqueta provisional hasta cerrar la formula v2 definitiva

### Friendships

Legacy:

- `public.friendships` con espejo

V2:

- `app.friendships`
- `backfill.friendship_mappings`

Transformacion:

- se colapsa el espejo a una sola fila canonica por pareja ordenada
- se conserva el `created_at` minimo de la pareja

### Media

No hay media generica migrable en esta fase.

Queda fuera:

- uploads
- attachments
- procesamiento de media

## Orden de ejecucion

1. aplicar migraciones v2 del schema `app`
2. aplicar `20260415160000_create_backfill_schema.sql`
3. ejecutar `supabase/seed/001_backfill_prechecks.sql`
4. ejecutar `supabase/seed/002_backfill_v1_to_v2.sql`
5. ejecutar `supabase/seed/003_backfill_postchecks.sql`
6. si hace falta deshacer, ejecutar `supabase/seed/004_backfill_rollback.sql`

## Validaciones previstas

### Prechecks

- existencia de tablas legacy y v2 requeridas
- conteos iniciales
- filas sin `place_id`
- recomendaciones privadas
- autoreacciones
- estado previo de `backfill.*`

### Postchecks

- perfiles mapeados vs perfiles cargados en v2
- `places` distintos resueltos vs `app.places`
- filas legacy absorbidas por `user_place_entries`
- recomendaciones migradas y razones de skip
- reacciones migradas vs `reputation_events`
- amistades canonicas vs `app.friendships`

### Reconciliacion manual

- muestrear al menos 10 usuarios con:
  - perfil
  - visited
  - wishlist
  - recomendaciones publicas
  - reputacion visible
- muestrear al menos 10 recomendaciones con:
  - `source_entry_id`
  - `place_id`
  - reacciones
  - evento de reputacion asociado si la reaccion es `accepted`

## Riesgos

- el dedupe por `name + address` es deliberadamente conservador; algunos duplicados reales seguiran existiendo
- no existe baseline versionado del legacy `public`, asi que el soporte de backfill asume el schema actual real como referencia historica
- si ya existe data manual en `app.*`, el backfill puede entrar en conflicto con datos preexistentes que no usen los ids deterministas del backfill
- el score de reputacion se mantiene compatible con el legacy, no con una formula v2 definitiva

## Datos que no migran

- `auth_email`
- guest actions de `localStorage`
- recomendaciones privadas legacy
- campos de visita dentro de `desired_restaurants` que no caben en `wishlist` v2
- `expertise_rating` y `accepted_recommendation_count` legacy como verdad copiada
- outbox o side effects historicos

## Estado actual

La fase de backfill queda implementada a nivel de SQL y documentacion, pero todavia no verificada en una base real con rehearsal completo.
