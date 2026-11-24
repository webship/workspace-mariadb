/**
 * cmd-tools-mariadb.sh's functions against scaffolded projects, with `ddev` and `docker` replaced by recorders: what
 * each flag runs on DDEV, on the runtime layer and on a compose file of the project's own, and the client's login in
 * the database's container, run in a real shell with a stand-in client.
 */
import test, { after } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import zlib from 'zlib';

// Compiled, this test runs from dist/tests, so the package root is one folder further up.
const PKG = fs.existsSync(path.join(__dirname, '..', 'package.json')) ? path.join(__dirname, '..') : path.join(__dirname, '..', '..');
const FUN = path.join(PKG, 'scripts', 'functions', 'fun-mariadb.sh');
const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'mariadb-tool-'));
after(() => fs.rmSync(ROOT, { recursive: true, force: true }));

function write(rel: string, body: string) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, rel), body);
}

write('dev/shop/.ddev/config.yaml', 'name: shop\ntype: drupal11\ndocroot: web\n');
write('dev/maria114/.ddev/config.yaml', 'name: maria114\ndatabase:\n    type: mariadb\n    version: "11.4"\n');
write('dev/pg/.ddev/config.yaml', 'name: pg\ndatabase:\n  type: postgres\n  version: "16"\n');
write('dev/static/.ddev/config.yaml', 'name: static\nomit_containers:\n  - db\n');
write('dev/docked/compose.yaml', 'name: docked\nx-webship:\n  runtime: docker\n  stack: php\n  database: "10.11"\n  port: 38001\nservices:\n  db:\n    image: mariadb:10.11\n');
write('dev/k8s/compose.yaml', 'name: k8s\nx-webship:\n  runtime: kubernetes\n  database: "mysql:8.0"\n');
write('dev/own/compose.yaml', 'services:\n  app:\n    image: node:22\n  maria:\n    image: "mariadb:11.4.2"\n    environment:\n      MARIADB_ROOT_PASSWORD: x\n');
write('dev/ownpg/docker-compose.yml', 'services:\n  pg:\n    image: postgres:16\n');
write('dev/landoown/.lando.yml', 'name: landoown\nrecipe: lamp\n');
write('dev/nothing/README.md', '');

/**
 * A shell with the plugin's functions, the two layer functions they ask (as the core's runtime layer answers them),
 * and `ddev`, `docker` and `date` recorded into $LOG. An export's recorder writes a small gzip, so the dump has content.
 */
function run(script: string, env: Record<string, string> = {}, opts: { layer?: boolean; ddevVersion?: string } = {}): { code: number; out: string; log: string[] } {
  const log = path.join(ROOT, `log-${Math.random().toString(36).slice(2)}`);
  const layer = opts.layer === false ? '' : `
function rt_find_project() { local d="\${1:-\$PWD}" ; d="\$(cd "\$d" && pwd)" ;
  while [ "\$d" != / ] ; do
    for f in compose.yaml .lando.yml .docksal/docksal.yml ; do
      if [ -f "\$d/\$f" ] && grep -q '^x-webship:' "\$d/\$f" ; then echo "\$(sed -n '/^x-webship:/,/^[^ ]/s/^  runtime: *//p' "\$d/\$f" | head -1) \$d" ; return 0 ; fi
    done
    [ -f "\$d/.ddev/config.yaml" ] && { echo "ddev \$d" ; return 0 ; } ;
    [ -f "\$d/.lando.yml" ] && { echo "lando \$d" ; return 0 ; } ;
    d="\$(dirname "\$d")" ;
  done ; return 1 ; }
function rt_meta() { local f ; for f in compose.yaml .lando.yml .docksal/docksal.yml ; do [ -f "\$2/\$f" ] && grep -q '^x-webship:' "\$2/\$f" && { sed -n '/^x-webship:/,/^[^ x]/s/^  '"\$1"': *//p' "\$2/\$f" | head -1 | tr -d '"' ; return 0 ; } ; done ; }`;
  const src = `
LOG='${log}'
rec() { printf '%s\\n' "\$*" >> "\$LOG" ; }
function ddev() {
  rec ddev "\$@" ;
  case "\$1" in
    export-db) local f="\${2#--file=}" ; echo 'CREATE TABLE x (id int);' | gzip > "\$f" ;;
    --version) echo 'ddev version v${opts.ddevVersion || '1.24.7'}' ;;
    describe) echo '{"raw":{"dbinfo":{"published_port":32801},"services":{"adminer":{"https_url":"https://shop.ddev.site:9101","status":"running"}}}}' ;;
    exec) [ -n "\${DDEV_EXEC_OUT:-}" ] && printf '%b' "\$DDEV_EXEC_OUT" ;;
  esac
  return 0 ; }
function docker() { rec docker "\$@" ; [ -t 0 ] || cat > /dev/null ; [ -n "\${DOCKER_OUT:-}" ] && printf '%b' "\$DOCKER_OUT" ; return 0 ; }
${layer}
source '${FUN}'
WORKSPACE_ROOT='${ROOT}' ; doc_name=dev ; backups='${ROOT}/backups' ; current_path='${ROOT}'
${script}`;
  const r = spawnSync('bash', ['-c', src], { encoding: 'utf8', env: { PATH: process.env.PATH, HOME: ROOT, ...env } });
  const lines = fs.existsSync(log) ? fs.readFileSync(log, 'utf8').split('\n').filter(Boolean) : [];
  return { code: r.status === null ? -1 : r.status, out: `${r.stdout}${r.stderr}`, log: lines };
}

