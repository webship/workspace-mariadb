/**
 * MariaDB, as a database engine: the facts the family's DATABASE menu draws from.
 *
 * A project's MariaDB is DDEV's `db` service (DDEV's default database), the runtime layer's `db` on Docker Compose,
 * Podman, Kubernetes, Lando or Docksal, or a MariaDB service of a compose file of the project's own. Every entry of
 * the menu runs cmd-tools-mariadb.sh, which the plugin installs into the sites folders.
 */

import { serverDetect } from '@webship.co/workspace-database';
import type { DatabaseEngine } from '@webship.co/workspace-database';

export const mariadbEngine: DatabaseEngine = {
  id: 'mariadb',
  title: 'MariaDB',
  script: 'cmd-tools-mariadb.sh',
  client: 'mariadb',
  detect: serverDetect('mariadb'),
  admins: [
    { id: 'adminer', label: 'Adminer', ddevAddon: { repo: 'ddev/ddev-adminer', service: 'adminer' } },
    { id: 'phpmyadmin', label: 'phpMyAdmin', ddevAddon: { repo: 'ddev/ddev-phpmyadmin', service: 'phpmyadmin' } },
  ],
  dumpExt: '.sql.gz',
  rowsAre: 'as MariaDB estimates them',
};
