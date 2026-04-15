# Repo Bootstrap

## Objetivo

Preparar una estructura base del repositorio para soportar la migracion progresiva sin romper el legacy ni adelantar implementaciones todavia.

## Nota de estado posterior

Este documento describe la fase de bootstrap.

Estado actual relevante:

- `packages/contracts` y `packages/domain` ya no son solo placeholders
- su estado vivo se documenta en `docs/planning/contracts-and-domain-packages.md`
- `apps/api` ya no es solo un placeholder: contiene una primera capa de comandos sin runtime HTTP
- `apps/mobile` ya no es solo un placeholder: contiene scaffold Expo real documentado en `docs/planning/mobile-bootstrap.md`

## Que se anadio

### Carpetas

- `apps/api/`
- `apps/mobile/`
- `packages/contracts/`
- `packages/domain/`
- `supabase/migrations/`
- `supabase/seed/`
- `docs/cutover/`

### Archivos de bootstrap inicial

- `apps/api/package.json`
- `apps/api/README.md`
- `apps/mobile/package.json`
- `apps/mobile/README.md`
- `packages/contracts/package.json`
- `packages/contracts/README.md`
- `packages/domain/package.json`
- `packages/domain/README.md`
- `supabase/README.md`
- `supabase/migrations/.gitkeep`
- `supabase/seed/.gitkeep`
- `docs/cutover/README.md`
- `docs/adr/002-repo-structure.md`

### Ajustes ligeros

- se anadio `packageManager` al `package.json` raiz para fijar `pnpm`
- no se tocaron `pnpm-workspace.yaml` ni `vercel.json` porque ya cubrian el estado actual del repo y del legacy

## Como usar el workspace hoy

### Layout actual

```text
/
  apps/
    legacy-web/
    api/
    mobile/
  packages/
    contracts/
    domain/
  supabase/
    migrations/
    seed/
  docs/
    adr/
    planning/
    cutover/
```

### Reglas de uso

1. Seguir trabajando el sistema actual solo dentro de `apps/legacy-web` mientras no empiece una fase posterior.
2. Mantener `packages/*` reservados a dominio puro y contratos compartidos; la orquestacion de negocio ya debe vivir en `apps/api`.
3. No tratar `apps/legacy-web/supabase-schema.sql` como base de datos versionada nueva.
4. Tratar `apps/mobile` como scaffold movil real, pero no como cliente ya integrado con `apps/api`.
5. `apps/api` ya contiene comandos de backend, pero sigue sin runtime HTTP ni adaptadores reales.

### Estado de las carpetas preparadas

- `apps/api`: capa de comandos implementada, runtime y adaptadores pendientes
- `apps/mobile`: scaffold Expo real creado; integracion HTTP/auth final pendiente
- `packages/contracts`: ya contiene contratos iniciales; sigue sin clientes, transporte ni runtime
- `packages/domain`: ya contiene modelo puro inicial; sigue sin I/O ni persistencia
- `supabase/migrations`: ya contiene schema v2 y RLS; baseline legacy pendiente
- `supabase/seed`: ya contiene scripts operativos de backfill; siguen sin existir seeds funcionales de entorno de producto
- `docs/cutover`: ya contiene runbooks de backfill y cutover; la ejecucion real sigue pendiente

## Que queda pendiente

- levantar el runtime real de `apps/api`
- implementar adaptadores de persistencia para la capa de comandos
- ensayar integracion real de `apps/mobile` contra `apps/api`

## Carpetas que siguen siendo sobre todo preparacion operativa

Las siguientes carpetas siguen existiendo principalmente para fijar layout y ownership futuro:

- `supabase/seed`
- `docs/cutover`

No debe asumirse integracion de producto cerrada dentro de ellas todavia.

Excepcion:

- `apps/api` ya tiene una capa de comandos sin runtime
- `packages/contracts` y `packages/domain` ya tienen implementacion inicial
- `supabase/migrations` ya contiene migraciones reales del schema v2
- `apps/mobile` ya tiene scaffold real, pero depende todavia de runtime y endpoints reales
