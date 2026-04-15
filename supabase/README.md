# Supabase

Este directorio queda preparado para ser la fuente de verdad futura de la capa de base de datos versionada.

Estado actual:

- `supabase/migrations/` ya contiene migraciones iniciales del schema v2 en `app`
- esas migraciones ya incluyen seguridad/RLS y vistas seguras de lectura
- el schema `app` ya incluye la base durable de outbox en `app.outbox_events`
- `supabase/migrations/` ya incluye tambien el schema operativo `backfill`
- sigue sin existir baseline versionado del schema legacy `public`
- `supabase/seed/` ya contiene scripts operativos de backfill, validacion y rollback

Regla importante:

- `apps/legacy-web/supabase-schema.sql` se trata explicitamente como artefacto legacy
- ese SQL legacy no pasa a ser la fuente de verdad nueva
- la fuente de verdad nueva del sistema nuevo ya empieza en `supabase/migrations/`
- el baseline del legacy sigue pendiente

Scripts operativos actuales en `supabase/seed/`:

- `001_backfill_prechecks.sql`
- `002_backfill_v1_to_v2.sql`
- `003_backfill_postchecks.sql`
- `004_backfill_rollback.sql`
