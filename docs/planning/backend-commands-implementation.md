# Backend Commands Implementation

## Objetivo de esta fase

Implementar la primera capa real de backend en `apps/api` sin levantar todavia el runtime HTTP ni abrir escritura directa desde cliente.

## Que se implemento

### En `apps/api`

Se creo `apps/api/src/commands/` con:

- `runtime.ts`
- `ports.ts`
- `errors.ts`
- `mappers.ts`
- `catalog.ts`
- `resolve-place.ts`
- `create-or-update-profile.ts`
- `save-place-to-wishlist.ts`
- `mark-place-visited.ts`
- `publish-recommendation.ts`
- `respond-to-recommendation.ts`
- `add-friend.ts`
- `remove-friend.ts`
- `index.ts`

Ademas:

- `apps/api/package.json` ya declara dependencias sobre `@savory/contracts` y `@savory/domain`
- `apps/api/tsconfig.json` deja el paquete listo para typecheck futuro

### En `packages/contracts`

Se ajustaron contratos para que el boundary del backend ya tenga:

- `resolvePlaceCommand`
- `createOrUpdateProfileCommand`
- `savePlaceToWishlistCommand`
- `markPlaceVisitedCommand`
- `publishRecommendationCommand`
- `respondToRecommendationCommand`
- `addFriendCommand`
- `removeFriendCommand`

Tambien se cerro el split:

- `publicRecommendationPostDto`
- `ownedRecommendationPostDto`

El feed ya consume el DTO publico.

## Comandos implementados

### Core personal

- `resolve_place`
- `create_or_update_profile`
- `save_place_to_wishlist`
- `mark_place_visited`

### Core social

- `publish_recommendation`
- `respond_to_recommendation`
- `add_friend`
- `remove_friend`

## Como queda repartida la logica

### Validacion de payload

- `packages/contracts`

### Invariantes puras y constantes

- `packages/domain`

### Orquestacion y ownership

- `apps/api/src/commands`

### Integridad final, uniques y RLS

- schema `app` en Supabase/Postgres

## Pendientes que no se resolvieron aqui

- runtime HTTP real en `apps/api`
- auth/JWT y actor context real
- adaptadores de base de datos que implementen `ports.ts`
- query side del feed
- query side de perfiles publicos y listas visibles
- mapeo de errores de negocio a status HTTP
- tests unitarios e integrados
- formula final de reputacion y expertise

## Dependencias de fases posteriores

### Antes de un runtime real de `apps/api`

Hace falta cerrar:

- bootstrap real del framework de API
- cliente/driver a Supabase o Postgres desde backend
- implementaciones concretas de `BackendCommandTransactionRunner` y stores
- politica de logging y observabilidad minima

### Antes de considerar completa la fase de producto

Hace falta cerrar:

- rutas/endpoints
- lecturas publicas derivadas para feed y perfiles
- adaptadores de place provider
- estrategia de tests

## Riesgos residuales

- la capa de comandos existe, pero aun no corre sobre una base real
- no se ejecuto typecheck ni test de runtime en esta fase
- las reglas criticas ya estan fuera del frontend a nivel de diseno e implementacion de backend, pero todavia no estan cableadas a transporte real
