# Mobile Slice - Auth And Profile

## Alcance

Este slice deja operativo en `apps/mobile` el primer flujo funcional sobre la
arquitectura v2 actual:

- bootstrap de sesion local
- sesion persistente
- onboarding minimo
- lectura de perfil propio
- lectura de perfil publico

No cambia el boundary oficial.

El cliente sigue hablando solo con la mobile data layer, preparada para
conectarse despues a `apps/api`.

## Pantallas incluidas

- `app/(auth)/sign-in.tsx`
- `app/(onboarding)/profile-setup.tsx`
- `app/(app)/profile.tsx`
- `app/(app)/profiles/[userId].tsx`

## Flujos cubiertos

### 1. Bootstrap de sesion

- si no hay sesion local, la raiz entra por `(auth)`
- en modo `stub`, la app puede generar un token local de desarrollo
- la sesion se persiste con secure storage en nativo y `localStorage` en web

### 2. Gate auth -> onboarding -> shell

- con sesion restaurada, mobile consulta `getMyProfile`
- si `onboardingCompletedAt` es `null`, redirige a `(onboarding)`
- si ya existe onboarding completado, entra a `(app)`

### 3. Onboarding minimo

- el formulario usa `createOrUpdateProfile`
- en esta fase el comando funciona solo en adapter `stub`
- al completar onboarding:
  - actualiza perfil publico
  - marca `onboardingCompletedAt`
  - invalida/refresca `getMyProfile`
  - habilita entrada a la shell autenticada

### 4. Perfil propio

- `profile.tsx` consume `getMyProfile`
- separa snapshot privado del owner y snapshot publico derivado
- permite refresco manual y abrir la vista publica del mismo usuario

### 5. Perfil publico

- `profiles/[userId].tsx` consume `getPublicProfile`
- desde la home se puede abrir el perfil publico del autor de una recomendacion
- desde `profile.tsx` se puede abrir la version publica del perfil propio

## Dependencias de este slice

- `ADR 011` para la estructura movil
- `ADR 012` para la data layer compartida
- `AuthSessionProvider` y `auth-storage.ts`
- `src/api/backend/` con adapters `stub | http`
- `@savory/contracts` y `@savory/domain`

## Lo que ya es operativo

- restauracion de sesion local
- generacion de sesion stub de desarrollo
- gate de onboarding basado en `getMyProfile`
- store persistente de perfiles stub por `userId`
- query de perfil publico
- command de actualizacion de perfil en modo `stub`
- invalidacion y refresco basico tras onboarding

## Lo que sigue stubbed

- auth extremo a extremo
- validacion real de JWT
- transporte HTTP real hacia `apps/api`
- `getMyProfile` y `getPublicProfile` sobre red
- `createOrUpdateProfile` sobre runtime real

## Lo que sigue pendiente del runtime real

- login real y refresh token
- actor context del backend
- endpoints HTTP de perfil
- manejo de errores remotos definitivo
- tests end-to-end de este slice sobre `apps/api`

## Limitaciones actuales

- el modo realmente operativo hoy es `EXPO_PUBLIC_MOBILE_BACKEND_MODE=stub`
- el adapter `http` sigue fallando de forma explicita porque no existen rutas reales
- el perfil owner y el perfil publico se simulan desde un store local tipado, no desde Postgres
- no hay aun edicion de avatar, media ni listas personales

## Riesgos actuales

- la sesion movil sigue siendo bootstrap tecnico, no autenticacion final
- el slice puede parecer mas completo de lo que realmente es si no se deja claro que depende del adapter `stub`
- sin runtime real no puede validarse todavia la compatibilidad final entre mobile y `apps/api`
