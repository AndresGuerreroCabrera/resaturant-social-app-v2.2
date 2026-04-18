# Mobile Slice - Places And Personal Lists

## Objetivo

Implementar en `apps/mobile` el flujo central de producto alrededor de
`UserPlaceEntry` sin romper el boundary oficial:

```text
apps/mobile -> apps/api
```

Mientras `apps/api` no tenga runtime HTTP completo, el slice opera de forma
honesta sobre el adapter `stub`.

## Alcance real de esta fase

Queda cubierto:

- busqueda de lugar
- seleccion de resultado canonico o externo
- resolucion o creacion de `place` canonico
- guardado en wishlist
- promocion `wishlist -> visited`
- actualizacion de una visita existente
- lectura de mis estados personales respecto a lugares

Queda fuera deliberadamente:

- listas personalizadas
- publicar recomendaciones desde una visita
- feed social
- busqueda real contra proveedor externo
- sincronizacion offline

## Pantalla y flujo E2E

La entry point del slice vive hoy en:

- `apps/mobile/app/(app)/home.tsx`
- `apps/mobile/src/features/places/screens/places-home-screen.tsx`

Flujo:

1. el usuario escribe una busqueda
2. `searchPlaces` consulta la data layer compartida
3. el usuario selecciona un resultado
4. `resolvePlace` reutiliza un `place` canonico o crea uno nuevo si el origen es externo
5. sobre ese `place` resuelto, el usuario puede:
   - guardar en wishlist con `savePlaceToWishlist`
   - marcar visitado con `markPlaceVisited`
6. la pantalla vuelve a consultar o invalida:
   - `listMyUserPlaceEntries(wishlist)`
   - `listMyUserPlaceEntries(visited)`
   - `listMyUserPlaceEntries(hidden)`
   - `getMyProfile` y `getPublicProfile(me)` cuando cambia una visita, porque `publicVisitedCount` depende de visited entries publicas

## Edge cases cubiertos

- si una busqueda no encuentra nada en el catalogo stub, se genera un candidato externo controlado para poder ejercitar `resolvePlace`
- si el `externalPlace` ya estaba asociado a un `place` canonico, `resolvePlace` devuelve `provider_reused`
- si el usuario intenta guardar en wishlist un lugar ya visitado, no se degrada el estado; la respuesta queda en `kept_existing_visited`
- si el usuario marca visitado una entry de wishlist, el estado se promociona a `visited`
- si una entry esta `hidden`, no aparece en las listas normales y solo sale en la seccion `hidden`
- la visibilidad publica/privada solo aplica a `visited`, nunca a wishlist

## Dependencias

Este slice depende de:

- `ADR 004` para el modelo unificado `UserPlaceEntry`
- `ADR 007` para el catalogo de comandos
- `ADR 011` para estructura y shell de `apps/mobile`
- `ADR 012` para la data layer compartida
- `@savory/contracts` para DTOs y validacion
- `@savory/domain` para listas derivadas y helpers puros

## Que parte esta stubbed

Operativo hoy en `stub`:

- `searchPlaces`
- `getPlace`
- `listMyUserPlaceEntries`
- `resolvePlace`
- `savePlaceToWishlist`
- `markPlaceVisited`

Soporte local persistente:

- `stub-place-store.ts`
- query keys aisladas por `sessionUserId`
- invalidacion basica tras mutations

## Que depende del runtime real

Sigue pendiente de `apps/api` real:

- endpoints HTTP de places y user-place
- auth/JWT real
- actor context de backend
- errores de negocio reales sobre red
- resultados reales de proveedor externo o search service
- validacion end-to-end del contrato `mobile -> apps/api -> app.*`

## Riesgos actuales

- el slice es funcional solo en `stub mode`; no esta probado aun sobre transporte real
- la busqueda stub sirve para arquitectura y UX basica, no para calidad real de descubrimiento
- la resolucion stub reutiliza `place` por canonico o provider reference, pero no intenta replicar todavia toda la deduplicacion final del backend
- la invalidacion actual es suficiente para el slice, pero todavia no cubre todas las dependencias futuras con recomendaciones/feed

## Siguiente paso recomendado

- conectar este mismo slice al adapter `http` cuando `apps/api` publique runtime real para profile, places y user-place
- despues usar `visited` como base del slice de recomendaciones/feed
