# pis-2026-gurises-unidos

## Correr la app

Next.js 16 + TypeScript + Tailwind. Requiere Node 24.

```bash
nvm install       # instalar Node 24
nvm use

npm install
npm run dev      # http://localhost:3000
```

La app queda corriendo en **http://localhost:3000** (`dev`, `start` y Docker usan el mismo puerto).

Otros scripts: `npm run build`, `npm start` (sirve el build en el mismo puerto), `npm run lint`,
`npm test` (Vitest), `npm run test:watch`, `npm run test:e2e` (Playwright), `npm run typecheck`,
`npm run format`.

### Con Docker

```bash
docker build -t pis-app .
docker run -p 3000:3000 pis-app   # http://localhost:3000
```

Para usar otro puerto, cambiá el lado izquierdo: `-p 8080:3000` → http://localhost:8080.

## Base de datos (desarrollo local)

Postgres corre siempre en Docker, nunca instalado nativo en el sistema.

```bash
cp .env.example .env          # completar POSTGRES_PASSWORD con cualquier valor
docker compose up -d db       # levanta Postgres en :5432 (solo accesible desde localhost)
npx prisma migrate dev        # crea las tablas a partir de prisma/schema.prisma
npx prisma db seed            # carga datos de prueba ficticios
```

`migrate dev` corre el seed automáticamente la primera vez. Para volver a cargarlo sin tocar el
schema: `npx prisma db seed`. Para empezar de cero (borra los datos locales): `npx prisma migrate reset`.

### Ver los datos

```bash
npx prisma studio   # http://localhost:5555
```

### Si cambiás el modelo

Editá `prisma/schema.prisma` y corré:

```bash
npx prisma migrate dev --name describe-the-change
```

Esto genera el SQL versionado en `prisma/migrations/`. Ese archivo se commitea junto con el cambio
en `schema.prisma`, en el mismo PR.

El check `DB drift` falla el PR si `schema.prisma` cambió sin su migración.

## Autenticación (desarrollo local)

```bash
npx auth secret               # genera AUTH_SECRET y lo escribe en .env
```

`SEED_USER_PASSWORD` es la contraseña de los usuarios de prueba del seed. Poné cualquier valor en
`.env` antes de correr `npx prisma db seed`. Si la cambiás, volvé a ejecutar el seed para actualizar los hashes.

## Tests end to end

Playwright contra la app real y una base propia. Cubre login, la tabla de usuarios y el listado y
detalle de proyectos. Los tests unitarios de Vitest (`npm test`) siguen siendo independientes: `e2e/`
no lo toca.

Requiere Postgres levantado y el `.env` con `AUTH_SECRET` y `SEED_USER_PASSWORD`. Además, una sola
vez, apuntar la base de E2E y bajar el browser:

```bash
echo 'E2E_DATABASE_URL=postgresql://postgres:<password>@localhost:5432/app_e2e' >> .env
npx playwright install chromium
```

La base no hay que crearla: `migrate deploy` la crea si no existe. `E2E_DATABASE_URL` sí es
obligatoria y tiene que **nombrar otra base** que la de `DATABASE_URL`: lo primero que hace el seed de
E2E es truncar todas las tablas, así que se niega a correr si falta o si las dos URLs terminan en el
mismo nombre de base (comparar los strings no alcanza: `localhost` y `127.0.0.1` son la misma base
escrita distinto).

```bash
npm run test:e2e        # migra, siembra, levanta el server y corre
npm run test:e2e:ui     # modo interactivo, para escribir o depurar tests
```

Cada corrida aplica las migraciones y vuelve a sembrar la base de E2E antes del primer test, así que
no hay nada que preparar a mano. El server de prueba es `npm run dev` en `:3100` —un puerto aparte
para no pisar el `:3000` que tengas abierto contra tu base de desarrollo— y se baja al terminar.

Con `E2E_BASE_URL` los tests corren contra una instancia que ya tengas levantada y Playwright no
arranca ninguna:

```bash
E2E_BASE_URL=http://localhost:3200 npm run test:e2e
```

