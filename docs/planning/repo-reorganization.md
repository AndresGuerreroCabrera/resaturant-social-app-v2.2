# Repo Reorganization

## Objetivo

Aislar la app web actual como legado en `apps/legacy-web` sin reescribir su interior, manteniendo sus rutas relativas internas y reduciendo al minimo el riesgo de rotura.

## Fuente de verdad revisada antes de ejecutar

- `docs/adr/001-migration-strategy.md`
- `docs/planning/migration-phases.md`

No existian documentos en `docs/cutover/` al iniciar esta fase.

## Contradicciones detectadas antes de ejecutar

### Documentacion vs repositorio

1. La documentacion ya fijaba `apps/legacy-web` como destino del legacy, pero el codigo seguia en un repositorio plano en la raiz.
2. La documentacion ya fijaba `apps/api` como boundary oficial del sistema, pero el codigo actual sigue llamando a Supabase directamente desde navegador.

### Estado tras esta fase

1. La contradiccion de estructura queda resuelta: el legacy ya vive en `apps/legacy-web`.
2. La contradiccion de boundary sigue viva de forma intencional y documentada: no se toca en esta fase para no romper el legacy. Se resolvera en fases 4 a 6.

## Estructura anterior

```text
/
  auth.html
  auth.js
  database.js
  deseados.html
  deseados.js
  friend-list.html
  friend-list.js
  index.html
  lista.html
  lista.js
  profile.html
  profile.js
  recommendations.html
  recommendations.js
  script.js
  styles.css
  supabase-schema.sql
  vercel-analytics.js
  docs/
```

## Estructura nueva

```text
/
  apps/
    legacy-web/
      auth.html
      auth.js
      database.js
      deseados.html
      deseados.js
      friend-list.html
      friend-list.js
      index.html
      lista.html
      lista.js
      profile.html
      profile.js
      recommendations.html
      recommendations.js
      script.js
      styles.css
      supabase-schema.sql
      vercel-analytics.js
  docs/
    adr/
    planning/
  .gitignore
  package.json
  pnpm-workspace.yaml
  vercel.json
```

## Que se movio

- `auth.html`
- `auth.js`
- `database.js`
- `deseados.html`
- `deseados.js`
- `friend-list.html`
- `friend-list.js`
- `index.html`
- `lista.html`
- `lista.js`
- `profile.html`
- `profile.js`
- `recommendations.html`
- `recommendations.js`
- `script.js`
- `styles.css`
- `supabase-schema.sql`
- `vercel-analytics.js`

## Ajustes minimos realizados

- Se creo `package.json` minimo en la raiz para formalizar el repo.
- Se creo `pnpm-workspace.yaml` con `apps/*` y `packages/*`.
- Se creo `.gitignore` minimo de trabajo.
- Se creo `vercel.json` con rewrites explicitos para mantener las URLs legacy publicas apuntando a `apps/legacy-web/*` sin tocar los enlaces internos del proyecto.

## Que no se toco

- No se modifico la logica interna de `database.js`, `script.js` ni del resto de JS legacy.
- No se cambiaron nombres de paginas, scripts o assets.
- No se refactorizo CSS ni HTML.
- No se introdujo backend v2.
- No se introdujo React Native / Expo.
- No se limpio deuda tecnica heredada.
- No se arreglo todavia el boundary frontend -> Supabase.

## Riesgos

1. El mayor riesgo esta en el despliegue estatico y los rewrites, no en la logica de negocio.
2. `vercel.json` preserva rutas conocidas del legacy, pero requiere validacion manual real en entorno de despliegue.
3. Si existia alguna automatizacion externa que asumiera que los archivos estaban en la raiz del repo, habra que actualizarla.
4. `supabase-schema.sql` ya no queda servido desde la raiz publica por defecto; esto mejora exposicion, pero cambia su ubicacion en el repositorio.

## Checklist manual de validacion

- Abrir `/` y comprobar que carga `index.html` del legacy.
- Abrir `auth.html`, `lista.html`, `deseados.html`, `recommendations.html`, `profile.html` y `friend-list.html`.
- Confirmar que cargan `styles.css`, `script.js`, `database.js` y los scripts de pagina desde la nueva ubicacion.
- Confirmar que la navegacion entre paginas sigue usando las URLs legacy esperadas.
- Confirmar que el mapa y Google Places siguen cargando desde `index.html`.
- Confirmar que Vercel Analytics no queda interceptado por rewrites del legacy.
- Confirmar que abrir directamente `apps/legacy-web/index.html` en entorno local sigue funcionando como app estatica.

## Estado de la fase

La reorganizacion minima del repositorio para aislar el legacy queda ejecutada a nivel de estructura y documentacion. La validacion funcional final queda como checklist manual posterior.
