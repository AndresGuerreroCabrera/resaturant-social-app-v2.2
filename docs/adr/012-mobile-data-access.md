# ADR 012 - Mobile Data Access

## Estado

Accepted

## Relacion con otros ADRs

Este ADR desarrolla para `apps/mobile` lo ya fijado en:

- `006-security-and-rls.md`
- `007-backend-commands.md`
- `011-mobile-app-architecture.md`

No cambia el boundary oficial.
Lo hace operativo dentro del cliente movil.

## Objetivo

Definir una capa compartida de acceso a backend para mobile que:

- evite fetches dispersos por features
- separe lecturas y escrituras
- consuma `@savory/contracts` como contrato de boundary
- encapsule la estrategia temporal mientras `apps/api` no tenga runtime HTTP completo

## Decision principal

La app movil adopta una capa compartida en:

```text
apps/mobile/src/api/backend/
  adapter-mode.ts
  interfaces.ts
  errors.ts
  mappers.ts
  create-mobile-backend-access.ts
  use-mobile-backend-access.ts
  queries/
    query-keys.ts
  stubs/
    create-stub-query-access.ts
    create-stub-command-access.ts
    stub-data.ts
    stub-profile-store.ts
  http/
    create-http-query-access.ts
    create-http-command-access.ts
```

## Separacion de capas

### Transporte base

`src/api/http-client.ts`

Responsabilidad:

- hacer requests HTTP autenticadas
- adjuntar bearer token
- parsear respuestas con Zod

No decide:

- si una feature usa stub o runtime real
- que operaciones forman parte del boundary movil

### Query access

`MobileQueryAccess`

Responsabilidad:

- agrupar lecturas remotas de mobile
- exponer funciones tipadas y coherentes
- usar query keys compartidas

### Command access

`MobileCommandAccess`

Responsabilidad:

- agrupar escrituras de producto
- usar los mismos nombres de comando ya fijados en `ADR 007`
- mantener la logica de negocio fuera de mobile

### Mappers

`mappers.ts`

Responsabilidad:

- validar inputs y outputs con esquemas compartidos
- convertir payloads desconocidos a contratos tipados
- centralizar esa validacion en vez de repetirla por feature

### Errors

`errors.ts`

Responsabilidad:

- traducir errores tecnicos a una taxonomia minima para mobile
- distinguir configuracion, autenticacion, runtime pendiente, respuesta y validacion de contrato

## Interfaces fijadas

### Queries

La interfaz compartida de lecturas incluye como minimo:

- `getMyProfile`
- `getPublicProfile`
- `listRecommendationFeed`
- `listMyUserPlaceEntries`
- `listMyFriendships`
- `searchPlaces`
- `getPlace`
- `listMyRecommendationPosts`

### Commands

La interfaz compartida de escrituras incluye como minimo:

- `resolvePlace`
- `createOrUpdateProfile`
- `savePlaceToWishlist`
- `markPlaceVisited`
- `publishRecommendation`
- `respondToRecommendation`
- `addFriend`
- `removeFriend`

Decision cerrada:

- mobile reutiliza los nombres del catalogo de comandos backend
- mobile no renombra ni recrea el dominio en cliente

## Relacion con `apps/api`

`apps/mobile` sigue teniendo un unico boundary oficial:

```text
apps/mobile -> apps/api
```

Consecuencias:

- mobile no habla con tablas
- mobile no habla con Supabase como backend de producto
- mobile no usa RLS como API cliente

`ADR 006` sigue aplicando:

- la escritura directa a `app.*` no es una opcion

## Estrategia temporal mientras no exista runtime completo

Se adopta un selector explicito de adapter:

- `EXPO_PUBLIC_MOBILE_BACKEND_MODE=stub|http`

### `stub`

Modo por defecto y seguro para la fase actual.

Comportamiento:

- algunas queries sirven datos tipados de ejemplo
- el slice auth/profile usa un store local persistente encapsulado
- `createOrUpdateProfile` solo se habilita en `stub` para sostener onboarding minimo y perfil
- las operaciones no disponibles fallan de forma explicita con `runtime_not_ready`

Decision cerrada:

- mejor un stub parcial y honesto que una falsa integracion end-to-end

### `http`

Modo preparado para fases siguientes.

Comportamiento actual:

- exige `EXPO_PUBLIC_API_BASE_URL`
- valida inputs y seleccion de adapter
- deja claro que la operacion sigue pendiente hasta que `apps/api` publique el endpoint real

Decision cerrada:

- no se inventan rutas HTTP definitivas en esta fase
- la migracion a runtime real se hara adaptando el adapter HTTP, no reescribiendo las features

## Que queda stubbed hoy

Stubs reales implementados:

- `getMyProfile`
- `getPublicProfile`
- `listRecommendationFeed`
- `createOrUpdateProfile`

Operaciones explicitamente no listas todavia:

- el resto de queries
- el resto de commands

## Query keys

Las query keys compartidas viven en:

- `src/api/backend/queries/query-keys.ts`

Motivo:

- evitar claves ad hoc por feature
- facilitar invalidacion consistente cuando entren mutations reales
- aislar correctamente la cache de `getMyProfile` por `sessionUserId`

## Tradeoffs

### Adapter selection explicito

Ventaja:

- deja visible si mobile esta en modo `stub` o `http`
- permite activar integracion futura sin tocar pantallas

Coste:

- introduce una capa mas de configuracion

### Commands presentes aunque no activos

Ventaja:

- fija desde ya el contrato de escritura movil
- evita que cada feature improvise su propia API

Coste:

- parte de la capa queda preparada antes de tener transporte real

## Fuera de alcance

- definir el routing HTTP definitivo de `apps/api`
- implementar auth real extremo a extremo
- resolver offline o sincronizacion avanzada
- meter logica de negocio sensible en mobile