Ojo con eso: `E2E_DATABASE_URL` tiene que ser la base de _esa_ instancia, y el seed la trunca. No
apuntes esto a staging ni a producción.

El dataset vive en `prisma/e2e-fixtures.ts` y lo crea `prisma/seed-e2e.ts`: tres usuarios, dos
proyectos, dos departamentos y tres temáticas, siempre los mismos. Por eso las aserciones pueden ser conteos exactos, y `prisma/seed.ts`
puede cambiar sin romper los E2E.

Cuando uno falla queda un reporte navegable en `playwright-report/`, con screenshot del momento del
fallo. En CI el workflow `E2E` lo sube como artifact.

## Tests de integración

Vitest contra la misma base y el mismo dataset que E2E, pero sin browser ni server: llaman a las
server actions directo. Usan `E2E_DATABASE_URL` y el mismo seed, así que la preparación es la de
arriba.

```bash
npm run test:integration                                                  # toda la suite
npm run test:integration -- integration/projects/update-project.test.ts  # un archivo
npm run test:integration -- -t "rejects a coordinator"                   # tests por nombre
```

No corras las dos suites a la vez: cada una trunca y vuelve a sembrar la base al arrancar. Los
archivos corren de a uno (`fileParallelism: false`) porque comparten la base. En CI los corre el
workflow `Integration`, con un Postgres propio.

`integration/setup.ts` mockea lo que depende de Next: `auth()` devuelve la sesión que armes con
`signInAs`, `redirect()` lanza un error `NEXT_REDIRECT:<url>` y `revalidatePath` no hace nada.

### Escribir un test nuevo

Los tests van en `integration/<dominio>/<action>.test.ts`. El ejemplo de referencia es
`integration/projects/update-project.test.ts`. El esqueleto:

```ts
import { afterEach, beforeAll, describe, expect, test } from 'vitest';
import { someAction } from '@/app/actions/something';
import prisma from '@/lib/prisma';
import { loadSeedData, type SeedData } from '../fixtures';
import { signInAs } from '../session';

let seed: SeedData;
let createdIds: number[] = [];

async function createFixture() {
  const row = await prisma.something.create({ data: { ... } });
  createdIds.push(row.id);
  return row.id;
}

beforeAll(async () => {
  seed = await loadSeedData();
});

afterEach(async () => {
  const ids = createdIds;
  createdIds = [];
  await prisma.something.deleteMany({ where: { id: { in: ids } } });
});

describe('someAction (integration)', () => {
  test('does the thing', async () => {
    const id = await createFixture();
    signInAs(seed.adminId);

    await expect(someAction(id, {}, formData)).rejects.toThrow(/^NEXT_REDIRECT:\/somewhere$/);

    expect(await prisma.something.findUnique({ where: { id } })).toMatchObject({ ... });
  });
});
```

Las reglas que hacen que los archivos no se pisen entre sí:

- **Usuarios, departamentos y temáticas salen del seed.** `loadSeedData()` devuelve sus ids. No
  los crees en el test: tienen nombres únicos, y si dos archivos crean el mismo, el segundo falla con
  P2002. Si necesitás uno más, agregalo a `prisma/e2e-fixtures.ts` y a `prisma/seed-e2e.ts`.
- **No modifiques ni borres filas sembradas.** Las comparten todos los archivos y los E2E, y el seed
  solo se reinicia al principio de cada corrida.
- **Cada test crea sus propios datos** y guarda los ids, y el `afterEach` los borra. Incluí los
  `AuditLog` y las filas hijas que genere la action. Crear los datos dentro de cada test, y no en un
  `beforeEach`, deja que cada uno arme exactamente lo que necesita.
- **Logueate antes de llamar a la action** con `signInAs(userId)`. La sesión se cierra sola al
  terminar cada test. Sin `signInAs`, la action ve un usuario no logueado.
- **Anclá los regex de redirect** (`^...$`): comparar un substring deja pasar
  `/dashboard/projects/11` cuando esperabas `/dashboard/projects/1`.
