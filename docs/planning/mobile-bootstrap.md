# Mobile Bootstrap

## Objetivo de esta fase

Dejar `apps/mobile` como una app Expo real, limpia y lista para crecer sin
esperar a que `apps/api` este 100% operativo.

## Lo que se anadio

- `app.config.ts` para entorno y configuracion Expo
- `babel.config.js`
- `metro.config.js` preparado para monorepo
- `tsconfig.json`
- rutas base con Expo Router
- shell autenticada con tabs
- React Query como capa remota
- almacenamiento de sesion con secure storage en nativo
- cliente HTTP autenticado base
- pantallas y queries iniciales en modo stub tipado
- capa compartida `src/api/backend/` con adapters `stub | http`, query keys y separacion query/command
- primer vertical slice auth/profile con onboarding minimo y lectura publica/privada

## Como queda organizada la app

- `app/` contiene rutas y grupos de navegacion
- `app/(onboarding)/` contiene el gate y formulario minimo de perfil
- `src/app/` contiene providers, tema y componentes de shell
- `src/api/` contiene acceso a datos y cache
- `src/api/backend/` contiene la capa compartida de data access
- `src/features/` separa slices funcionales
- `src/config/` resuelve entorno

## Como usar el workspace

Pasos previstos cuando se instalen dependencias:

1. instalar dependencias del workspace con `pnpm install`
2. arrancar la app con `pnpm --filter @savory/mobile dev`
3. configurar si hace falta:
   - `EXPO_PUBLIC_APP_ENV`
   - `EXPO_PUBLIC_API_BASE_URL`
   - `EXPO_PUBLIC_MOBILE_BACKEND_MODE`
   - `EXPO_PUBLIC_ENABLE_STUB_SESSION`

## Que cubre hoy

- navegacion base
- restauracion de sesion local
- boundary claro hacia `apps/api`
- slice auth/profile operativo en modo stub persistente
- ejemplos tipados de feed y perfil
- base de tema y shell movil
- data layer compartida para queries y commands

## Que sigue pendiente

- runtime HTTP real de `apps/api`
- auth real y refresh de token
- endpoints y hooks reales para commands/queries
- estrategia de errores remotos por endpoint
- soporte offline
- push notifications
- media

## Carpetas o piezas que siguen siendo preparacion

- `src/api/backend/stubs/` contiene los stubs temporales reales
- `src/features/recommendations/` es descriptiva, no interactiva
- la sesion actual es bootstrap tecnico, no login final de producto
- el onboarding y perfil actual dependen del adapter `stub`, no de transporte HTTP real

## Validacion manual recomendada

- la app arranca en Expo Router
- la raiz redirige a `(auth)` si no hay sesion
- al guardar una sesion local en modo stub, la app pasa por onboarding y luego abre la shell autenticada
- `profile.tsx` muestra owner profile y permite abrir la vista publica
- las tabs navegan sin depender del legacy
- las queries muestran stubs o errores claros, no integraciones falsas
