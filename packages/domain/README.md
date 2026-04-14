# Domain

Tipos, enums, value objects simples e invariantes puras del dominio v2.

Estado actual:

- modulo inicial implementado para el core v2
- sin acceso a red, base de datos ni repositorios
- alineado con `docs/adr/004-domain-model-v2.md`

Regla:

- aqui vive logica pura y reutilizable
- aqui no vive I/O
- las reglas criticas siguen terminando en backend y base de datos
