# API

Backend oficial del sistema nuevo.

Estado actual:

- existe una primera capa de comandos de aplicacion en `src/commands`
- los comandos ya modelan ownership, validaciones e invariantes del core inicial
- aun no existe runtime HTTP real, wiring de auth ni adaptadores de base de datos

Regla:

- la logica critica nueva debe nacer aqui, no en clientes
- `apps/api` seguira siendo el boundary oficial frente al schema `app`
- mientras no exista runtime real, el legacy sigue funcionando desde `apps/legacy-web`
