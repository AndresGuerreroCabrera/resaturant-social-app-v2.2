# API

Backend oficial del sistema nuevo.

Estado actual:

- existe una primera capa de comandos de aplicacion en `src/commands`
- existe una base asincrona interna en `src/async` para outbox y polling
- los comandos ya modelan ownership, validaciones e invariantes del core inicial
- aun no existe runtime HTTP real, wiring de auth, adaptadores de base de datos ni handlers reales del worker

Regla:

- la logica critica nueva debe nacer aqui, no en clientes
- `apps/api` seguira siendo el boundary oficial frente al schema `app`
- mientras no exista runtime real, el legacy sigue funcionando desde `apps/legacy-web`
