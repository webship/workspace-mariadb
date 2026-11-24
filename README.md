# @webship.co/workspace-mariadb

MariaDB for the [Webship Workspace](https://github.com/webship/workspace), the container-based development workspace
(DDEV by default): the **DATABASE** menu on every project row whose database is MariaDB, and its tool,
`cmd-tools-mariadb.sh`, on DDEV, on Docker Compose, Podman, Kubernetes, Lando and Docksal, and on a compose file of
the project's own. An engine of [`@webship.co/workspace-database`](https://github.com/webship/workspace-database),
which draws the menu.

MariaDB is the database DDEV gives a project when its config names none, and the one the Workspace's runtime layer
gives a project it builds on another runtime: most sites of a workspace have one.

## Use it

```bash
cd ~/workspace
bash core/scripts/plugins.sh --require github:webship/workspace-mariadb
bash core/scripts/plugins.sh --activate mariadb --with-needs
bash core/scripts/plugins.sh --install mariadb
```

The install places `cmd-tools-mariadb.sh` into every sites folder (dev, test, demos, sandboxes, projects, …), its
bash functions and arguments under `core/scripts/plugins/mariadb/`, its settings file, its AI items and its webship-js
feature. Restart the dashboard to load it.

## The DATABASE menu

On a row whose database is MariaDB, the caption says `MariaDB <version>`, and the menu holds:

| Entry | The tool's flag | What it does |
| --- | --- | --- |
| Console (mariadb) | `--console` | The client on the database, in a screen: `ddev mysql` on DDEV, the client in the database's container elsewhere |
| Tables and sizes | `--tables` | The tables, largest first, with rows (MariaDB's estimate) and size, in the modal |
| Export to the backups folder | `--export` | `<backups>/<folder>/<project>--mariadb--<when>.sql.gz` |
| Import a dump… | `--import <file>` | The dumps of the backups folder, this project's first; asks first; exports the database as it is, then empties it and imports |
| Running statements | `--running` | What runs now, longest first; the slow statements the server counted; whether its slow query log is on |
| Connection details | `--info` | Engine, version, runtime, service, database, user, size, and how a client on this machine connects |
| Add Adminer, Add phpMyAdmin | `--admin adminer`, `--admin phpmyadmin` | DDEV: the official add-on (`ddev/ddev-adminer`, `ddev/ddev-phpmyadmin`), and a restart |
| Open Adminer, Open phpMyAdmin | | The address DDEV gives the add-on |
| Remove Adminer, Remove phpMyAdmin | `--admin-remove <tool>` | The add-on out, and a restart; asks first |

Each entry runs the tool in a screen session from the project's workspace folder: read it on the Screens page.

**Adding or removing a web admin restarts the project.** DDEV starts the add-on's service beside the project, and on
that restart it also recreates its shared router, so every DDEV site of the machine is unreachable for a few seconds.
Add a web admin when you need one, and leave it there rather than adding and removing it often.

## The tool

```bash
cd ~/workspace/dev
bash cmd-tools-mariadb.sh mysite                     # --info: what the database is, and how a client connects
bash cmd-tools-mariadb.sh mysite --tables            # the tables, largest first (--tsv: name, rows, bytes)
bash cmd-tools-mariadb.sh mysite --running           # what runs now
bash cmd-tools-mariadb.sh mysite --console
bash cmd-tools-mariadb.sh mysite --query "SELECT COUNT(*) FROM users"
bash cmd-tools-mariadb.sh mysite --export            # into the backups folder; --file <path.sql.gz> elsewhere
bash cmd-tools-mariadb.sh mysite --import <file>     # .sql or .sql.gz; --no-safety-export skips the export first
bash cmd-tools-mariadb.sh mysite --admin adminer     # DDEV: the add-on, a restart, the address
bash cmd-tools-mariadb.sh mysite --admin-remove adminer
```

For a compose file of the project's own, `--service <name>` names the database's service (the first MariaDB one when
it is not given). The client logs in with what the database's container was made with: its `MARIADB_*` or `MYSQL_*`
user and password, root with its password when only that is given, or the container's own option file (DDEV's).

## Settings

`core/config/plugin.mariadb.settings.yml`, also on the plugin's page in Settings:

| Key | Default | What it is |
| --- | --- | --- |
| `admin` | `both` | The web admins the menu offers: `both`, `adminer`, `phpmyadmin` or `none` |
| `keep` | `0` | How many exports of one project the backups folder keeps; the oldest go when a new one is made. `0` keeps every one |

## Runtimes

| | DDEV | Docker Compose | Kubernetes | Podman | Lando | Docksal | A compose file of its own |
| --- | --- | --- | --- | --- | --- | --- | --- |
| The menu on the row, its caption | Yes | Yes | Yes | Not yet run | Not yet run | Not yet run | Yes |
| Console | Yes, with a prompt | Yes, without a prompt | Yes, without a prompt | Not yet run | Not yet run | Not yet run | Yes, with a prompt |
| Tables and sizes, running statements, connection details | Yes | Yes | Yes | Not yet run | Not yet run | Not yet run | Yes |
| Export, then import (the database emptied first) | Yes | Yes | Yes | Not yet run | Not yet run | Not yet run | Yes |
| Adminer, phpMyAdmin | Yes | No: not yet | No: not yet | No: not yet | No: not yet | No: not yet | No: not yet |

"Yes" means it was run on a real project of that runtime: a MariaDB 10.11 project on DDEV, on Docker Compose and on
a kind cluster (the last two built by the Workspace's runtime layer), and a compose file of its own with a
`mariadb:11.4` service, each with a shop's tables, from the terminal and from the dashboard. Podman, Lando and
Docksal take the same runtime layer's verbs and were not run yet.

How each is reached:

| Runtime | The database | The console |
| --- | --- | --- |
| DDEV | The project's `db` service: `ddev mysql`, `ddev exec -s db`, `ddev export-db`, `ddev import-db` | DDEV's own client, with a prompt (in a screen session too: `script` gives it a terminal of its own) |
| Docker Compose, Podman, Kubernetes, Lando, Docksal (a project the Workspace built there) | The same verbs, through the runtime layer: the `db` service (Lando's `database`) | The client with no terminal of its own: no prompt, each statement still runs |
| A compose file of the project's own | Its MariaDB service, with `docker compose exec` | The client, with a prompt (the same way) |

## What does not fit yet

- **A web admin off DDEV.** Adminer and phpMyAdmin are services of their own beside the project. DDEV adds them with
  its official add-ons; on Docker Compose, Podman, Kubernetes, Lando and Docksal the Workspace core cannot declare a
  service for a project yet, so the menu says so in their place.
- **A terminal of its own for the console on the runtime layer** (Docker Compose, Podman, Kubernetes, Lando, Docksal):
  the layer runs the client with no terminal, so statements run and print their tables, but there is no prompt and no
  line editing.
- **Adminer on a DDEV older than 1.24.10.** The add-ons' newest releases ask for 1.24.10; on an older DDEV the tool
  takes their last release for it (`ddev/ddev-adminer` v1.1.4, `ddev/ddev-phpmyadmin` v1.0.1), and names Adminer 4 in
  the project's `.ddev/.env` (`ADMINER_DOCKER_IMAGE`), the Adminer that release logs in to by itself. Removing Adminer
  takes that line out again.
- **A Landofile or a `.docksal/` of the project's own** (one the Workspace did not write): its database is not read
  yet, so the row has no DATABASE menu.

## What it needs

On the machine: what the core needs (DDEV, and the runtime CLIs of the projects you have). `docker` is suggested
(`suggests.commands`): the tool calls it for a compose file of the project's own. The workspace reports it and never
installs it:

```bash
bash core/scripts/plugins.sh --check mariadb
webship-workspace doctor
```

In the workspace (`needs`): a sites folder for the tool (`dev`, `test`, `demos`, `sandboxes` or `projects`; the
first is added when none is there), and the AI folders its items are placed in: `ai-agents`, `ai-skills`,
`ai-commands` and `ai-prompts`. `--with-needs` adds what is missing first.

## The items it carries

Each lands in the folder of its kind, when that folder is an active workspace folder, and is installed into an AI CLI
from there (Claude Code by default):

| What | Lands in | What it is for |
| --- | --- | --- |
| The agent `mariadb-helper` | `ai-agents/` | Says what a project's MariaDB is, lists its tables and sizes, finds what runs slowly, exports it and checks the dump, and imports only when asked |
| The skill `mariadb-database` | `ai-skills/` | Which projects are MariaDB's, every entry of the DATABASE menu and its flag, the runtimes, the settings |
| The command `/mariadb-sizes` | `ai-commands/` | `/mariadb-sizes <folder> <project>`: the size and the largest tables. Reads only |
| The prompt `mariadb-dump-and-check` | `ai-prompts/` | The launch command of a session that exports a database and checks the dump |

The item bodies are plain Markdown any AI command-line assistant can follow. How they are laid out and checked:
[docs/plugin-items-pattern.md](docs/plugin-items-pattern.md).

## What the package holds

| Path | What it is |
| --- | --- |
| `src/` | `register(api)`: MariaDB's engine for `registerDatabase` (`src/lib/engine.ts`) |
| `commands/cmd-tools-mariadb.sh` | The tool, placed into the sites folders (`__WORKSPACE__` filled in) |
| `scripts/functions/fun-mariadb.sh`, `scripts/args/arg-mariadb.sh` | Its functions and its arguments, placed under `core/scripts/plugins/mariadb/` |
| `config/plugin.mariadb.settings.yml`, `config/settings.labels.yml` | The settings template and its labels |
| `ai/` | The agent, the skill, the command and the prompt |
| `features/mariadb.feature` | The webship-js scenarios, run by the dashboard's suite and in CI |
| `tests/` | The manifest, the engine, the menu, the tool against scaffolded projects, the items |

## What comes later

- The version new builds get, and a move of a project's database to another MariaDB version.
- A web admin on the other runtimes, once the core can declare a service for a project.
- A console with a terminal of its own on the runtime layer.
- The database of a Landofile or a `.docksal/` of the project's own.
- Slow statements over time (the slow query log, `performance_schema`), not only what runs now.

## Develop it

```bash
npm install     # builds dist/ (TypeScript)
npm run lint
npm test        # the manifest, the engine, the menu, the tool's functions against scaffolded projects, the items
```
