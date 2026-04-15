# ADR 007 - Backend Commands

## Estado

Accepted

## Relacion con otros ADRs

Este ADR aterriza la capa de comandos del backend sobre decisiones ya cerradas en:

- `003-migration-architecture.md`
- `004-domain-model-v2.md`
- `005-sql-schema-v2.md`
- `006-security-and-rls.md`

No cambia el boundary oficial `cliente -> apps/api -> base de datos`.
Lo hace operativo.

## Objetivo

Concentrar la logica critica del core inicial en comandos backend controlados para que:

- el cliente no implemente reglas de negocio criticas
- `apps/api` se convierta en el orquestador oficial del dominio
- el schema `app` quede detras de comandos transaccionales con ownership claro
- el runtime HTTP posterior solo tenga que cablear auth, transporte y adaptadores

## Decision principal

La capa de comandos v2 vive en `apps/api/src/commands`.

Cada comando se implementa como:

- validacion de input y output con `@savory/contracts`
- orquestacion de negocio en `apps/api`
- invariantes puras reutilizadas desde `@savory/domain`
- persistencia y atomicidad a traves de un `transaction runner` y puertos de persistencia
- emision de outbox interno cuando el cambio de dominio deba producir side effects asincronos

Decision cerrada:

- no se introducen todavia SQL functions como API publica del dominio
- la primera implementacion usa logica en `apps/api` + transaccion de infraestructura
- si mas adelante alguna garantia exige una funcion SQL puntual, se anadira sin mover el boundary fuera de `apps/api`

## Capas y responsabilidades

### `packages/contracts`

- define commands, responses y DTOs
- valida payloads con Zod
- fija el contrato del boundary `apps/api`

### `packages/domain`

- expone invariantes puras y constantes de negocio
- no contiene I/O ni acceso a base de datos

### `apps/api/src/commands`

- valida ownership
- compone operaciones de varias tablas
- decide idempotencia
- transforma errores de negocio en codigos estables
- exige transaccion cuando corresponde

### SQL y schema `app`

- siguen protegiendo uniques, FK, checks y RLS
- no reciben escritura directa desde cliente autenticado

## Split de DTOs de recomendaciones

Se cierra explicitamente la separacion entre:

- `publicRecommendationPostDto`
- `ownedRecommendationPostDto`

Decision:

- el feed y cualquier superficie publica usan el DTO publico
- los comandos del propio autor pueden devolver el DTO del propietario
- `RecommendationPostDto` se mantiene como alias conservador del DTO de propietario para no introducir una rotura innecesaria interna en esta fase

Esto resuelve la contradiccion abierta en `ADR 006` entre seguridad y contratos compartidos.

## Implementacion tecnica cerrada

La primera capa de comandos se implementa con:

- `apps/api/src/commands/runtime.ts`
- `apps/api/src/commands/ports.ts`
- `apps/api/src/commands/errors.ts`
- `apps/api/src/commands/catalog.ts`
- `apps/api/src/commands/outbox-events.ts`
- `apps/api/src/async/types.ts`
- `apps/api/src/async/ports.ts`
- `apps/api/src/async/worker.ts`
- un archivo por comando de negocio

Los puertos representan dependencias del runtime futuro:

- usuarios/auth
- profiles
- places
- user place entries
- recommendations
- friendships
- reputation
- outbox interno

## Catalogo de comandos

### 1. `resolve_place`

Input:

- `place`
- acepta seleccion canonica o referencia externa controlada

Output:

- `place`
- `resolution = canonical_reused | provider_reused | created`

Ownership:

- cualquier usuario autenticado

Validaciones e invariantes:

- si el input es canonico, el `place` debe existir
- si el input es externo y ya existe referencia de proveedor, se reutiliza el `place` canonico
- si no existe, se crea `place` canonico y su referencia primaria de proveedor

Donde vive la logica:

- validacion de shape en `packages/contracts/src/places.ts`
- orquestacion en `apps/api/src/commands/resolve-place.ts`
- integridad final via unique de `place_provider_references`

Transaccion:

- si, porque puede crear `place` y `place_provider_reference`

Errores relevantes:

- `PLACE_NOT_FOUND`

### 2. `create_or_update_profile`

Input:

- `publicProfile` parcial
- `privateProfile` parcial

Output:

- `publicProfile`
- `privateProfile`

Ownership:

- solo sobre el usuario actor

Validaciones e invariantes:

- crear perfil exige `handle` y `displayName`
- si el handle cambia, debe seguir libre o pertenecer al mismo actor
- nunca expone ni persiste `auth_email` como contrato del dominio