test('where a project\'s MariaDB runs: DDEV, the runtime layer, a compose file of its own; another engine or none is said', () => {
  const at = (p: string, want = '') => run(`PROJECT_NAME=${p} ; mariadb_locate '${ROOT}/dev/${p}' '${want}'`);
  assert.strictEqual(at('shop').out.trim(), 'ddev|ddev|db|10.11|');
  assert.strictEqual(at('maria114').out.trim(), 'ddev|ddev|db|11.4|');
  assert.strictEqual(at('docked').out.trim(), 'layer|docker|db|10.11|');
  assert.strictEqual(at('own').out.trim(), 'compose|docker|maria|11.4|compose.yaml');
  assert.strictEqual(at('own', 'maria').out.trim(), 'compose|docker|maria|11.4|compose.yaml');
  const pg = at('pg');
  assert.strictEqual(pg.code, 1);
  assert.match(pg.out, /The database of pg is PostgreSQL 16 \(DDEV\), not MariaDB: its tool is cmd-tools-postgresql\.sh\./);
  assert.match(at('k8s').out, /The database of k8s is MySQL 8\.0 \(Kubernetes\), not MariaDB: its tool is cmd-tools-mysql\.sh\./);
  assert.match(at('static').out, /static has no database: its DDEV config omits the db container\./);
  assert.match(at('own', 'app').out, /The service app of compose\.yaml is not MariaDB \(node:22\)\./);
  assert.match(at('ownpg').out, /docker-compose\.yml of ownpg has no MariaDB service\./);
  assert.match(at('landoown').out, /runs on a Lando file of its own: the database it holds is not read yet\./);
  assert.match(at('nothing').out, /nothing has no MariaDB/);
  // A core with no runtime layer yet: a DDEV project is still found.
  assert.strictEqual(run(`PROJECT_NAME=shop ; mariadb_locate '${ROOT}/dev/shop'`, {}, { layer: false }).out.trim(), 'ddev|ddev|db|10.11|');
});