- **Verificá la base, no solo lo que devuelve la action.** Para los casos de error, leé la fila antes
  y después y compará con `toEqual`, así se ve que la transacción no dejó nada a medias.

## Deploy

Hay dos workflows, los dos **buildean la imagen en GitHub Actions**, la publican en GHCR y después
entran por SSH a la VM para bajarla y levantarla:

- `Deploy staging`: automático, se dispara al mergear a `staging`.
- `Deploy main`: **manual**. Producción se deploya cuando el equipo decide, no como efecto colateral
  de mergear la PR de promoción. Actions → _Deploy main_ → _Run workflow_ (rama `main`), o
  `gh workflow run deploy-main.yml --ref main`.

```
Actions (runner 4 cores / 16 GB):  docker build → push a GHCR → prisma migrate deploy
VM (159.89.90.10):                 docker compose pull → up -d
```

La VM no compila nada: el `next build` en el droplet lo dejaba sin RAM y tumbaba hasta sshd.
Cada imagen se tagea con el SHA del commit y con el nombre de la rama.

| Rama      | URL                        | Directorio en la VM | Compose project |
| --------- | -------------------------- | ------------------- | --------------- |
| `staging` | `http://159.89.90.10:3001` | `/srv/pis-staging`  | `pis-staging`   |
| `main`    | `http://159.89.90.10:3000` | `/srv/pis-main`     | `pis-main`      |

Los dos entornos son clones y _compose projects_ separados, así que un deploy de uno no toca al otro.
El contenedor siempre escucha 3000 adentro; el puerto de afuera lo pasa el workflow.

El package de GHCR es privado (la org no permite hacerlo público), así que el workflow hace
`docker login ghcr.io` en la VM con el `GITHUB_TOKEN` del run y un `docker logout` al terminar. Es
efímero: no queda ningún PAT guardado en la VM. Para un `docker pull` a mano hay que loguearse con un
PAT propio de `read:packages`.

Requiere en el repo (Settings → Secrets and variables → Actions): los secrets `SSH_HOST` y
`SSH_KEY`, y la variable `SSH_USER` (si no está, el workflow usa `deploy`). El usuario va como
_variable_ y no como secret a propósito: como secret, GitHub lo enmascara y los logs quedan con
`/srv/pis-***` en vez de la ruta real.

Los workflows de datos de staging necesitan además el secret `SEED_USER_PASSWORD`, pero en el
**environment `staging`** (Settings → Environments → `staging`), no a nivel repo.

### Ver logs y estado en la VM

```bash
cd /srv/pis-staging
COMPOSE_PROJECT_NAME=pis-staging docker compose logs -f
COMPOSE_PROJECT_NAME=pis-staging docker compose ps
```

### Deploy a mano

Como usuario `deploy` (si lo corrés como `root`, los archivos quedan de root y el deploy automático
después falla):

```bash
sudo -iu deploy
cd /srv/pis-staging && git pull --ff-only && ./deploy.sh staging 3001 staging
```

El tercer argumento es el tag de la imagen: un SHA de commit, o `staging`/`main` para la última de
esa rama. `deploy.sh` no actualiza el clon — eso lo hace el workflow antes de invocarlo, así un clon
viejo no puede hacer fallar el deploy con un `deploy.sh: No such file or directory`.

### Rollback

Volver a una imagen anterior no requiere rebuildear: se levanta el tag de ese commit.

```bash
sudo -iu deploy
/srv/pis-main/deploy.sh main 3000 <sha-anterior>
```

Ojo: el próximo deploy automático vuelve a poner la punta de la rama. Para que el rollback quede,
hay que revertir el commit en la rama.

### Base de datos

`db` está en `docker-compose.yml`. Cada entorno tiene su volumen (`pis-staging_pgdata` vs
`pis-main_pgdata`) y su puerto: `DB_PORT` 5432 en main, 5433 en staging, siempre atado a
`127.0.0.1`.

Entorno nuevo: clonar en `/srv/pis-<rama>` y, como `deploy` y sin `sudo`:

```bash
./vm-setup.sh staging     # o main
```

