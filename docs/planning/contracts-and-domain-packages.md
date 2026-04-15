# Contracts and Domain Packages

## Objetivo

Convertir `packages/domain` y `packages/contracts` en la fuente compartida de verdad del sistema nuevo antes de implementar SQL final o handlers backend completos.

## Estructura creada

```text
tsconfig.base.json

packages/
  domain/
    src/
      primitives.ts
      identity.ts
      profiles.ts
      places.ts
      user-place.ts
      friendships.ts
      recommendations.ts
      reputation.ts
      feed.ts
      index.ts
    package.json
    tsconfig.json
  contracts/
    src/
      common.ts
      identity.ts
      profiles.ts
      places.ts
      user-place.ts
      friendships.ts
      recommendations.ts
      reputation.ts
      feed.ts
      index.ts
    package.json
    tsconfig.json
```

## Proposito de cada paquete

### `packages/domain`

Responsabilidad:

- tipos de dominio
- enums y constantes cerradas
- value objects simples
- invariantes puras
- utilidades puras sin I/O

No contiene:

- acceso a base de datos
- HTTP
- SDKs
- Zod
- repositorios
- handlers de backend

### `packages/contracts`

Responsabilidad:

- DTOs de commands y queries
- payloads publicos de request y response
- validaciones Zod
- read models que compartiran `apps/api` y `apps/mobile`

No contiene:

- transporte HTTP concreto
- clientes
- persistencia
- reglas de autorizacion
- logica de UI

## Relacion con `apps/api` y `apps/mobile`

### `apps/api`

Debe usar:

- `@savory/domain` para invariantes puras y constantes de negocio
- `@savory/contracts` para validar inputs y fijar outputs del boundary

No debe:

- redefinir enums de dominio localmente
- tratar el schema SQL como contrato publico

### `apps/mobile`

Debe usar:

- `@savory/contracts` como shape de consumo del backend
- `@savory/domain` solo para constantes y helpers puros que no dependan de I/O

No debe:

- convertir `packages/domain` en fuente de verdad de permisos o seguridad
- hablar directo con tablas Supabase nuevas

## Cobertura real de esta fase

### Core inicial cubierto

- identity
- profiles
- places
- user-place
- friendships
- recommendations
- reputation
- feed derivado de recomendaciones publicas

### Decisiones de modelado ya reflejadas en codigo compartido

- `UserPlaceEntry` sigue siendo el modelo oficial y unificado
- `hidden` se representa como ocultacion separada del `status`, no como tercer estado
- el limite semanal de recomendaciones se fija como constante de dominio
- la recomendacion social es entidad propia con snapshot publicado
- los contratos ya separan DTO publico y DTO del propietario para recomendaciones
- la amistad sigue siendo simetrica
- el feed se trata como read model derivado

### Deliberadamente diferido

- media assets
- notificaciones y push
- activity stream generico
- listas personalizadas
- clientes HTTP
- acceso a base de datos
- SQL final

## Decisiones practicas de empaquetado

1. `packages/domain` no depende de `packages/contracts`.
2. `packages/contracts` si depende de `packages/domain`.
3. Los IDs siguen siendo strings opacos en esta fase para no fijar prematuramente detalles del schema final.
4. Los contratos de entrada de places aceptan una seleccion canonica o una referencia externa controlada.
5. El comando inicial para publicar recomendacion parte de una `userPlaceEntry` existente y deja el snapshot final en manos del backend.

## Riesgos y limites actuales

- aun no hay typecheck ejecutado porque el repo no tiene toolchain TypeScript instalada en esta fase
- el detalle ejecutable de migraciones, enums SQL y RLS sigue pendiente aunque el diseno alto nivel ya esta fijado en `adr/005-sql-schema-v2.md`
- los niveles exactos de expertise siguen abiertos; por eso solo se fija `expertiseLevelLabel`
- la estrategia de deduplicacion de `Place` ya tiene marco SQL en `adr/005-sql-schema-v2.md`, pero la heuristica exacta de backfill sigue pendiente

## Documentos relacionados

- `docs/adr/004-domain-model-v2.md`
- `docs/adr/005-sql-schema-v2.md`
- `docs/planning/migration-phases.md`
- `docs/planning/repo-bootstrap.md`
