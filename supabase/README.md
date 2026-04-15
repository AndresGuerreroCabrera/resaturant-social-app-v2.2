# Supabase

Este directorio queda preparado para ser la fuente de verdad futura de la capa de base de datos versionada.

Estado actual:

- `supabase/migrations/` ya contiene migraciones iniciales del schema v2 en `app`
- esas migraciones ya incluyen seguridad/RLS y vistas seguras de lectura
- el schema `app` ya incluye la base durable de outbox en `app.outbox_events`
- sigue sin existir baseline versionado del schema legacy `public`
- `supabase/seed/` existe pero aun no contiene datos semilla

Regla importante:

- `apps/legacy-web/supabase-schema.sql` se trata explicitamente como artefacto legacy
- ese SQL legacy no pasa a ser la fuente de verdad nueva
- la fuente de verdad nueva del sistema nuevo ya empieza en `supabase/migrations/`
- el baseline y el backfill del legacy siguen pendientes
