---
name: mariadb-database
description: The MariaDB database of a Webship Workspace project, as the MariaDB plugin (`@webship.co/workspace-mariadb`) gives it — which project's database is MariaDB and where it runs (DDEV, the runtime layer's Docker Compose, Podman, Kubernetes, Lando or Docksal, a compose file of the project's own), every entry of the DATABASE menu and the `cmd-tools-mariadb.sh` flag it runs, the exports and imports in the backups folder, the web admins on DDEV, and the plugin's settings. Use when a person asks about a project's MariaDB, its console, its size, its tables, an export or an import, Adminer or phpMyAdmin, or what the DATABASE menu does.
---

# MariaDB in a Webship Workspace

The Webship Workspace is container-based (DDEV by default). The MariaDB plugin (`@webship.co/workspace-mariadb`, an
engine of `@webship.co/workspace-database`) puts a **DATABASE** menu on every project row whose database is MariaDB,
and places its tool, `cmd-tools-mariadb.sh`, into every sites folder (dev, test, demos, sandboxes, projects, …).
Every entry of the menu runs that tool in a screen session, from the project's workspace folder.

## Which projects

| The project carries | Its MariaDB |
| --- | --- |
| `.ddev/config.yaml` | `database.type: mariadb`, or no database in it at all: DDEV's default, MariaDB 10.11 |
| An `x-webship:` block (a builder run with `--runtime docker`, `podman`, `kubernetes`, `lando` or `docksal`) | The block's `database` value, the version of the runtime layer's MariaDB (10.11 unless the build asked for another) |
| A compose file of its own | A service whose image is `mariadb` (or its Bitnami or Docksal build) |

The row's caption says it: `MariaDB 10.11`. A project whose database is MySQL or PostgreSQL gets that plugin's
section in the same menu, with that plugin installed.

## The DATABASE menu

| Entry | The tool's flag | What it does |
| --- | --- | --- |
| Console (mariadb) | `--console` | The client on the database: `ddev mysql` on DDEV; elsewhere the client in the database's container |
| Tables and sizes | `--tables` (the modal reads `--tables --tsv`) | The tables, largest first, with rows (MariaDB's estimate) and size. Reads only |
| Export to the backups folder | `--export` | `<backups>/<folder>/<project>--mariadb--<when>.sql.gz`, beside the dumps the row's own Export writes |
| Import a dump… | `--import <file>` | Lists the dumps of the backups folder; asks first; exports the database as it is, then replaces it |
| Running statements | `--running` | What runs now, longest first; the server's count of slow statements; whether the slow query log is on. Reads only |
| Connection details | `--info` | Engine, version, runtime, service, database, user, size, and how a client on this machine connects |
| Add Adminer, Add phpMyAdmin | `--admin adminer`, `--admin phpmyadmin` | DDEV only: the official add-on (ddev/ddev-adminer, ddev/ddev-phpmyadmin), and a restart |
| Open Adminer, Open phpMyAdmin | | The address DDEV gives the add-on |
| Remove Adminer, Remove phpMyAdmin | `--admin-remove <tool>` | Takes the add-on out and restarts the project; asks first |

The tool also takes `--query "<statement>"` (prints what it answers), `--file <path>` with `--export`,
`--no-safety-export` with `--import`, and `--service <name>` for a compose file of the project's own. Run
`bash cmd-tools-mariadb.sh <project> --help` for every flag.

```bash
cd ~/workspace/<folder>
bash cmd-tools-mariadb.sh <project>                    # --info
bash cmd-tools-mariadb.sh <project> --tables
bash cmd-tools-mariadb.sh <project> --export
bash cmd-tools-mariadb.sh <project> --import ~/workspace/backups/<folder>/<project>--mariadb--<when>.sql.gz
```

## Runtimes

| | DDEV | Docker Compose, Podman, Kubernetes, Lando, Docksal | A compose file of the project's own |
| --- | --- | --- | --- |
| Reached through | DDEV's verbs | The runtime layer's verbs (`ddev exec -s db`, `ddev export-db`, `ddev import-db`) | `docker compose exec` on the service |
| The console | DDEV's own client, with a prompt | The client with no terminal of its own: no prompt, statements still run | The client, with a prompt |
| A web admin | Adminer, phpMyAdmin (add-ons) | Not yet: the Workspace cannot add a service to a project there | Not yet |

An import empties the database first everywhere (DDEV's import-db does it on DDEV), so a table the dump does not have
does not stay.

## The settings

`core/config/plugin.mariadb.settings.yml`, also on the plugin's page in Settings:

| Key | What it is |
| --- | --- |
| `admin:` | The web admins the menu offers: `both` (the default), `adminer`, `phpmyadmin`, or `none` |
| `keep:` | How many exports of one project the backups folder keeps; the oldest go when a new one is made. `0` keeps every one |

## Good to know

- The exports carry the engine in their name, so the Import list of a PostgreSQL project never offers a MariaDB dump.
- A project that is stopped has no database to ask: the tool says so. Start it first.
- The tool never prints a password other than the project's own `db` one, and never copies a dump out of the workspace.
