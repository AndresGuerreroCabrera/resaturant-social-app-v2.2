# ADR 004 - Domain Model v2

## Estado

Accepted

## Relacion con otros ADRs

Este ADR desarrolla las decisiones ya fijadas en:

- `001-migration-strategy.md`
- `002-repo-structure.md`
- `003-migration-architecture.md`

No cambia el boundary, la privacidad base, el limite semanal de recomendaciones, la amistad simetrica ni el uso de `apps/api`.
Su objetivo es cerrar el modelo de dominio antes de disenar el schema SQL v2.

## Objetivo

Definir el modelo de dominio correcto para el sistema nuevo y dejar claro:

- que entidades son canonicas
- que entidades son derivadas o materializadas
- que invariantes de negocio deben sobrevivir al paso a SQL
- que queda dentro del core inicial y que se difiere

## Fuera de alcance

Este ADR no define todavia:

- el schema SQL final
- nombres de columnas o tablas definitivos
- funciones SQL, RPC o handlers backend completos
- indices, RLS o triggers concretos
- contratos HTTP finales

## Decision principal

El modelo oficial de relacion usuario-lugar en v2 sera **unificado**.

La entidad canonica sera `user_place_entries`, no tablas separadas de `wishlist_items` y `visits`.

### Justificacion

#### Simplicidad

- evita duplicar el mismo concepto en dos tablas distintas
- elimina la necesidad de mover filas entre tablas al pasar de wishlist a visited
- reduce comandos especiales de migracion y reconciliacion

#### Integridad

- fuerza una sola relacion activa por `user + place`
- evita estados inconsistentes como tener el mismo lugar repetido en varias listas con semanticas cruzadas
- simplifica la regla "si ya existe una visita, no se crea una wishlist duplicada"

#### Backfill

- el legado actual tiene `restaurants` y `desired_restaurants`
- ambas tablas se pueden proyectar a una sola entidad `user_place_entries`
- la deduplicacion por `user + place` es un problema visible y controlable durante la migracion

#### Queries

- wishlist y visited pasan a ser vistas de estado, no tablas distintas
- simplifica lecturas por usuario, por lugar y por perfil publico
- simplifica los efectos laterales de aceptar recomendaciones

#### Escalabilidad futura

- permite anadir historial de visitas o listas curadas sin romper el modelo base
- permite materializar vistas o contadores sin rehacer la entidad canonica

## Vista de dominio

### Identidad

La identidad primaria del usuario sigue viniendo de Supabase Auth.
El dominio no reimplementa identidad.

El usuario de producto se apoya en ese `auth user id`, pero separa:

- perfil publico
- configuracion y datos privados

## Entidades canonicas del core inicial

### 1. PublicProfile

Representa la identidad publica del usuario dentro del producto.

Responsabilidades:

- handle o username publico
- display data publica
- avatar visible
- metadatos publicos minimos del perfil

No debe contener:

- email
- tokens
- configuracion privada
- preferencias operativas

### 2. PrivateProfile

Representa datos privados y de configuracion del usuario.

Responsabilidades:

- preferencias privadas del producto
- configuraciones de notificacion
- flags de onboarding o estado operativo privado
- referencias privadas necesarias para el funcionamiento interno

No forma parte del contrato publico.

### 3. Place

Es la entidad canonica del lugar.

Responsabilidades:

- identificar un restaurante o local de forma estable en el dominio
- desacoplar el modelo interno del identificador externo del proveedor
- concentrar metadatos estructurales del lugar

Decisiones de modelado:

- el `place` canonico tendra identificador interno propio
- los ids externos de proveedor viven como referencia del lugar, no como identidad final del dominio
- en la primera ola puede existir un proveedor principal, pero el modelo no debe quedar acoplado para siempre a Google Places

### 4. UserPlaceEntry

Es la relacion canonica entre un usuario y un lugar.

Responsabilidades:

- representar si ese usuario quiere ir o ya ha ido
- almacenar metadatos personales del usuario sobre ese lugar
- controlar la visibilidad de una visita
- servir como base para publicar una recomendacion

Estado oficial:

- `wishlist`
- `visited`

Decisiones cerradas:

