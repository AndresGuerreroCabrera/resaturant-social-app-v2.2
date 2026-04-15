# Backfill Runbook

## Alcance

Este runbook sirve para:

- rehearsal en staging
- ejecuciones controladas previas a cutover
- rollback del backfill si algo sale mal

No es todavia el runbook final de cutover.

## Precondiciones

- `app.*` ya existe y sus migraciones v2 estan aplicadas
- `backfill.*` ya existe via `20260415160000_create_backfill_schema.sql`
- el operador usa `service_role` o contexto equivalente
- se trabaja sobre staging o sobre una copia controlada de produccion
- no se ejecuta este backfill mientras se introduce data manual nueva en `app.*`

## Archivos a ejecutar

1. `supabase/seed/001_backfill_prechecks.sql`
2. `supabase/seed/002_backfill_v1_to_v2.sql`
3. `supabase/seed/003_backfill_postchecks.sql`
4. `supabase/seed/004_backfill_rollback.sql` solo si hace falta deshacer

## Procedimiento

### 1. Snapshot previo

- tomar backup o snapshot de la base objetivo
- anotar timestamp de inicio
- guardar export de los conteos legacy:
  - `public.profiles`
  - `public.restaurants`
  - `public.desired_restaurants`
  - `public.recommendations`
  - `public.recommendation_actions`
  - `public.friendships`

### 2. Confirmar migraciones estructurales

- aplicar `supabase/migrations/20260414193000_create_app_schema_v2.sql`
- aplicar `supabase/migrations/20260414194000_create_app_public_profile_stats_view.sql`
- aplicar `supabase/migrations/20260414200000_configure_app_security_and_rls.sql`
- aplicar `supabase/migrations/20260415143000_create_app_outbox_events.sql`
- aplicar `supabase/migrations/20260415160000_create_backfill_schema.sql`

### 3. Ejecutar prechecks

- correr `supabase/seed/001_backfill_prechecks.sql`
- revisar especialmente:
  - filas legacy con nombre vacio
  - recomendaciones privadas
  - autoreacciones
  - cantidad de `place_id` vacios
  - si ya existe data previa en `app.*`

Si los prechecks muestran data previa inesperada en `app.*`, parar y decidir antes de continuar.

### 4. Ejecutar backfill

- correr `supabase/seed/002_backfill_v1_to_v2.sql`
- no mezclar esta ejecucion con cambios manuales en `app.*`
- si falla, no relanzar a ciegas; revisar primero el error, porque la transaccion debe haber hecho rollback completo

### 5. Ejecutar postchecks

- correr `supabase/seed/003_backfill_postchecks.sql`
- validar que no levanta excepciones
- guardar la salida de:
  - conteos por area
  - resumen de `backfill.skipped_records`

### 6. Reconciliacion manual

- muestrear al menos 10 perfiles y comprobar:
  - `app.public_profiles`
  - `app.private_profiles`
  - `app.public_profile_stats_v`
- muestrear al menos 10 lugares resueltos y comprobar:
  - `app.places`
  - `app.place_provider_references`
  - `backfill.place_mappings`
- muestrear al menos 10 relaciones usuario-lugar y comprobar:
  - estado `wishlist` o `visited`
  - visibilidad
  - `created_at` y `updated_at`
- muestrear al menos 10 recomendaciones migradas y comprobar:
  - `source_entry_id`
  - `place_id`
  - semana ISO
  - recomendaciones skippeadas por privacidad o cuota
- muestrear al menos 10 aceptaciones y comprobar:
  - reaccion
  - evento de reputacion
  - resumen agregado del autor

## Criterios de aceptacion

- no hay excepciones en `001_backfill_prechecks.sql`
- `002_backfill_v1_to_v2.sql` termina en una sola transaccion sin error
- `003_backfill_postchecks.sql` no falla
- los conteos cuadran segun el plan
- los skips tienen razones comprensibles y aceptadas

## Rollback

Usar solo si:

- el backfill acaba de ejecutarse
- aun no ha habido escritura nueva legitima en `app.*`
- se quiere volver a un estado limpio antes de un nuevo intento

Pasos:

1. ejecutar `supabase/seed/004_backfill_rollback.sql`
2. confirmar que quedan vacias o limpias estas estructuras:
   - `app.public_profiles`
   - `app.private_profiles`
   - `app.places`
   - `app.place_provider_references`
   - `app.user_place_entries`
   - `app.recommendation_posts`
   - `app.recommendation_reactions`
   - `app.reputation_events`
   - `app.reputation_summaries`
   - `app.friendships`
   - `backfill.*`
3. reejecutar `001_backfill_prechecks.sql`

Limite importante:

- si ya existe data nueva en `app.*`, el rollback puede borrar o colisionar con informacion valida
- en ese caso no usar el rollback ciego; restaurar snapshot o evaluar borrado quirurgico

## Problemas esperables

### Duplicados legacy de lugares

- esperar algunos duplicados residuales cuando no haya `place_id` ni direccion fiable
- no forzar merges manuales durante el backfill

### Recomendaciones que no migran

- privadas
- sin `source_entry` visitada publica valida
- duplicadas por `author + place`
- excediendo la cuota semanal v2

### Reputacion

- el `score` queda alineado con la logica legacy reconstruida, no con una formula v2 final
- si mas adelante cambia la formula v2, habra que recomputar `app.reputation_summaries`

## Salidas que conviene guardar

- resultado completo de `001_backfill_prechecks.sql`
- resultado completo de `003_backfill_postchecks.sql`
- export de `backfill.skipped_records`
- timestamp de inicio y fin de la ejecucion
