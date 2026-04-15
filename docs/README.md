# Docs

Este directorio guarda las decisiones y el plan de migracion del proyecto para que el contexto no se pierda entre sesiones.

## Orden recomendado de lectura

Si retomas el proyecto desde cero o desde una sesion nueva, lee en este orden:

1. `adr/001-migration-strategy.md`
2. `adr/002-repo-structure.md`
3. `adr/003-migration-architecture.md`
4. `adr/004-domain-model-v2.md`
5. `adr/005-sql-schema-v2.md`
6. `adr/006-security-and-rls.md`
7. `adr/007-backend-commands.md`
8. `adr/008-recommendations-and-reputation.md`
9. `adr/009-outbox-and-jobs.md`
10. `planning/migration-phases.md`
11. `planning/backend-commands-implementation.md`
12. `planning/async-processing.md`
13. `planning/sql-migrations-v2.md`
14. `planning/contracts-and-domain-packages.md`
15. `planning/repo-reorganization.md`
16. `planning/repo-bootstrap.md`
17. `planning/backfill-plan.md`
18. `cutover/backfill-runbook.md`
19. `cutover/cutover-runbook.md` *(cuando exista)*

## Que contiene cada carpeta

### `adr/`

Architecture Decision Records.

Aqui van las decisiones estables del sistema:

- estrategia de migracion
- estructura del repo
- frontera backend
- modelo de dominio
- seguridad
- cutover
- arquitectura movil
- notificaciones
- realtime
- observabilidad

Regla:

- cada ADR documenta una decision
- si una decision cambia de forma importante, se debe actualizar de forma controlada o supersederla

### `planning/`

Plan de ejecucion y estado del trabajo.

Aqui van:

- fases de migracion
- bootstrap del repo
- checklist de beta
- estrategia de tests
- estado de slices moviles
- implementacion de comandos
- notas operativas de avance

### `cutover/`

Documentacion operativa para migracion de datos y paso a produccion.

Aqui van:

- backfill runbook
- cutover runbook
- validaciones pre y post migracion
- rollback

## Documentos fuente de verdad actuales

### Fuente de verdad estrategica

- `adr/001-migration-strategy.md`
- `adr/002-repo-structure.md`
- `adr/003-migration-architecture.md`
- `adr/004-domain-model-v2.md`
- `adr/005-sql-schema-v2.md`
- `adr/006-security-and-rls.md`
- `adr/007-backend-commands.md`
- `adr/008-recommendations-and-reputation.md`
- `adr/009-outbox-and-jobs.md`

### Fuente de verdad operativa

- `planning/migration-phases.md`
- `planning/backend-commands-implementation.md`
- `planning/async-processing.md`
- `planning/sql-migrations-v2.md`
- `planning/contracts-and-domain-packages.md`
- `planning/repo-bootstrap.md`
- `planning/backfill-plan.md`
- `cutover/backfill-runbook.md`

## Reglas para futuras sesiones

Antes de cambiar codigo o arquitectura:

1. leer los documentos relevantes en `docs/`
2. tratar esos documentos como fuente de verdad
3. senalar contradicciones entre docs y codigo
4. actualizar los docs si se cierra una decision nueva
5. no dejar decisiones importantes solo en el chat

## Estado actual

Estado de documentacion actualizado tras:

- reorganizacion del legacy a `apps/legacy-web`
- bootstrap estructural del workspace ligero
- cierre del modelo de dominio v2 en `adr/004-domain-model-v2.md`
- implementacion inicial de `packages/domain` y `packages/contracts`
- cierre del diseno SQL v2 en `adr/005-sql-schema-v2.md`
- implementacion de migraciones versionadas del schema v2 en `supabase/migrations/`
- cierre de la politica de seguridad y RLS v2 en `adr/006-security-and-rls.md`
- implementacion de la capa de comandos backend del core inicial en `apps/api`
- refuerzo del slice social de recomendaciones, reacciones y reputacion en `adr/008-recommendations-and-reputation.md`
- base asincrona durable de outbox y polling en `adr/009-outbox-and-jobs.md`
- implementacion del soporte de backfill v1 -> v2 con schema `backfill`, scripts SQL reejecutables y runbook operativo

Proximo paso recomendado:

- ensayar el backfill en staging con reconciliacion real y, en paralelo, cablear el runtime real de `apps/api` con auth, transporte, adaptadores de persistencia y handlers/worker reales