test('the tables, the running statements, the info and a query: the client in the database\'s container, through ddev or docker compose', () => {
  const tsv = run('PROJECT_NAME=shop ; TABLES=yes ; TSV=yes ; mariadb_tool');
  assert.strictEqual(tsv.code, 0, tsv.out);
  assert.strictEqual(tsv.log.length, 1);
  assert.match(tsv.log[0], /^ddev exec -s db -d \/ c="\$\(command -v mariadb \|\| command -v mysql\)"; .* "\$c" "\$@" -N -B "\$d" -e 'SELECT table_name, IFNULL\(table_rows, '\\'''\\''\), IFNULL\(data_length \+ index_length, '\\'''\\''\) FROM information_schema\.tables WHERE table_schema = DATABASE\(\) AND table_type = '\\''BASE TABLE'\\'' ORDER BY data_length \+ index_length DESC, table_name'$/);
  const human = run('PROJECT_NAME=docked ; TABLES=yes ; mariadb_tool');
  assert.match(human.log[0], /^ddev exec -s db -d \/ .* -t "\$d" -e 'SELECT table_name AS `Table`/);
  const own = run('PROJECT_NAME=own ; RUNNING=yes ; mariadb_tool');
  assert.match(own.log[0], /^docker compose -f compose\.yaml exec -T maria sh -c .* -N -B "\$d" -e 'SELECT COUNT\(\*\) FROM information_schema\.processlist/);
  assert.match(own.log[1], /^docker compose -f compose\.yaml exec -T maria sh -c .* -t "\$d" -e 'SELECT id AS `Id`.*FROM information_schema\.processlist WHERE command NOT IN \('\\''Sleep'\\'', '\\''Daemon'\\''\)/);
  const idle = run('PROJECT_NAME=shop ; RUNNING=yes ; DDEV_EXEC_OUT="0\\n" ; mariadb_tool');
  assert.match(idle.out, /No statement runs now, besides this one\./);
  assert.strictEqual(idle.log.length, 2, 'the count, then the slow statements');
  const q = run(`PROJECT_NAME=shop ; QUERY="SELECT 'it''s'" ; mariadb_tool`);
  assert.match(q.log[0], /-t "\$d" -e 'SELECT '\\''it'\\'''\\''s'\\'''$/, 'a quote in the statement stays the statement\'s');
  const info = run('PROJECT_NAME=shop ; INFO=yes ; mariadb_tool');
  assert.match(info.out, /Database:  MariaDB 10\.11 on DDEV, service db/);
  assert.match(info.out, /A client on this machine: host 127\.0\.0\.1, port 32801, user db, password db, database db/);
  const layerInfo = run('PROJECT_NAME=docked ; mariadb_tool');
  assert.match(layerInfo.out, /In the project's network: host db, port 3306, user db, password db, database db\. Docker Compose publishes no port of the database to this machine\./, 'no flag is --info');
});

test('an export goes to the backups folder with the engine in its name, past keep: the oldest go, and an empty one is refused', () => {
  const ddev = run('PROJECT_NAME=shop ; EXPORT=yes ; mariadb_tool');
  assert.strictEqual(ddev.code, 0, ddev.out);
  assert.match(ddev.log[0], new RegExp(`^ddev export-db --file=${ROOT}/backups/dev/shop--mariadb--\\d{4}-\\d\\d-\\d\\d-\\d\\d-\\d\\d-\\d\\d\\.sql\\.gz$`));
  assert.match(ddev.out, /Exported: .*shop--mariadb--.*\.sql\.gz/);
  // keep: 2, with three older ones there.
  ['2026-01-01-00-00-00', '2026-01-02-00-00-00', '2026-01-03-00-00-00'].forEach((s, i) => {
    write(`backups/dev/docked--mariadb--${s}.sql.gz`, 'x');
    const t = new Date(Date.UTC(2026, 0, 1 + i));
    fs.utimesSync(path.join(ROOT, 'backups', 'dev', `docked--mariadb--${s}.sql.gz`), t, t);
  });
  const kept = run('PROJECT_NAME=docked ; EXPORT=yes ; plugin_mariadb_keep=2 ; mariadb_tool');
  assert.strictEqual(kept.code, 0, kept.out);
  assert.strictEqual(fs.readdirSync(path.join(ROOT, 'backups', 'dev')).filter((f) => f.startsWith('docked--')).length, 2);
  assert.match(kept.out, /Removed an older export \(keep: 2\): docked--mariadb--2026-01-01-00-00-00\.sql\.gz/);
  // A compose file of its own: the dump tool in the service, gzipped here.
  const own = run('PROJECT_NAME=own ; EXPORT=yes ; DOCKER_OUT="-- MariaDB dump\\nCREATE TABLE t (id int);\\n" ; mariadb_tool');
  assert.strictEqual(own.code, 0, own.out);
  assert.match(own.log[0], /^docker compose -f compose\.yaml exec -T maria sh -c .*exec "\$dump" "\$@" --single-transaction --routines --triggers --add-drop-table "\$d"$/);
  const empty = run('PROJECT_NAME=own ; EXPORT=yes ; mariadb_tool');
  assert.strictEqual(empty.code, 1);
  assert.match(empty.out, /The export is empty: is own running\?/);
  assert.match(run('PROJECT_NAME=shop ; EXPORT=yes ; FILE=/tmp/x.sql ; mariadb_tool').out, /An export is a \.sql\.gz file/);
});

test('an import exports the database as it is first, empties it off DDEV, and takes only a dump', () => {
  write('dumps/in.sql.gz', '');
  fs.writeFileSync(path.join(ROOT, 'dumps', 'in.sql.gz'), zlib.gzipSync('CREATE TABLE t (id int);\n'));
  const ddev = run(`PROJECT_NAME=shop ; IMPORT='${ROOT}/dumps/in.sql.gz' ; mariadb_tool`);
  assert.strictEqual(ddev.code, 0, ddev.out);
  assert.match(ddev.log[0], /^ddev export-db --file=.*\/backups\/dev\/shop--mariadb--before-import--.*\.sql\.gz$/);
  assert.strictEqual(ddev.log[1], `ddev import-db --file=${ROOT}/dumps/in.sql.gz`);
  assert.strictEqual(ddev.log.length, 2, 'DDEV empties the database itself');
  const layer = run(`PROJECT_NAME=docked ; IMPORT='dumps/in.sql.gz' ; mariadb_tool`);
  assert.strictEqual(layer.code, 0, layer.out);
  assert.match(layer.log[1], /^ddev exec -s db -d \/ .*"\$c" "\$@" -e "DROP DATABASE IF EXISTS \\`\$d\\`; CREATE DATABASE \\`\$d\\`\$extra"$/);
  assert.strictEqual(layer.log[2], `ddev import-db --file=${ROOT}/dumps/in.sql.gz`, 'a path is taken from where the tool was run');
  const own = run(`PROJECT_NAME=own ; IMPORT='${ROOT}/dumps/in.sql.gz' ; NO_SAFETY_EXPORT=yes ; mariadb_tool`);
  assert.strictEqual(own.code, 0, own.out);
  assert.match(own.log[0], /DROP DATABASE IF EXISTS/);
  assert.match(own.log[1], /^docker compose -f compose\.yaml exec -T maria sh -c .*exec "\$c" "\$@" "\$d"$/);
  assert.strictEqual(own.log.length, 2, 'no export first with --no-safety-export');
  const failed = run(`PROJECT_NAME=own ; IMPORT='${ROOT}/dumps/in.sql.gz' ; mariadb_tool`);
  assert.strictEqual(failed.code, 1);
  assert.match(failed.out, /The export of the database as it is failed: nothing was imported\./);
  assert.match(run(`PROJECT_NAME=shop ; IMPORT='${ROOT}/backups' ; mariadb_tool`).out, /No such file|A MariaDB dump is a \.sql or \.sql\.gz file/);
  assert.match(run(`PROJECT_NAME=shop ; IMPORT='${ROOT}/dev/shop/.ddev/config.yaml' ; mariadb_tool`).out, /A MariaDB dump is a \.sql or \.sql\.gz file/);
});

test('the console: DDEV\'s own client; the client without a terminal on the runtime layer, said first; docker compose for a file of its own', () => {
  assert.deepStrictEqual(run('PROJECT_NAME=shop ; CONSOLE=yes ; mariadb_tool').log, ['ddev mysql']);
  const layer = run('PROJECT_NAME=docked ; CONSOLE=yes ; mariadb_tool');
  assert.match(layer.out, /The runtime gives the client no terminal of its own, so it shows no prompt/);
  assert.match(layer.log[0], /^ddev exec -s db -d \/ .*exec "\$c" "\$@" --table --unbuffered "\$d"$/);
  assert.match(run('PROJECT_NAME=own ; CONSOLE=yes ; mariadb_tool').log[0], /^docker compose -f compose\.yaml exec -T maria sh -c /, 'no terminal here, so -T');
});

test('a web admin: the official add-on on DDEV, its last release for a DDEV older than 1.24.10, and a restart; refused elsewhere', () => {
  const old = run('PROJECT_NAME=shop ; ADMIN=adminer ; mariadb_tool');
  assert.strictEqual(old.code, 0, old.out);
  assert.deepStrictEqual(old.log.slice(0, 3), ['ddev --version', 'ddev add-on get ddev/ddev-adminer --version v1.1.4', 'ddev restart']);
  assert.match(old.out, /Adminer: https:\/\/shop\.ddev\.site:9101/);
  assert.strictEqual(fs.readFileSync(path.join(ROOT, 'dev', 'shop', '.ddev', '.env'), 'utf8'), 'ADMINER_DOCKER_IMAGE=adminer:4.8.1-standalone\n', 'that release logs in to Adminer 4');
  const fresh = run('PROJECT_NAME=shop ; ADMIN=phpmyadmin ; mariadb_tool', {}, { ddevVersion: '1.25.4' });
  assert.deepStrictEqual(fresh.log.slice(0, 3), ['ddev --version', 'ddev add-on get ddev/ddev-phpmyadmin', 'ddev restart']);
  write('dev/shop/.ddev/docker-compose.adminer.yaml', 'services: {}\n');
  const again = run('PROJECT_NAME=shop ; ADMIN=adminer ; mariadb_tool');
  assert.ok(!again.log.some((l) => l.startsWith('ddev add-on get')), 'an add-on that is there is not fetched again');
  assert.match(again.out, /Adminer is already added to shop\./);
  assert.deepStrictEqual(run('PROJECT_NAME=shop ; ADMIN_REMOVE=adminer ; mariadb_tool').log, ['ddev add-on remove adminer', 'ddev restart']);
  assert.ok(!fs.existsSync(path.join(ROOT, 'dev', 'shop', '.ddev', '.env')), 'the line the tool wrote goes with the add-on, and the file it made with it');
  fs.writeFileSync(path.join(ROOT, 'dev', 'shop', '.ddev', '.env'), 'MY_VALUE=1\nADMINER_DOCKER_IMAGE=adminer:4.8.1-standalone\n');
  run('PROJECT_NAME=shop ; ADMIN_REMOVE=adminer ; mariadb_tool');
  assert.strictEqual(fs.readFileSync(path.join(ROOT, 'dev', 'shop', '.ddev', '.env'), 'utf8'), 'MY_VALUE=1\n', 'a .env of the project\'s own keeps its own lines');
  const layer = run('PROJECT_NAME=docked ; ADMIN=adminer ; mariadb_tool');
  assert.strictEqual(layer.code, 1);
  assert.match(layer.out, /on Docker Compose the Workspace cannot add one yet \(on DDEV it is the official add-on ddev\/ddev-adminer\)/);
  assert.deepStrictEqual(layer.log, []);
});

test('the client\'s login in the database\'s container: the container\'s user, root with its password, or its own option file', () => {
  // A stand-in client that says what it was given, and answers the question for a database with one.
  const bin = path.join(ROOT, 'bin');
  fs.mkdirSync(bin, { recursive: true });
  fs.writeFileSync(path.join(bin, 'mariadb'), '#!/bin/sh\ncase "$*" in *schema_name*) echo firstdb ;; *) echo "ARGS $*" ;; esac\n', { mode: 0o755 });
  const login = (env: Record<string, string>) => {
    const r = spawnSync('bash', ['-c', `source '${FUN}' ; sh -c "\${MARIADB_LOGIN} \\"\\$c\\" \\"\\$@\\" -N -B \\"\\$d\\" -e 'SELECT 1'"`], { encoding: 'utf8', env: { PATH: `${bin}:/usr/bin:/bin`, ...env } });
    return r.stdout.trim();
  };
  assert.strictEqual(login({ MARIADB_USER: 'db', MARIADB_PASSWORD: 'db', MARIADB_DATABASE: 'db' }), 'ARGS -udb --password=db -N -B db -e SELECT 1');
  assert.strictEqual(login({ MYSQL_USER: 'app', MYSQL_PASSWORD: "it's", MYSQL_DATABASE: 'shop' }), "ARGS -uapp --password=it's -N -B shop -e SELECT 1");
  assert.strictEqual(login({ MARIADB_ROOT_PASSWORD: 'secret' }), 'ARGS -uroot --password=secret -N -B firstdb -e SELECT 1', 'only root: the first database that is not the server\'s own');
  assert.strictEqual(login({}), 'ARGS -N -B firstdb -e SELECT 1', 'DDEV\'s database: its own option file logs in');
});
