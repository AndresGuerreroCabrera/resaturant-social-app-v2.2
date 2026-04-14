# Contracts

Contratos compartidos entre `apps/api` y `apps/mobile`.

Estado actual:

- modulo inicial implementado para el core v2
- validaciones con Zod para commands, queries y responses
- alineado con `docs/adr/004-domain-model-v2.md`

Regla:

- aqui iran los contratos del sistema nuevo
- no usar el schema legacy ni `database.js` como contrato futuro
- aqui no vive acceso a red, base de datos ni logica de UI