Genera el `.env` en `600` con `POSTGRES_PASSWORD`, `AUTH_SECRET`, `DB_PORT` y el `DATABASE_URL`
apuntando a `db:5432`. No sobrescribe uno existente.

Si el `.env` ya existía, agregarle `DB_PORT` a mano: es la única fuente del puerto y el deploy corta
si falta.

### Migraciones en el deploy

Las corre el workflow en el runner de Actions, por un túnel SSH a la base de la VM. Orden: build y
push → `up -d --wait db` → `migrate deploy` → `deploy.sh`. Si la migración falla, el deploy corta y
sigue corriendo la app anterior.

Un deploy a mano o un rollback no migran.

Ver la versión de la base de un entorno:

```bash
cd /srv/pis-main
COMPOSE_PROJECT_NAME=pis-main docker compose exec db \
  psql -U postgres -d app -c "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at;"
```

### Datos de staging

Dos workflows manuales (Actions → correr con **Run workflow**) dejan la base de staging en un
estado conocido. Los dos usan el mismo túnel SSH que las migraciones y comparten el grupo de
concurrencia `deploy-staging`, así que nunca corren en paralelo con un deploy.

| Workflow          | Qué hace                                                                                                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Seed staging**  | Carga el dataset de prueba: 19 departamentos, 6 usuarios, 25 proyectos con 1 a 4 años de beneficiarios (4 quedan sin ninguno). Es idempotente: correrlo de nuevo no duplica nada. |
| **Clean staging** | Vacía la base. Input `mode`: `reset` borra todo y recrea el admin, `wipe` borra todo sin dejar admin.                                                                             |

El admin es `admin@gurisesunidos.test` (documento `11111111`) y su contraseña es el secret
`SEED_USER_PASSWORD` del environment `staging`.

Después de un `wipe` no se puede entrar a la app hasta correr **Seed staging** o
**Clean staging** en modo `reset`.

`Clean staging` pide escribir `staging` en el input `confirm` para arrancar. Es a propósito: como
no hay backups, un `wipe` no se deshace.

El dataset vive en `prisma/seed-staging.ts`, separado del seed local (`prisma/seed.ts`). El único
fixture compartido es el admin, en `prisma/fixtures.ts`.

### Pendiente

**Backups.** Falta un cron con `pg_dump` a un archivo fuera del volumen.

## Estilo de código

- Todo en **inglés**: nombres de variables, funciones, tipos, archivos y strings internos, y también
  los mensajes de commit, los títulos de PR y los nombres de rama.
- **Sin comentarios largos.** El código se explica solo; si hace falta un párrafo, el problema es el
  código. Un comentario corto solo cuando explica un _por qué_ que no se lee en el código.
- Convenciones de nombres:

| Qué                 | Convención   | Ejemplo                                  |
| ------------------- | ------------ | ---------------------------------------- |
| Funciones y métodos | `camelCase`  | `getUserById`, `sendInvite`              |
| Variables           | `camelCase`  | `userId`, `pendingItems`                 |
| Constantes          | `MAYUSCULAS` | `MAX_RETRIES`, `API_BASE_URL`            |
| Archivos            | `kebab-case` | `project-carousel.tsx`, `area-chart.tsx` |

### Lint, tipos y formato

El workflow `Tests` corre el job `static checks` en cada PR. Para verificarlo antes de
pushear:

```bash
npm run lint
npm run typecheck
npm run format:check
npm run format   # arregla el formato
```

Si `typecheck` marca errores dentro de `.next/dev`, son tipos viejos de un `next dev` anterior:
borrá esa carpeta.

## Ramas

```
feature/*  →  development  →  staging  →  main
                                           ↓
                                    release-please
                                    (tag + CHANGELOG)
```

| Rama          | Para qué                                                                   | Quién la escribe       |
| ------------- | -------------------------------------------------------------------------- | ---------------------- |
| `development` | Integración diaria. Es la rama **default**: toda PR de feature apunta acá. | PRs desde `feature/*`  |
| `staging`     | Pre-producción / QA. Se llena promoviendo `development` entero.            | PR desde `development` |
| `main`        | Producción. Acá corre release-please.                                      | PR desde `staging`     |

