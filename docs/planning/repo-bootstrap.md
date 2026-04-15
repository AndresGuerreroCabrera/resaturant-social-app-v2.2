# Repo Bootstrap

## Objetivo

Preparar una estructura base del repositorio para soportar la migracion progresiva sin romper el legacy ni adelantar implementaciones todavia.

## Nota de estado posterior

Este documento describe la fase de bootstrap.

Estado actual relevante:

- `packages/contracts` y `packages/domain` ya no son solo placeholders
- su estado vivo se documenta en `docs/planning/contracts-and-domain-packages.md`
- `apps/api` ya no es solo un placeholder: contiene una primera capa de comandos sin runtime HTTP

## Que se anadio

### Carpetas

- `apps/api/`
- `apps/mobile/`
- `packages/contracts/`
- `packages/domain/`
- `supabase/migrations/`
- `supabase/seed/`
- `docs/cutover/`

### Archivos de placeholder

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
4. No usar todavia `apps/mobile` como si fuera una aplicacion real.
5. `apps/api` ya contiene comandos de backend, pero sigue sin runtime HTTP ni adaptadores reales.

### Estado de las carpetas preparadas

- `apps/api`: capa de comandos implementada, runtime y adaptadores pendientes
- `apps/mobile`: preparada, sin app Expo implementada
- `packages/contracts`: ya contiene contratos iniciales; sigue sin clientes, transporte ni runtime
- `packages/domain`: ya contiene modelo puro inicial; sigue sin I/O ni persistencia
- `supabase/migrations`: ya contiene schema v2 y RLS; baseline legacy pendiente
- `supabase/seed`: preparada, sin seeds
- `docs/cutover`: preparada, sin runbooks

## Que queda pendiente

- decidir el bootstrap real de `apps/mobile`
- levantar el runtime real de `apps/api`
- implementar adaptadores de persistencia para la capa de comandos
- escribir runbooks de backfill y cutover

## Carpetas que son solo preparacion por ahora

Las siguientes carpetas existen solo para fijar layout y ownership futuro:

- `apps/mobile`
- `supabase/seed`
- `docs/cutover`

No debe asumirse implementacion funcional real dentro de ellas todavia.

Excepcion:

- `apps/api` ya tiene una capa de comandos sin runtime
- `packages/contracts` y `packages/domain` ya tienen implementacion inicial
- `supabase/migrations` ya contiene migraciones reales del schema v2
