<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Reglas del proyecto

Referencia completa: `README.md`.

## Comentarios

**No agregues comentarios.** No queremos comentarios generados por IA en el código. Escribí código
que se lea solo. Un comentario corto se justifica únicamente cuando explica un *por qué* que no se
puede leer en el código; nunca describas *qué* hace una línea, y nunca comentarios de varias líneas.
No borres los comentarios que ya existen si no estás tocando ese código.

## Estilo de código

- Todo en **inglés**: variables, funciones, tipos, nombres de archivo, strings internos, mensajes de
  commit, títulos de PR y nombres de rama.
- Funciones y métodos: `camelCase` (`getUserById`).
- Variables: `camelCase` (`userId`).
- Constantes: `MAYUSCULAS_CON_UNDERSCORE` (`MAX_RETRIES`).
- Archivos: `kebab-case` (`project-carousel.tsx`). El componente exportado sigue en
  `PascalCase`; los archivos especiales de Next (`page.tsx`, `layout.tsx`) los fija el framework.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/) — release-please los lee para armar la
versión y el CHANGELOG.

```
<tipo>(<scope opcional>): <descripción en inglés, minúscula, imperativo, sin punto final>
```

Tipos: `feat` (minor), `fix`/`perf` (patch), `refactor`, `docs`, `test`, `chore`, `style` (ninguno).
Breaking change: `feat(api)!: ...` o footer `BREAKING CHANGE: ...` (major).

No agregues `Co-Authored-By` ni menciones de IA en los mensajes de commit.

## Ramas

`<tipo>/<descripcion-corta-en-kebab-case>` — por ejemplo `feat/google-login`. Se parte siempre
de `development` actualizado.

## Pull Requests

El título de la PR sigue exactamente las mismas reglas que un commit: las PRs a `development` se
mergean con squash, así que el título es lo único que sobrevive en el historial. Un check
(`Conventional commit`) lo valida y bloquea el merge.

Para mergear hacen falta 2 approvals de otras personas, el check en verde, todas las conversaciones
resueltas y la rama actualizada respecto de la base (`rebase` + `push --force-with-lease`). Los
approvals se invalidan al pushear commits nuevos.

## Promoción de ramas

```
feature/*  →  development  →  staging  →  main  →  release-please (tag + CHANGELOG)
```

Nadie pushea directo a `development`, `staging` ni `main`: siempre PR.

```bash
gh pr create --base staging --head development --title "chore: promote development to staging"
gh pr create --base main    --head staging     --title "chore: promote staging to main"
```

Mergear a `main` no deploya: producción sale corriendo el workflow `Deploy main` a mano
(`gh workflow run deploy-main.yml --ref main`).

Mergear a `main` abre la PR `chore(main): release X.Y.Z` de release-please; mergear *esa* PR crea el
tag y el CHANGELOG.

- `development`: merge con **squash**, historial lineal obligatorio.
- `staging` y `main`: merge con **merge commit**, nunca squash — un squash colapsaría todas las
  features del ciclo y el CHANGELOG saldría vacío.
