# Repo Bootstrap

## Objetivo

Preparar una estructura base del repositorio para soportar la migracion progresiva sin romper el legacy ni adelantar implementaciones todavia.

## Nota de estado posterior

Este documento describe la fase de bootstrap.

Estado actual relevante:

- `packages/contracts` y `packages/domain` ya no son solo placeholders
- su estado vivo se documenta en `docs/planning/contracts-and-domain-packages.md`

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
2. No meter logica de negocio nueva en `packages/*` hasta cerrar mejor el dominio y los contratos.
3. No tratar `apps/legacy-web/supabase-schema.sql` como base de datos versionada nueva.
4. No usar todavia `apps/api` ni `apps/mobile` como si fueran aplicaciones reales; solo son contenedores preparados.

### Estado de las carpetas preparadas

- `apps/api`: preparada, sin backend implementado
- `apps/mobile`: preparada, sin app Expo implementada
- `packages/contracts`: ya contiene contratos iniciales; sigue sin clientes, transporte ni runtime
- `packages/domain`: ya contiene modelo puro inicial; sigue sin I/O ni persistencia
- `supabase/migrations`: preparada, sin baseline ni migraciones
- `supabase/seed`: preparada, sin seeds
- `docs/cutover`: preparada, sin runbooks

## Que queda pendiente

- decidir el bootstrap real de `apps/api`
- decidir el bootstrap real de `apps/mobile`
- meter Supabase bajo control de versiones
- definir schema v2
- escribir runbooks de backfill y cutover

## Carpetas que son solo preparacion por ahora

Las siguientes carpetas existen solo para fijar layout y ownership futuro:

- `apps/api`
- `apps/mobile`
- `supabase/migrations`
- `supabase/seed`
- `docs/cutover`

No debe asumirse implementacion funcional real dentro de ellas todavia.

Excepcion:

- `packages/contracts` y `packages/domain` ya tienen implementacion inicial
