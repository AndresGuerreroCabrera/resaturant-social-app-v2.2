# Mobile

Base real de la app movil nueva en `apps/mobile`.

## Stack fijado

- Expo
- TypeScript
- Expo Router
- React Query
- almacenamiento seguro de sesion
- boundary oficial hacia `apps/api`

## Estructura

- `app/` rutas de Expo Router
- `src/app/` shell, providers y tema
- `src/features/` slices de producto
- `src/api/` cliente HTTP base y cache remota
- `src/config/` entorno

## Estado actual

- scaffold real creado
- navegacion base lista
- auth local base lista con secure storage en nativo
- cliente HTTP autenticado base listo
- primer vertical slice auth/profile operativo en modo stub persistente
- segundo vertical slice de places y listas personales operativo en modo stub persistente
- lectura de perfil publico y privado ya conectada a la mobile data layer
- busqueda de lugar, resolucion de `place`, wishlist, visited y lectura de estados personales ya conectadas a la mobile data layer

## Lo que sigue pendiente

- runtime HTTP real de `apps/api`
- auth real extremo a extremo
- commands y queries conectados a endpoints reales
- slice de recomendaciones/feed apoyado sobre visitas reales
- push, offline y media fuera de alcance por ahora