Donde vive la logica:

- validacion de input en `packages/contracts/src/profiles.ts`
- normalizacion de `handle` e idempotencia en `apps/api`
- unicidad final de handle protegida por SQL

Transaccion:

- si, porque actualiza `public_profiles` y `private_profiles` como unidad

Errores relevantes:

- `PROFILE_CREATE_REQUIRES_PUBLIC_FIELDS`
- `PROFILE_HANDLE_ALREADY_TAKEN`

### 3. `save_place_to_wishlist`

Input:

- `place`
- `note`
- `tags`
- `isHidden`

Output:

- `entry`
- `action = created_wishlist | updated_wishlist | kept_existing_visited`
- `placeResolution`

Ownership:

- solo sobre el actor

Validaciones e invariantes:

- una sola fila por `user + place`
- si no existe entrada, crea wishlist privada
- si ya existe wishlist, la actualiza
- si ya existe visita, no degrada `visited -> wishlist`

Donde vive la logica:

- validacion de payload en `packages/contracts/src/user-place.ts`
- resolucion de lugar + upsert de entry en `apps/api`
- unicidad final protegida por SQL

Transaccion:

- si, porque combina `resolve_place` con lectura/escritura sobre `user_place_entries`

Errores relevantes:

- `PLACE_NOT_FOUND`

### 4. `mark_place_visited`

Input:

- target por `place` o por `userPlaceEntryId`
- `visibility`
- `visitedAt`
- `rating`
- `note`
- `tags`
- `priceTier`
- `isHidden`

Output:

- `entry`
- `action = created_visited | promoted_from_wishlist | updated_visited`
- `placeResolution` cuando el target era `place`

Ownership:

- solo sobre el actor

Validaciones e invariantes:

- crear visita directa si no existe entrada
- promover `wishlist -> visited` cuando ya existe wishlist
- actualizar visita si ya existe `visited`
- nunca crea duplicados por `user + place`

Donde vive la logica:

- el shape unificado del comando vive en `packages/contracts`
- la orquestacion y las transiciones viven en `apps/api`
- la forma valida de la fila sigue protegida por checks SQL

Transaccion:

- si, porque puede resolver lugar, bloquear fila existente y promover o actualizar estado

Errores relevantes:

- `USER_PLACE_ENTRY_NOT_FOUND`
- `PLACE_NOT_FOUND`

### 5. `publish_recommendation`

Input:

- `userPlaceEntryId`

Output:

- `recommendation` del propietario
- `quota`

Ownership:

- solo el autor de la `user_place_entry`

Validaciones e invariantes:

- la entry origen debe existir y pertenecer al actor
- solo se publica desde `visited`
- la visita origen debe ser publica y no oculta
- no se permite duplicar `author + place`
- maximo 3 publicaciones por semana ISO en `Europe/Madrid`
- la cuota cuenta posts creados, no posts activos

Donde vive la logica:

- ciclo y cuota desde `@savory/domain`
- chequeos y snapshot en `apps/api`
- unique `author + place` y FK compuesta en SQL
- outbox interno emitido por `apps/api` dentro de la misma transaccion

Transaccion:

- si, con bloqueo de cuota por autor+ciclo y persistencia atomica del outbox interno

Errores relevantes:

- `USER_PLACE_ENTRY_NOT_FOUND`
- `PLACE_NOT_FOUND`
- `RECOMMENDATION_NOT_PUBLISHABLE`
- `RECOMMENDATION_PLACE_ALREADY_PUBLISHED`
- `RECOMMENDATION_QUOTA_EXCEEDED`

### 6. `respond_to_recommendation`

Input:

- `recommendationPostId`
- `reaction = accepted | rejected`

Output:

- `reaction`
- `resultingEntry`
- `entryAction = none | created_wishlist | kept_existing_wishlist | kept_existing_visited`

Ownership:

- solo el viewer actor

Validaciones e invariantes:

- la recomendacion debe existir y seguir activa
- el autor no puede reaccionar a su propio post
- solo una reaccion por `viewer + recommendation`
- la decision del viewer se serializa con lock antes de leer/escribir
- `accepted` crea wishlist privada solo si no existe entrada previa
- `accepted` no degrada una visita existente
- `rejected` no crea entry
- `accepted` registra reputacion del autor como evento y refresca el agregado

Donde vive la logica:

- validacion de reaccion e inmutabilidad en `apps/api`
- efectos laterales sobre wishlist y reputacion tambien en `apps/api`
- side effects asincronos futuros desacoplados via outbox interno
- SQL protege unique de reacciones y de eventos por reaccion

Transaccion:

- si, porque inserta reaccion, puede crear wishlist, registra reputacion basada en evento, actualiza agregado y persiste outbox interno

Errores relevantes:

- `RECOMMENDATION_NOT_FOUND`
- `RECOMMENDATION_SELF_RESPONSE_FORBIDDEN`
- `RECOMMENDATION_ALREADY_RESPONDED`
- `PLACE_NOT_FOUND`

### 7. `add_friend`

Input:

- `friendUserId`

Output:

- `friendship`
- `action = created | already_friends`

Ownership:

- actor autenticado

Validaciones e invariantes:

- no se permite amistad con uno mismo
- el usuario destino debe existir
- la operacion es idempotente si la amistad ya existe
- la pareja se canoniza en orden estable

Donde vive la logica:

- normalizacion del par en `@savory/domain`
- chequeo de existencia e idempotencia en `apps/api`
- unique por par en SQL

Transaccion:

- si, aunque sea breve, para normalizar e insertar de forma coherente

Errores relevantes:

- `FRIENDSHIP_SELF_FORBIDDEN`
- `FRIEND_USER_NOT_FOUND`

### 8. `remove_friend`

Input:

- `friendUserId`

Output:

- `friendUserId`
- `action = removed | not_friends`

Ownership:

- actor autenticado

Validaciones e invariantes:

- no se permite operar contra uno mismo
- la operacion es idempotente si la amistad no existe
- la pareja se normaliza igual que en `add_friend`

Donde vive la logica:

- `apps/api` decide idempotencia y ownership
- SQL garantiza la fila canonica unica

Transaccion:

- si

Errores relevantes:

- `FRIENDSHIP_SELF_FORBIDDEN`

## Errores de negocio implementados

La capa actual fija estos codigos base:

- `FRIENDSHIP_SELF_FORBIDDEN`
- `FRIEND_USER_NOT_FOUND`
- `PLACE_NOT_FOUND`
- `PROFILE_CREATE_REQUIRES_PUBLIC_FIELDS`
- `PROFILE_HANDLE_ALREADY_TAKEN`
- `RECOMMENDATION_ALREADY_RESPONDED`
- `RECOMMENDATION_NOT_FOUND`
- `RECOMMENDATION_NOT_PUBLISHABLE`
- `RECOMMENDATION_PLACE_ALREADY_PUBLISHED`
- `RECOMMENDATION_QUOTA_EXCEEDED`
- `RECOMMENDATION_SELF_RESPONSE_FORBIDDEN`
- `USER_PLACE_ENTRY_NOT_FOUND`

## Idempotencia decidida

- `add_friend`: idempotente
- `remove_friend`: idempotente
- `save_place_to_wishlist`: idempotente sobre la misma entrada
- `mark_place_visited`: idempotente como upsert/promocion
- `create_or_update_profile`: idempotente
- `respond_to_recommendation`: no idempotente si ya existe reaccion; falla
- `publish_recommendation`: no idempotente sobre el mismo `place`; falla
- `resolve_place`: idempotente

## Que queda deliberadamente fuera

- runtime HTTP real
- wiring de auth/JWT
- adaptadores concretos a Supabase/Postgres
- delivery real del outbox
- query side del feed y de perfiles publicos
- formula final de reputacion y thresholds de expertise
- moderacion de recomendaciones
- modulos diferidos: listas personalizadas, media, notifications, push

## Tradeoffs

### Apps/api primero, SQL function despues si hace falta

Ventaja:

- mantiene el boundary oficial claro
- evita esconder reglas de producto en funciones SQL opacas demasiado pronto

Coste:

- hace falta una capa de adaptadores de persistencia bien definida en la siguiente fase

### DTO publico vs DTO del propietario

Ventaja:

- alinea contratos con RLS y vistas seguras

Coste:

- obliga a ser mas explicito en respuestas del backend

## Consecuencia practica para la siguiente fase

La siguiente fase ya no debe discutir:

- que comandos core existen
- donde vive la logica critica
- que operaciones exigen transaccion
- que DTO de recomendacion es publico y cual es del propietario

La siguiente fase si debe cerrar:

- runtime real de `apps/api`
- adaptadores de base de datos sobre `schema app`
- runtime y adaptadores del worker asincrono
- mapeo de errores a respuestas HTTP
- query side para feed, perfil publico y lectura de listas
- estrategia de tests para esta capa
