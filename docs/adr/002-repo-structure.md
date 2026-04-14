# ADR 002 - Repo Structure

## Estado

Accepted

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
2. `apps/api` queda reservado como boundary oficial futuro del backend, pero todavia sin implementacion real.
3. `apps/mobile` queda reservado para la app Expo/React Native futura, pero todavia sin implementacion real.
4. `packages/contracts` y `packages/domain` quedan preparados como paquetes compartidos futuros, pero vacios de dominio implementado por ahora.
5. `supabase/migrations` y `supabase/seed` quedan preparados como fuente de verdad futura versionada, pero todavia sin baseline ni schema v2.
6. `docs/cutover` queda preparado para runbooks operativos, aunque aun no tenga contenido funcional.

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

- varias carpetas quedan como preparacion y no como implementacion real todavia
- `pnpm-workspace.yaml` pasa a apuntar a paquetes placeholder que aun no contienen codigo de negocio
- la frontera real del backend sigue pendiente de implementacion; hoy el legacy sigue hablando con Supabase

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