Nadie pushea directo a ninguna de las tres. Siempre PR.

## Flujo de trabajo

```bash
# 1. Partir siempre de development actualizado
git checkout development
git pull

# 2. Rama nueva
git checkout -b feat/google-login

# 3. Commitear
git add .
git commit -m "feat(auth): add google login"

# 4. Pushear y abrir la PR
git push -u origin feat/google-login
gh pr create --base development
```

### Nombres de rama

`<tipo>/<descripcion-corta-en-kebab-case>`

```
feat/google-login
fix/user-list-timeout
chore/update-deps
docs/contributing-guide
refactor/extract-http-client
```

## Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/). No es cosmético: release-please
lee el historial de `main` para decidir el número de versión y generar el CHANGELOG. Un commit mal
escrito es una línea que falta en el changelog.

```
<tipo>(<scope opcional>): <descripción en inglés, minúscula, imperativo, sin punto final>
```

| Tipo       | Cuándo                                   | Efecto en la versión      |
| ---------- | ---------------------------------------- | ------------------------- |
| `feat`     | Funcionalidad nueva                      | **minor** (1.2.0 → 1.3.0) |
| `fix`      | Corrección de bug                        | **patch** (1.2.0 → 1.2.1) |
| `perf`     | Mejora de performance                    | patch                     |
| `refactor` | Reescritura sin cambio de comportamiento | ninguno                   |
| `docs`     | Solo documentación                       | ninguno                   |
| `test`     | Solo tests                               | ninguno                   |
| `chore`    | Build, deps, config, CI                  | ninguno                   |
| `style`    | Formato, espacios, punto y coma          | ninguno                   |

### Ejemplos válidos

```
feat(auth): add google login
fix(api): fix timeout on the user list
docs: document the branching flow
chore(deps): update dependencies
refactor(db): extract connection logic into a module
test(auth): cover the expired token case
perf(users): paginate the user query
```

### Breaking changes

Dos formas, ambas suben la **major** (1.2.0 → 2.0.0):

```
feat(api)!: rename `user_id` to `userId`
```

o con footer:

```
feat(api): rename the user_id field

BREAKING CHANGE: clients reading `user_id` stop working.
```

### Ejemplos inválidos

| Mal                   | Por qué                    | Bien                             |
| --------------------- | -------------------------- | -------------------------------- |
| `Add login`           | Sin tipo                   | `feat(auth): add login`          |
| `fix: Fix the bug.`   | Mayúscula y punto final    | `fix: fix the user list timeout` |
| `feat: agregar login` | En español                 | `feat(auth): add login`          |
| `feat: changes`       | No dice nada               | `feat(auth): add refresh token`  |
| `WIP`                 | No es un commit publicable | Squashealo antes de la PR        |
| `Feat: something`     | Tipo capitalizado          | `feat: something`                |

## Pull Requests

**El título de la PR es lo que termina en el historial.** Las PRs a `development` se mergean con
squash, así que los commits individuales desaparecen y sobrevive solo el título. Por eso hay un
check automático (`Conventional commit`) que lo valida y bloquea el merge si está mal.

El título sigue exactamente las mismas reglas que un commit:

```
feat(auth): add google login
```

Las PRs de promoción también:

```
chore: promote development to staging
chore: promote staging to main
```

### Requisitos para mergear

Los tres cumplen lo mismo:

- 2 approvals de otras personas (no podés auto-aprobarte)
- El check `Conventional commit` en verde
- El check `DB drift` en verde
- Todas las conversaciones resueltas
- Tu rama actualizada respecto de la base (ver más abajo)
- Los approvals se invalidan si pusheás commits nuevos: hay que pedir re-review

### Qué difiere entre ramas

|                      | `development` | `staging` y `main` |
| -------------------- | ------------- | ------------------ |
| **Merge method**     | Squash        | Merge commit       |
| **Historial lineal** | Obligatorio   | No                 |

