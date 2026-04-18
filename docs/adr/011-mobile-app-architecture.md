# ADR 011 - Mobile App Architecture

## Estado

Accepted

## Relacion con otros ADRs

Este ADR aplica al frontend estrategico las decisiones ya cerradas en:

- `003-migration-architecture.md`
- `004-domain-model-v2.md`
- `006-security-and-rls.md`
- `007-backend-commands.md`
- `010-cutover-strategy.md`

No cambia el boundary oficial.
Lo respeta.

## Objetivo

Definir la arquitectura interna de `apps/mobile` para que la nueva app nazca:

- separada del legacy
- alineada con `apps/api`
- preparada para crecer sin mezclar UI, dominio y acceso a datos

## Decision principal

`apps/mobile` se implementa como una app Expo + TypeScript + Expo Router.

Su rol es:

- ser el frontend movil estrategico
- consumir contratos compartidos de `@savory/contracts`
- usar `apps/api` como unico boundary
- mantener en cliente solo UI, estado local, cache remota y sesion

## Estructura decidida

```text
apps/mobile/
  app/
    _layout.tsx
    index.tsx
    +not-found.tsx
    (auth)/
    (app)/
  src/
    app/
      providers/
      ui/
      theme.ts
    api/
      backend/
      http-client.ts
      query-client.ts
      use-api-client.ts
    config/
      env.ts
    features/
      auth/
      feed/
      profile/
      recommendations/
  app.config.ts
  babel.config.js
  metro.config.js
  tsconfig.json
```

## Navegacion

Se adopta Expo Router con dos grupos principales:

- `(auth)` para entrada y bootstrap de sesion
- `(app)` para la shell autenticada

La shell autenticada usa tabs ligeras:

- `home`
- `recommendations`
- `profile`

Decision cerrada:

- la navegacion no replica pantallas ni convenciones del legacy HTML
- el flujo arranca desde una raiz que decide segun estado de sesion local

## State management

Se adopta una combinacion deliberadamente simple:

- React Query para estado remoto
- React Context para sesion/auth local
- estado de pantalla o formulario con `useState`

Decision cerrada:

- no se introduce Redux, Zustand ni otra capa global adicional en esta fase
- el cliente no reimplementa invariantes de negocio

## Sesion y almacenamiento

La sesion base del cliente se modela como un token de API local.

Se guarda asi:

- `expo-secure-store` en nativo
- `localStorage` como fallback en web

Decision cerrada:

- la app movil no habla directo con tablas Supabase
- la sesion del cliente se prepara para autenticar requests contra `apps/api`

## Cliente HTTP y relacion con `apps/api`

El cliente base vive en `src/api/http-client.ts`.

Responsabilidades:

- resolver `EXPO_PUBLIC_API_BASE_URL`
- adjuntar bearer token si existe
- validar respuestas con esquemas compartidos
- fallar de forma explicita cuando el runtime real aun no existe

Decision cerrada:

- `apps/mobile` no incorpora SDKs de acceso directo al schema `app`
- todo acceso futuro de negocio pasa por `apps/api`

## Capa compartida de data access

Sobre el cliente HTTP base se monta una capa compartida en:

- `src/api/backend/`

Su responsabilidad es:

- separar queries y commands
- encapsular adapters temporales
- validar payloads con contratos compartidos
- desacoplar las features del detalle temporal `stub | http`

El detalle de esta capa se fija en `adr/012-mobile-data-access.md`.

## Relacion con `@savory/contracts` y `@savory/domain`

La app usa los paquetes compartidos para:

- DTOs tipados
- reglas publicas ya cerradas
- shapes de feed, perfil y recomendaciones

Esto evita:

- tipos duplicados en cliente
- nombres inconsistentes con backend
- reconstruir en UI reglas ya fijadas en ADRs

## Query side inicial

Mientras `apps/api` no tenga runtime HTTP completo:

- las queries de ejemplo viven en modo stub
- las respuestas stub siguen validandose contra `@savory/contracts`
- si se configura `EXPO_PUBLIC_API_BASE_URL`, las pantallas dejan de fingir integracion y muestran claramente que el runtime aun falta

Decision cerrada:

- mejor un stub explicito y tipado que una falsa integracion contra endpoints inexistentes

## Configuracion de entorno

La configuracion vive en:

- `app.config.ts`
- `src/config/env.ts`

Valores iniciales:

- `EXPO_PUBLIC_APP_ENV`
- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_MOBILE_BACKEND_MODE`
- `EXPO_PUBLIC_ENABLE_STUB_SESSION`

## Monorepo y consumo de paquetes workspace

`apps/mobile` queda preparada para consumir `@savory/contracts` y
`@savory/domain` dentro del monorepo mediante:

- `tsconfig.json` alineado con la raiz
- `metro.config.js` para resolver workspaces en Expo

## Lo que queda stubbed o pendiente

En esta fase quedan intencionalmente pendientes:

- auth real extremo a extremo
- endpoints HTTP reales de `apps/api`
- mutaciones de negocio
- query side real para feed, profile, places y user-place
- offline real
- push notifications
- media upload

## Tradeoffs

### Expo Router desde el inicio

Ventaja:

- deja clara la navegacion y evita reescritura futura de la shell

Coste:

- obliga a resolver ya la estructura del app shell

### React Query + Context

Ventaja:

- suficiente para el alcance actual
- evita meter infraestructura de estado global antes de necesitarla

Coste:

- algunas capas podran moverse cuando haya offline o sincronizacion real

## Fuera de alcance

- cerrar la experiencia visual final del producto
- integrar el runtime real de `apps/api`
- meter logica critica de dominio en cliente
- reusar patrones de UI o flujo del legacy