- `hidden` no es un tercer estado principal
- `hidden` tampoco justifica otra tabla para el core inicial
- la entidad oficial sigue siendo una sola fila activa por `user + place`
- en tipos y contratos compartidos se modela como ocultacion separada del `status`

### 5. Friendship

Representa la relacion social simetrica entre dos usuarios.

Responsabilidades:

- modelar amistad aceptada y activa
- soportar consultas de red propia
- permitir futuras lecturas y ranking social sin exponer el grafo completo

Decisiones cerradas:

- amistad simetrica
- una sola relacion canonica por pareja
- sin `follow`
- sin `request/accept` en v2 inicial

### 6. RecommendationPost

Representa la publicacion social de una recomendacion.

Responsabilidades:

- publicar una recomendacion visible para otros usuarios
- referenciar el lugar y la entrada visitada que la origina
- capturar el contenido publico publicado por el autor
- servir de base para el feed y para reputacion

Decision importante:

La recomendacion es una publicacion propia del dominio social.
No es solo una vista viva de `user_place_entries`.

Por tanto:

- referencia la entrada visitada que la origina
- pero conserva un snapshot publicado del contenido relevante
- esto evita que cambios posteriores en la entrada personal reescriban la historia social del post

### 7. RecommendationReaction

Representa la decision persistida de un usuario sobre una recomendacion social.

Valores oficiales:

- `accepted`
- `rejected`

Responsabilidades:

- registrar una unica decision por usuario y recomendacion
- sacar del feed lo ya decidido
- disparar efectos laterales de wishlist y reputacion cuando corresponda

Decision importante:

Las reacciones canonicas del backend v2 son solo de usuarios autenticados.

Si en cliente existe algun comportamiento de "swipe guest", sera estado efimero de UI y no dominio persistido.

### 8. ReputationEvent

Es la fuente de verdad canonica de la reputacion.

Responsabilidades:

- registrar que una aceptacion valida genero impacto de reputacion
- permitir recomputar score y contadores
- desacoplar la logica de reputacion del agregado materializado

Decision cerrada:

- la reputacion se basa en eventos
- el score visible se materializa aparte

## Entidades derivadas o materializadas del core inicial

### 1. System Lists

No son entidades canonicas separadas.

Se derivan de `user_place_entries`:

- wishlist = entries con `status = wishlist` y no ocultas
- visited = entries con `status = visited` y no ocultas
- hidden = entries ocultas para la vista por defecto

### 2. PublicProfileStats

Agregado materializado o derivado para lectura rapida.

Ejemplos:

- numero de visitas publicas
- numero de recomendaciones aceptadas
- reputacion actual
- nivel visible de expertise

### 3. ReputationSummary

Materializacion del estado actual de reputacion.

Puede incluir:

- score actual
- accepted recommendation count
- nivel visible
- progreso al siguiente nivel

El score visible no es la fuente de verdad.
La fuente de verdad son los eventos.

### 4. RecommendationFeedItem

No es entidad canonica del core inicial.
Es una proyeccion de lectura.

Se deriva de:

- `RecommendationPost`
- `PublicProfile`
- `Place`
- estado de reaccion del viewer
- reglas de visibilidad y filtrado

### 5. RecommendationCycleKey

No es entidad de dominio separada.
Es una clave temporal derivada o materializada para enforcement y reporting.

Se define por:

- semana ISO
- timezone `Europe/Madrid`

## Modulos deliberadamente diferidos

### 1. Custom User Lists

Las listas personalizadas del usuario no forman parte del core inicial.

Si el producto las necesita mas adelante, deberan modelarse aparte como:

- `UserCollection`
- `UserCollectionItem`

No deben reutilizar `user_place_entries.status` para ese fin.

### 2. Generic Activity Stream

El feed inicial no necesita una entidad generica de actividad.

Decision:

- el feed inicial sera una proyeccion derivada de recomendaciones publicas
- un `ActivityEvent` generico queda diferido

### 3. Media Assets

El modulo de media existe conceptualmente, pero no entra en el core inicial salvo que la fase movil o social lo requiera.

Modelo previsto cuando se active:

- `MediaAsset` como metadata canonica del asset gestionado por el sistema
- `MediaAttachment` como relacion entre asset y entidad de dominio

Sujetos tipicos de attachment:

- perfil
- recomendacion
- user place entry
- lugar

Decision de alcance:

