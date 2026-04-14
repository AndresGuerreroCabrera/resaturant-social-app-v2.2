# ADR 006 - Security and RLS

## Estado

Accepted

## Relacion con otros ADRs

Este ADR aterriza la capa de acceso y seguridad del schema `app` a partir de:

- `003-migration-architecture.md`
- `004-domain-model-v2.md`
- `005-sql-schema-v2.md`

No cambia el boundary oficial `cliente -> apps/api -> base de datos`.
Lo refuerza.

## Objetivo

Definir e implementar una politica de acceso estricta y razonable para el backend v2 que deje claro:

- que se puede leer directamente desde clientes autenticados
- que queda reservado a `apps/api` o `service_role`
- que columnas no deben exponerse nunca en acceso SQL directo
- que vistas publicas seguras se crean como superficie controlada

## Principio rector

El schema `app` no es una API publica para clientes nuevos.

La superficie oficial del sistema nuevo sigue siendo:

```text
cliente -> apps/api -> schema app
```

RLS existe como defensa real y como red de seguridad adicional.
No sustituye a `apps/api`.

## Interpretacion de "publico"

En este proyecto, "publico" significa:

- visible dentro del producto para usuarios autenticados
- o visible a traves de respuestas controladas de `apps/api`

No significa:

- lectura anonima directa sobre SQL
- exposicion irrestricta de cualquier columna de una tabla marcada como publica en negocio

Decision cerrada:

- `anon` no recibe acceso directo al schema `app`
- `authenticated` recibe solo lectura explicita y muy limitada
- las escrituras del schema `app` quedan reservadas a backend y `service_role`

## Modelo de acceso por rol

### `anon`

- sin `usage` util sobre las superficies del schema `app`
- sin lectura ni escritura directa

### `authenticated`

- `usage` sobre schema `app`
- lectura directa solo donde se concede explicitamente
- ninguna escritura directa sobre tablas core

### `service_role`

- acceso completo al schema `app`
- pensado para `apps/api`, backfill y operaciones administrativas controladas

## Regla transversal de escritura

Ninguna tabla core de `app` permite escrituras directas desde `authenticated`.

Motivo:

- el boundary oficial es `apps/api`
- todavia faltan comandos transaccionales de dominio
- permitir escrituras directas ahora reabriria el mismo acoplamiento que existe en el legacy

Consecuencia:

- incluso un propietario legitimo no actualiza su fila directamente por SQL cliente
- esas operaciones se resolveran en la fase de comandos/backend

## Superficies publicas seguras

Se aceptan superficies SQL de lectura publica controlada solo cuando:

- la tabla base contiene columnas internas o sensibles
- el producto necesita una proyeccion visible
- la vista puede exponer un subconjunto seguro con filtros estables

Se crean estas vistas:

- `app.public_places_v`
- `app.public_visited_entries_v`
- `app.public_recommendation_posts_v`
- `app.public_profile_stats_v`

Decision importante:

- estas vistas existen precisamente para no abrir tablas base mas de la cuenta
- su definicion debe tratarse como contrato de lectura controlado

## Tabla por tabla

### `app.public_profiles`

Lectura directa:

- `authenticated`: si, todas las filas

Escritura directa:

- `authenticated`: no
- `service_role`: si

Columnas sensibles:

- ninguna columna de esta tabla es sensible por si misma
- aun asi no se considera contrato HTTP automatico

Motivo:

- ya contiene solo perfil publico minimo
- es la unica tabla core cuyo acceso directo completo a lectura resulta aceptable

### `app.private_profiles`

Lectura directa:

- `authenticated`: solo su propia fila

Escritura directa:

- `authenticated`: no
- `service_role`: si

Columnas sensibles:

- toda la tabla es privada salvo el propio usuario via RLS

Motivo:

- separa configuracion y metadatos privados del contrato publico

### `app.places`

Lectura directa:

- `authenticated`: no en tabla base
- lectura permitida via `app.public_places_v`

Escritura directa:

- `authenticated`: no
- `service_role`: si

Columnas sensibles:

- `dedupe_key`

Motivo:

- el lugar canonico es visible, pero la tabla base contiene metadatos internos de deduplicacion
- la proyeccion segura evita exponer decisiones internas de merge

### `app.place_provider_references`

Lectura directa:

- `authenticated`: no

Escritura directa:

- `authenticated`: no
- `service_role`: si

Columnas sensibles:

- `provider_place_id`
- `is_primary`
- toda la relacion proveedor <-> lugar

Motivo:

- es infraestructura de integracion y dedupe
- no forma parte de la superficie publica del producto

### `app.user_place_entries`

Lectura directa:

- `authenticated`: solo sus propias filas
- lectura publica de visitas ajenas: solo via `app.public_visited_entries_v`

Escritura directa:

- `authenticated`: no
- `service_role`: si

Columnas sensibles:

- `visibility` fuera del propietario
- `is_hidden` fuera del propietario
- entradas `wishlist` completas fuera del propietario

Motivo:

- la wishlist es siempre privada
- las visitas publicas existen, pero la tabla base tambien contiene listas privadas y banderas internas

### `app.friendships`

Lectura directa:

- `authenticated`: solo amistades donde participa

Escritura directa:

- `authenticated`: no
- `service_role`: si

Columnas sensibles:

- el grafo social completo

Motivo:

- el grafo social no es publico
- permitir lectura solo del propio usuario mantiene funcionalidad sin exponer la red completa

### `app.recommendation_posts`

Lectura directa:

- `authenticated`: no en tabla base
- lectura publica de posts activos: via `app.public_recommendation_posts_v`

Escritura directa:

- `authenticated`: no
- `service_role`: si

Columnas sensibles:

- `source_entry_id`
- `removed_at`

Motivo:

- las recomendaciones son publicas, pero no toda la fila base debe exponerse
- la entrada origen y el estado de retirada son detalles internos/operativos

### `app.recommendation_reactions`

Lectura directa:

- `authenticated`: solo sus propias reacciones

Escritura directa:

- `authenticated`: no
- `service_role`: si

Columnas sensibles:

- las decisiones de otros usuarios

Motivo:

- la reaccion es una decision privada del viewer
- solo el propio usuario necesita leerla directamente si se usa SQL autenticado

### `app.reputation_events`

Lectura directa:

- `authenticated`: no

Escritura directa:

- `authenticated`: no
- `service_role`: si

Columnas sensibles:

- toda la tabla

Motivo:

- es la fuente de verdad interna de reputacion
- no es una superficie de lectura de producto

### `app.reputation_summaries`

Lectura directa:

- `authenticated`: no en tabla base
- lectura publica visible: via `app.public_profile_stats_v`

Escritura directa:

- `authenticated`: no
- `service_role`: si

Columnas sensibles:

- estado agregado interno

Motivo:

- la reputacion visible si es publica
- la tabla base no debe abrirse directamente porque es un agregado operativo

### `app.public_profile_stats_v`

Lectura directa:

- `authenticated`: si

Escritura directa:

- nadie

Motivo:

- encapsula el agregado publico de stats y reputacion visible
- evita abrir `reputation_summaries`

## Resumen de acceso

| objeto | lectura `authenticated` | escritura `authenticated` | lectura publica segura |
| --- | --- | --- | --- |
| `app.public_profiles` | si | no | tabla directa |
| `app.private_profiles` | solo propia fila | no | no |
| `app.places` | no | no | `app.public_places_v` |
| `app.place_provider_references` | no | no | no |
| `app.user_place_entries` | solo propias filas | no | `app.public_visited_entries_v` |
| `app.friendships` | solo filas propias | no | no |
| `app.recommendation_posts` | no | no | `app.public_recommendation_posts_v` |
| `app.recommendation_reactions` | solo propias filas | no | no |
| `app.reputation_events` | no | no | no |
| `app.reputation_summaries` | no | no | `app.public_profile_stats_v` |

## Columnas y datos que no deben exponerse nunca por acceso SQL directo publico

- `app.private_profiles.*`
- `app.places.dedupe_key`
- `app.place_provider_references.*`
- `app.user_place_entries.visibility` fuera del propietario
- `app.user_place_entries.is_hidden` fuera del propietario
- cualquier fila `wishlist` ajena
- `app.recommendation_posts.source_entry_id`
- `app.recommendation_posts.removed_at`
- `app.reputation_events.*`
- `app.reputation_summaries.*`

## Implementacion tecnica cerrada

La implementacion v2 aplica estas decisiones:

- `anon` sin acceso directo al schema `app`
- `authenticated` con `select` explicito solo en tablas y vistas autorizadas
- todas las tablas base core con RLS activada
- politicas de lectura minima:
  - `public_profiles`: todas las filas
  - `private_profiles`: fila propia
  - `user_place_entries`: filas propias
  - `friendships`: filas donde participa
  - `recommendation_reactions`: filas propias
- sin politicas de escritura para `authenticated`
- vistas seguras como superficie publica controlada para lugares, visitas publicas, recomendaciones activas y stats de perfil

## Tradeoffs

### RLS mas estricta que la experiencia legacy

Ventaja:

- evita repetir el error del MVP de exponer tablas como backend de producto

Coste:

- cualquier experimento de cliente directo sobre `app` quedara bloqueado si no pasa por vistas seguras o por `apps/api`

### Vistas publicas con definicion curada

Ventaja:

- permiten mantener tablas base cerradas
- encapsulan bien columnas internas

Coste:

- las vistas pasan a ser una mini-superficie publica y hay que versionarlas con cuidado

### Sin escritura directa ni siquiera para el propio usuario

Ventaja:

- obliga a cerrar la logica de negocio donde toca: comandos backend y transacciones

Coste:

- hasta que exista `apps/api`, el schema v2 no es usable como backend directo desde cliente

## Contradicciones detectadas

### Codigo legacy vs seguridad v2

1. `apps/legacy-web/database.js` sigue hablando directo con Supabase y escribiendo negocio desde cliente.
2. El schema legacy en `public` sigue mucho mas expuesto que `app`.

Estas contradicciones son conocidas y temporales.
No se corrigen en esta fase para no romper el legacy.

### Contratos compartidos vs proyecciones publicas SQL

`packages/contracts/src/recommendations.ts` sigue usando un `RecommendationPostDto` amplio con `sourceEntryId` y `removedAt`.

Eso no invalida este ADR, pero si deja un ajuste pendiente:

- separar DTOs publicos de feed/perfil frente a DTOs internos o del propio autor en la fase de `apps/api`

## Consecuencia practica para la siguiente fase

La fase de comandos/backend debe cerrar:

- como lee y escribe `apps/api` sobre tablas ahora cerradas a cliente
- comandos transaccionales para perfil, user-place, recomendaciones, reacciones y reputacion
- DTOs publicos frente a DTOs propietarios donde hoy aun hay shapes demasiado amplias
- si hace falta alguna vista adicional para lectura segura del backend o del backfill
