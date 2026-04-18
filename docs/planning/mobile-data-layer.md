# Mobile Data Layer

## Objetivo de esta fase

Crear una capa compartida de acceso a backend para `apps/mobile` sin dejar
queries, stubs y futuros commands repartidos por features.

## Lo que se implemento

- `src/api/backend/adapter-mode.ts`
- `src/api/backend/interfaces.ts`
- `src/api/backend/errors.ts`
- `src/api/backend/mappers.ts`
- `src/api/backend/create-mobile-backend-access.ts`
- `src/api/backend/use-mobile-backend-access.ts`
- `src/api/backend/queries/query-keys.ts`
- adapter `stub`
- adapter `http` explicitamente pendiente

Tambien se actualizaron:

- `app.config.ts`
- `src/config/env.ts`
- hooks de `feed` y `profile` para consumir la capa compartida

## Que se separo claramente

### Interfaces de acceso

- `MobileQueryAccess`
- `MobileCommandAccess`
- `MobileBackendAccess`

### Queries

- viven detras de `queries`
- usan query keys compartidas
- ya no dependen de stubs locales dentro de cada feature

### Commands

- viven detras de `commands`
- siguen el catalogo de `ADR 007`
- no se simulan como si fueran operaciones reales

### Mapping

- inputs y outputs se validan con `@savory/contracts`
- la validacion queda centralizada en `mappers.ts`

### Errores

- `MobileBackendError`
- `mapMobileBackendError`

## Que esta stubbed ahora

Stubs activos:

- `getMyProfile`
- `listRecommendationFeed`

No listos aun:

- resto de queries
- todos los commands

## Que depende del runtime real de `apps/api`

- rutas HTTP reales
- auth y actor context de verdad
- payloads y responses reales sobre red
- invalidacion real tras commands
- slices verticales de places, user-place, friendships y recomendaciones

## Como operar la capa hoy

Variables relevantes:

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_MOBILE_BACKEND_MODE`
- `EXPO_PUBLIC_ENABLE_STUB_SESSION`

Modos:

- `stub`: modo actual recomendado
- `http`: reservado para las siguientes fases

## Riesgos actuales

- el adapter `http` todavia no implementa endpoints reales
- el modo `http` sin `EXPO_PUBLIC_API_BASE_URL` ya falla como error de configuracion explicito
- los commands estan fijados, pero no ejercitados en transporte
- la app puede arrancar en modo `http` antes de tiempo si la configuracion se cambia sin tener runtime disponible

## Siguiente paso recomendado

- definir el routing HTTP real de `apps/api`
- conectar primero queries reales de perfil y feed
- despues conectar los primeros commands de perfil y user-place