La razón es release-please. En `development` queremos historial limpio: una feature = un commit, y
los `wip`/`arreglo typo`/`ahora sí` de la rama de trabajo se colapsan en el título de la PR.

Pero al promover a `staging` y `main`, un squash colapsaría _todas_ las features del ciclo en un
único commit. release-please leería un solo `chore: promover staging a main` y el CHANGELOG saldría
vacío. Con merge commit, cada `feat:` y `fix:` que entró por squash a `development` llega intacto a
`main` y aparece como su propia línea en el changelog. Eso también es por qué `main` y `staging` no
exigen historial lineal: un merge commit es, por definición, no lineal.

### "Require branches to be up to date" (strict)

Está activo en `development` y `staging`. Significa que si la base avanzó desde que abriste tu PR, GitHub no te
deja mergear hasta que la actualices:

```bash
git checkout feat/my-branch
git fetch origin
git rebase origin/development
git push --force-with-lease
```

Usá `--force-with-lease`, nunca `--force`: si alguien más pusheó a tu rama, aborta en vez de
pisarle el trabajo.

El costo es real — cada merge en `development` desactualiza las PRs abiertas, y con varias en vuelo
te toca rebasear seguido. El beneficio es que el CI corre sobre el código que efectivamente va a
quedar en la rama, no sobre una versión vieja que pasaba en aislamiento pero rompe al combinarse.
Con el equipo laburando en paralelo, es la única forma de que "el check está verde" signifique algo.

## Promover a staging y main

```bash
gh pr create --base staging --head development --title "chore: promote development to staging"
gh pr create --base main    --head staging     --title "chore: promote staging to main"
```

Mergealas con **merge commit**, no squash. Mergear a `main` no deploya: producción sale corriendo el
workflow `Deploy main` a mano.

## Releases

Los hace [release-please](https://github.com/googleapis/release-please) leyendo los commits de
`main`. El ciclo:

1. Mergeás `staging → main`. El workflow `Release Please` abre (o actualiza) una PR
   `chore(main): release X.Y.Z` con el `CHANGELOG.md` y el bump de `version` en `package.json`.
   El número sale de los tipos de commit: un `feat` sube la minor, un `fix`/`perf` la patch.
2. Esa PR se revisa como cualquier otra — 2 approvals. Se puede editar el CHANGELOG antes de mergear.
3. Al mergearla, release-please crea el tag `vX.Y.Z` y el GitHub Release.

Mergear la PR de release tampoco deploya: producción sigue saliendo con `Deploy main` a mano.

La config vive en `release-please-config.json` y la versión actual en `.release-please-manifest.json`
(la fuente de verdad; `package.json` la sigue).

### Por qué `main` no tiene status checks required

El workflow usa el `GITHUB_TOKEN` del run, y las PRs creadas con ese token no disparan otros
workflows: el check `Conventional commit` nunca correría sobre la PR de release y la dejaría
bloqueada para siempre. Como era el único check, en el ruleset de `main` está apagada la regla
_Require status checks to pass_ entera (GitHub no acepta la lista vacía), y con ella el _strict_ de
ramas actualizadas. `main` solo recibe la PR de promoción desde `staging` y la de release-please, y
sigue exigiendo 2 approvals, conversaciones resueltas y merge commit. En `development` y `staging`
no cambia nada: ahí se validan los títulos que arman el CHANGELOG.

## Reviews

- Toda PR necesita 2 approvals.
- Los approvals se invalidan al pushear commits nuevos.
- Hay que resolver todas las conversaciones antes de mergear.
- Si pedís cambios, dejá claro qué es bloqueante y qué es sugerencia.

## Notas

- El borrado automático de ramas al mergear está **desactivado**: en las PRs de promoción la rama
  _head_ es `staging`, y GitHub la borraba al mergear `staging → main`. Las ramas de feature se
  borran a mano después de mergear.
- El check de título corre con `pull_request_target`, así que se re-evalúa cuando editás el título
  de la PR (a diferencia de `pull_request`, que no se dispara con ese evento).