- los avatares preset actuales pueden seguir fuera de un sistema generico de media
- un sistema completo de uploads y media se difiere

### 4. Notifications y Push

No entran en el core inicial del schema v2.

Modelo previsto cuando se active:

- `PushDeviceToken` como entidad canonica privada por usuario/dispositivo
- `NotificationPreference` como configuracion privada
- `UserNotification` o `NotificationDelivery` como registro operativo o inbox

Decision de alcance:

- se reserva el modulo
- se difiere su implementacion real hasta una fase posterior

## Relaciones principales

### Identidad y perfiles

- un `Auth User` tiene exactamente un `PublicProfile`
- un `Auth User` tiene exactamente un `PrivateProfile`

### Lugar y entradas personales

- un `Place` puede tener muchas `UserPlaceEntry`
- un usuario puede tener muchas `UserPlaceEntry`
- cada `UserPlaceEntry` pertenece a exactamente un usuario y un lugar

### Recomendaciones

- un `RecommendationPost` pertenece a un autor
- un `RecommendationPost` pertenece a un `Place`
- un `RecommendationPost` se origina en una `UserPlaceEntry` visitada y publica del mismo autor
- una `RecommendationPost` puede tener muchas `RecommendationReaction`

### Reacciones y reputacion

- una `RecommendationReaction` pertenece a un viewer y a una recomendacion
- una aceptacion valida puede generar exactamente un `ReputationEvent`
- un `ReputationEvent` impacta sobre el autor de la recomendacion

### Social

- una `Friendship` une a exactamente dos usuarios
- la pareja es simetrica y canonica

## Invariantes de negocio

### PublicProfile / PrivateProfile

1. Los campos privados no se exponen en el perfil publico.
2. `auth_email` y metadatos sensibles no forman parte del contrato publico.

### Place

1. El lugar canonico tiene identidad interna del dominio.
2. Las referencias externas de proveedor no deben convertirse en el contrato final del sistema.
3. La deduplicacion de lugares es problema del dominio y del schema, no del cliente.

### UserPlaceEntry

1. Existe como mucho una entrada activa por `user + place`.
2. Los estados oficiales son solo `wishlist` y `visited`.
3. `hidden` no se modela como tercer estado principal.
4. La wishlist es siempre privada.
5. Una visita puede ser publica o privada.
6. Se permite crear directamente una visita o una wishlist.
7. La transicion normal permitida es `wishlist -> visited`.
8. `visited -> wishlist` no forma parte del flujo normal; solo seria una correccion explicita si se habilita mas adelante.
9. Los metadatos personales del usuario pertenecen a la entrada del usuario, no al lugar canonico.
10. Aceptar una recomendacion no debe sobrescribir con contenido ajeno los campos personales del usuario.

### Wishlist / Visited / Hidden / Listas

1. Wishlist y visited son vistas de estado sobre `UserPlaceEntry`.
2. Hidden es una regla de ocultacion de lectura, no otra tabla principal del core.
3. Las listas personalizadas de usuario se difieren y no alteran el modelo oficial de `UserPlaceEntry`.

### RecommendationPost

1. Solo puede nacer desde una `UserPlaceEntry` del autor con `status = visited`.
2. La entrada origen debe ser publica y no estar oculta en el momento de publicar.
3. Un autor no puede duplicar el mismo `place` en varias recomendaciones del core inicial.
4. El limite es de 3 publicaciones creadas por usuario y semana ISO en `Europe/Madrid`.
5. El limite semanal cuenta creaciones de `RecommendationPost`, no recomendaciones activas restantes.
6. Borrar o retirar un post no devuelve cuota en ese mismo ciclo.
7. La publicacion social conserva su snapshot publicado.

### RecommendationReaction

1. Solo usuarios autenticados pueden crear reacciones canonicas en backend.
2. El autor no puede reaccionar a su propia recomendacion.
3. Solo se permite una reaccion persistida por `user + recommendation`.
4. La reaccion del core inicial es inmutable una vez persistida.
5. `accepted` crea o reutiliza una wishlist privada si el viewer no tiene ya una entrada para ese lugar.
6. Si el viewer ya tiene una entrada `visited`, la aceptacion no crea duplicados ni degrada la visita a wishlist.
7. `rejected` no crea ninguna entrada de usuario-lugar.
8. Tanto `accepted` como `rejected` eliminan ese post de futuras lecturas del feed para ese viewer.

