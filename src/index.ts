/**
 * MariaDB for Webship Workspace.
 *
 * The DATABASE menu on every project whose database is MariaDB: its console in a screen, tables and sizes, an export
 * into the backups folder, an import of a dump that folder holds, the statements running now, the connection
 * details, and Adminer and phpMyAdmin on DDEV. All of it is the database family's surface
 * (@webship.co/workspace-database); this package is MariaDB's engine, its tool (cmd-tools-mariadb.sh, placed into
 * the sites folders) and its AI items.
 */

import type { PluginApi } from '@webship.co/workspace-plugin-api';
import { registerDatabase } from '@webship.co/workspace-database';

import { mariadbEngine } from './lib/engine';

export { mariadbEngine };

/** The AI items the installer places: agents in ai-agents/, skills in ai-skills/, commands in ai-commands/, prompts in ai-prompts/. */
export const AGENTS: string[] = ['mariadb-helper'];
export const SKILLS: string[] = ['mariadb-database'];
export const AI_COMMANDS: string[] = ['mariadb-sizes'];
export const PROMPTS: string[] = ['mariadb-dump-and-check'];

export function register(api: PluginApi): void {
  registerDatabase(api, mariadbEngine);
}
