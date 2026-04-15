# ADR 002 - Repo Structure

## Estado

Accepted

## Nota de estado posterior

Este ADR fijo la estructura ligera inicial del repo.

Estado actual relevante:

- `apps/api` ya no es solo una carpeta reservada; contiene una primera capa de comandos y base asincrona interna
- `apps/mobile` ya no es solo una carpeta reservada; tiene scaffold Expo real documentado en `adr/011-mobile-app-architecture.md`
- `packages/contracts` y `packages/domain` ya no estan vacios; contienen el dominio y los contratos compartidos iniciales

## Contexto

El repositorio ya fue reorganizado para aislar el proyecto web actual en `apps/legacy-web`.
Esa parte debe seguir funcionando sin refactor interno mientras se prepara la migracion progresiva.

Antes de esta decision:

- ya existian `apps/legacy-web`, `package.json`, `pnpm-workspace.yaml`, `.gitignore` y `vercel.json`
- no existian aun las carpetas base para `apps/api`, `apps/mobile`, `packages/contracts`, `packages/domain`, `supabase/migrations`, `supabase/seed` ni `docs/cutover`
- el workspace estaba insinuado, pero no tenia todavia estructura minima completa

Tambien hay una restriccion clara del proyecto:

- no introducir Nx, Turborepo ni orquestadores pesados en esta fase
- no romper el legacy
- no empezar aun ni backend real, ni app movil real, ni schema v2

## Decision

Se adopta una estructura ligera basada en `pnpm-workspace.yaml` y carpetas explicitas:

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

### Reglas de esta estructura

1. `apps/legacy-web` sigue siendo el sistema legacy operativo y congelado salvo fixes criticos.
2. `apps/api` queda como boundary oficial futuro del backend; en el estado actual ya tiene una primera implementacion interna, aunque sigue sin runtime HTTP real.
3. `apps/mobile` queda como hogar de la app Expo/React Native; en el estado actual ya tiene scaffold real, aunque sigue sin integracion final con `apps/api`.
4. `packages/contracts` y `packages/domain` quedan preparados como paquetes compartidos; en el estado actual ya contienen implementacion inicial.
5. `supabase/migrations` y `supabase/seed` quedan preparados como fuente de verdad futura versionada; en el estado actual ya contienen schema v2, soporte de backfill y scripts operativos.
6. `docs/cutover` queda preparado para runbooks operativos; en el estado actual ya contiene runbooks de backfill y cutover.

### Regla critica sobre legacy y fuente de verdad futura

- `apps/legacy-web/supabase-schema.sql` permanece como artefacto legacy
- ese archivo no se eleva a fuente de verdad nueva
- la fuente de verdad nueva, cuando se implemente, vivira en `supabase/migrations/`

## Razones

- simplicidad: la estructura cabe en el repo actual sin introducir tooling pesado
- seguridad de migracion: no toca la logica interna del legacy
- claridad: separa visualmente legacy, backend nuevo, app nueva, paquetes compartidos y base de datos versionada
- progresividad: permite avanzar por fases sin mezclar implementacion temprana con decisiones de layout del repo
- mantenibilidad: deja un sitio definido para cada pieza antes de empezar a construirla

## Consecuencias

### Positivas

- el repo ya queda preparado para las siguientes fases sin tener que rehacer layout mas adelante
- el legacy no se mezcla con backend v2 ni con mobile
- la futura fuente de verdad de base de datos queda claramente separada del SQL legacy
- la documentacion operativa de cutover ya tiene un lugar estable

### Costes

- varias carpetas arrancaron como preparacion antes de tener implementacion real
- la frontera real del backend sigue pendiente de runtime HTTP completo; hoy el legacy sigue hablando con Supabase

## Que sigue siendo legacy

- todo `apps/legacy-web`
- incluido `apps/legacy-web/supabase-schema.sql`
- incluido el boundary actual frontend -> Supabase del legacy

## Que sera fuente de verdad nueva mas adelante

- `docs/adr/` para decisiones arquitectonicas
- `docs/planning/` para estado operativo y fases
- `supabase/migrations/` para la base de datos versionada
- `apps/api` como boundary oficial del sistema
- `packages/contracts` como contrato del sistema nuevo