### ReputationEvent

1. Solo una aceptacion valida de otro usuario puede generar reputacion.
2. Un rechazo no cambia reputacion.
3. Una autoaceptacion no existe.
4. Cada aceptacion valida genera como maximo un evento de reputacion.
5. El agregado visible de reputacion debe poder recomputarse desde eventos.

### Friendship

1. La amistad es simetrica.
2. Existe una sola relacion canonica por pareja.
3. No hay amistad con uno mismo.
4. El grafo social no es publico por defecto.

## Canonico vs derivado

### Canonico en el core inicial

- `PublicProfile`
- `PrivateProfile`
- `Place`
- referencias externas de `Place`
- `UserPlaceEntry`
- `Friendship`
- `RecommendationPost`
- `RecommendationReaction`
- `ReputationEvent`

### Derivado o materializado en el core inicial

- system lists (`wishlist`, `visited`, `hidden`)
- `PublicProfileStats`
- `ReputationSummary`
- nivel visible de expertise
- `RecommendationFeedItem`
- `RecommendationCycleKey`

### Diferido

- `UserCollection`
- `UserCollectionItem`
- `MediaAsset`
- `MediaAttachment`
- `PushDeviceToken`
- `NotificationPreference`
- `UserNotification`
- `NotificationDelivery`
- `ActivityEvent` generico

## Tradeoffs principales

### Unificar `user_place_entries`

Ventajas:

- menos duplicacion
- mejor integridad
- mejor backfill
- comandos mas simples

Coste:

- algunos atributos solo tienen sentido en `visited`
- se resuelve con invariantes y campos opcionales, no con tablas separadas

### Recomendacion como entidad social propia

Ventajas:

- preserva la historia social publicada
- evita que editar una entrada personal reescriba el feed pasado
- facilita reputacion y moderacion

Coste:

- obliga a decidir que campos se snapshotean
- anade una capa propia respecto a la entrada visitada

### Feed como proyeccion, no como entidad canonica

Ventajas:

- evita overengineering
- mantiene el dominio minimo
- deja libertad para ranking futuro

Coste:

- el schema SQL debera decidir si basta con query o conviene materializar

## Core inicial vs posterior

### Core inicial de dominio

- perfiles publicos y privados
- lugares canonicos
- relacion usuario-lugar unificada
- sistema de wishlist y visited
- recomendaciones sociales semanales
- reacciones aceptadas/rechazadas
- reputacion basada en eventos
- amistad simetrica
- feed derivado de recomendaciones publicas

### Posterior o diferido

- listas personalizadas
- uploads y media generica
- notificaciones y push
- activity stream generico
- comentarios, likes u otras interacciones no cerradas
- funcionalidades avanzadas de discovery y ranking

## Contradicciones detectadas al disenar el dominio

### Codigo vs documentacion

1. El codigo legacy sigue usando tablas separadas (`restaurants` y `desired_restaurants`), mientras que el dominio v2 oficial fija `UserPlaceEntry` unificado.
2. El codigo legacy copia datos de recomendaciones aceptadas dentro de la lista deseada; el dominio v2 decide que la informacion personal del usuario no debe sobrescribirse con opinion ajena.
3. El codigo legacy permite reacciones guest en `localStorage`; el dominio backend v2 solo reconoce reacciones persistidas de usuarios autenticados.
4. El codigo legacy publica recomendaciones directamente desde el cliente; el dominio v2 fija que esa regla vivira en `apps/api` y base de datos.

### Documentacion vs documentacion

No se detecta contradiccion nueva con ADR 001, ADR 002 o ADR 003.
Este ADR los desarrolla sin revertir decisiones cerradas.

## Consecuencia practica para la siguiente fase

La fase de diseno SQL v2 debe partir de este modelo y cerrar:

- nombres finales de entidades y tablas
- enums, constraints y claves unicas
- estrategia concreta de deduplicacion de `Place`
- forma exacta de modelar referencias externas de proveedor
- snapshot exacto de `RecommendationPost`
- forma concreta de materializar reputacion y feed
- estrategia de ocultacion (`hidden`) a nivel de schema
- si alguna parte diferida debe adelantarse por necesidades de la app movil
