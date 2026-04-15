# SQL Migrations v2

## Objetivo

Traducir `adr/005-sql-schema-v2.md` a migraciones SQL versionadas en `supabase/migrations/` sin tocar destructivamente el schema legacy de `public`.

## Migraciones creadas

### 1. `20260414193000_create_app_schema_v2.sql`

Incluye:

- `schema app`
- enums del core inicial
- tablas canonicas
- tabla derivada `reputation_summaries`
- claves foraneas
- unique constraints
- check constraints
- indices criticos
- comentarios puntuales donde aclaran decisiones importantes

### 2. `20260414194000_create_app_public_profile_stats_view.sql`

Incluye:

- vista derivada `app.public_profile_stats_v`

### 3. `20260414200000_configure_app_security_and_rls.sql`

Incluye:

- `grants` y `revokes` del schema `app`
- activacion de RLS en todas las tablas core del schema v2
- politicas de lectura minima para `authenticated`
- cierre de escritura directa para clientes
- vistas seguras:
  - `app.public_places_v`
  - `app.public_visited_entries_v`
  - `app.public_recommendation_posts_v`
- endurecimiento de `app.public_profile_stats_v` como proyeccion publica segura

## Orden

1. aplicar `20260414193000_create_app_schema_v2.sql`
2. aplicar `20260414194000_create_app_public_profile_stats_view.sql`
3. aplicar `20260414200000_configure_app_security_and_rls.sql`

La segunda depende de la primera.
La tercera depende de ambas.

## Como aplicarlas

En local o en el entorno que se use para versionar Supabase:

1. asegurar que el proyecto apunta a la base correcta
2. aplicar migraciones de `supabase/migrations/` en orden versionado
3. verificar que existen:
   - `app.public_profiles`
   - `app.private_profiles`
   - `app.places`
   - `app.place_provider_references`
   - `app.user_place_entries`
   - `app.friendships`
   - `app.recommendation_posts`
   - `app.recommendation_reactions`
   - `app.reputation_events`
   - `app.reputation_summaries`
   - `app.public_profile_stats_v`
   - `app.public_places_v`
   - `app.public_visited_entries_v`
   - `app.public_recommendation_posts_v`
4. verificar que:
   - `anon` no puede leer `app.*`
   - `authenticated` solo puede leer las superficies explicitamente abiertas
   - no existe escritura directa de `authenticated` sobre tablas core

## Conflictos potenciales

### 1. `schema app` preexistente

Si alguien creo manualmente objetos en `app`, la migracion puede fallar por nombres ya ocupados o por diferencias de shape.

### 2. `pgcrypto`

La migracion asume `gen_random_uuid()` y por eso crea `pgcrypto` si no existe.

### 3. Orden canonico de amistades

La tabla `app.friendships` exige que `user_id_a::text < user_id_b::text`.
El backend y cualquier script de backfill deben normalizar antes de insertar.

### 4. Publicacion de recomendaciones

`recommendation_posts` tiene:

- FK compuesta a `user_place_entries`
- unique por `author_user_id + place_id`

Esto protege invariantes, pero hace que el backfill o comandos mal ordenados fallen rapido si no respetan el modelo.

### 5. `public_profile_stats_v`

La vista presupone que `reputation_summaries` existe aunque todavia no tenga datos para todos los usuarios.
Por eso usa `left join` y `coalesce`.

### 6. Acceso SQL directo mas cerrado que en el MVP

La nueva migracion de seguridad cierra por completo la escritura directa del schema `app` para `authenticated`.
Esto es deliberado y coherente con el boundary `apps/api`, pero puede sorprender si alguien intenta usar v2 como si fuera el schema legacy.

### 7. Vistas publicas seguras

`app.public_places_v`, `app.public_visited_entries_v`, `app.public_recommendation_posts_v` y `app.public_profile_stats_v` pasan a ser la superficie SQL de lectura publica controlada.
Si se cambia su shape, hay que tratarlo como cambio de contrato de lectura.

## Que quedo fuera deliberadamente

- baseline del schema legacy `public`
- triggers para `updated_at`
- funciones SQL de comandos de dominio
- enforcement SQL final del limite semanal de recomendaciones
- media assets
- notifications y push
- feed materializado

## Que sigue fuera tras esta fase

- politicas mas finas de escritura a traves de JWT de usuario
- tablas o vistas adicionales para admin/moderacion
- funciones SQL de comandos transaccionales
- baseline del schema legacy `public`

## Notas de aplicacion

- estas migraciones no alteran ni borran tablas legacy en `public`
- el legacy sigue vivo y funcional en paralelo
- el schema v2 ya queda protegido por RLS y grants conservadores
- `apps/api` debera operar sobre tablas cerradas a cliente o sobre vistas seguras, segun el caso

## Siguiente paso recomendado

1. cablear el runtime real de `apps/api` sobre la capa de comandos ya implementada
2. implementar adaptadores de persistencia y transaccion para `schema app`
3. decidir si alguna garantia adicional conviene como funcion SQL puntual
4. preparar el baseline legacy y el plan de backfill
