# Cómo contribuir

¡Gracias por querer sumar! Esta guía resume cómo trabajamos en el repo. Los detalles finos (base de
datos, tests, deploy) están en el [README](../README.md).

Al participar aceptás nuestro [código de conducta](CODE_OF_CONDUCT.md).

## Antes de empezar

1. Levantá la app siguiendo [Correr la app](../README.md#correr-la-app). Necesitás Node 24 y Postgres.
2. Buscá si ya hay un [issue](../../../issues) o una PR abierta sobre lo mismo.
3. Si vas a hacer algo grande, abrí un issue primero y charlemos el enfoque.

## Reportar un bug o pedir algo nuevo

Abrí un [issue nuevo](../../../issues/new/choose) y elegí la plantilla que corresponda. Cuanto más
concreto, mejor: pasos para reproducirlo, qué esperabas que pasara, capturas y con qué rol estabas
logueado.

## Flujo de trabajo

```
feature/*  →  development  →  staging  →  main
```

Nadie pushea directo a `development`, `staging` ni `main`: todo entra por PR.

```bash
git checkout development
git pull
git checkout -b feat/google-login
# ...cambios...
git commit -m "feat(auth): add google login"
git push -u origin feat/google-login
```

### Ramas

`<tipo>/<descripcion-corta-en-kebab-case>`, siempre partiendo de `development` actualizado. Por
ejemplo: `feat/google-login`, `fix/session-expiration`.

### Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/), en inglés, en
minúscula, en imperativo y sin punto final:

```
<tipo>(<scope opcional>): <descripción>
```

| Tipo                                         | Cuándo                          | Versión |
| -------------------------------------------- | ------------------------------- | ------- |
| `feat`                                       | Funcionalidad nueva             | minor   |
| `fix`, `perf`                                | Arreglo o mejora de rendimiento | patch   |
| `refactor`, `docs`, `test`, `chore`, `style` | El resto                        | ninguna |

Un cambio que rompe compatibilidad lleva `!` (`feat(api)!: ...`) o un footer `BREAKING CHANGE:`.
[release-please](https://github.com/googleapis/release-please) lee los commits para armar la versión
y el CHANGELOG.

## Pull requests

- **El título sigue las mismas reglas que un commit.** Las PRs a `development` se mergean con
  squash, así que el título es lo único que queda en el historial. El check `Conventional commit`
  lo valida.
- Completá la plantilla: ticket, tipo de cambio, descripción, capturas y cómo probarlo.
- Un cambio por PR. Si una PR crece mucho, partila.
- Sumá tests para lo que agregues o arregles.
- Antes de pushear corré:

  ```bash
  npm run lint
  npm run typecheck
  npm run format:check
  npm test
  ```

### Para mergear

- 2 approvals de otras personas. Si pusheás commits nuevos, los approvals se invalidan y hay que
  pedir re-review.
- Todos los checks en verde.
- Todas las conversaciones resueltas.
- La rama al día con la base (`git rebase origin/development` y `git push --force-with-lease`).

## Reviews

- Revisá con el mismo cuidado con el que te gustaría que revisen lo tuyo.
- Dejá claro qué es **bloqueante** y qué es una sugerencia.
- Si algo parece un bug, probalo antes de marcarlo.
- Las conversaciones las resuelve quien abrió el comentario, o el autor si quedó claro que se
  atendió.

## Estilo de código

- Todo en **inglés**: variables, funciones, tipos, archivos, commits, ramas y títulos de PR.
- `camelCase` para funciones y variables, `MAYUSCULAS_CON_UNDERSCORE` para constantes y
  `kebab-case` para archivos.
- Nada de comentarios que expliquen _qué_ hace el código. Un comentario corto solo cuando explica
  un _por qué_ que no se puede leer en el código.

El detalle completo está en [Estilo de código](../README.md#estilo-de-código).
