Feature: The MariaDB plugin
  Once the plugin is activated and installed, a project row whose database is MariaDB carries the DATABASE menu, the
  plugin has its page in Settings, and its AI items are in the folders of their kind.

  # Settings lists every plugin the workspace has, by family; the package is on the plugin's own page.
  Scenario: Settings lists the plugin, and its own page names its package and its settings
    Given I am on "/settings"
     Then I should see "MariaDB"
     When I go to "/settings/plugin/mariadb"
     Then I should see "@webship.co/workspace-mariadb"
      And I should see "Web admin"
      And I should see "Exports kept per project"

  # A project of the dev folder with a .ddev/config.yaml that names no database: DDEV's default, MariaDB 10.11 (the
  # browser suite gives every folder one). The menu's body loads when it opens.
  @needs-project-dev
  Scenario: A DDEV project's row carries the DATABASE menu, with its MariaDB in the caption and the entries in the menu
    Given I am on "/dev"
     Then I should see "DATABASE"
      And I should see "MariaDB 10.11"
     When I click on the element ".act-menu-database > button"
      And I wait for the text "Tables and sizes" to appear
     Then I should see "Console (mariadb)"
      And I should see "Export to the backups folder"
      And I should see "Import a dump"
      And I should see "Running statements"
      And I should see "Connection details"
      And I should see "Web admin"

  # The AI folders are searched by name: with every plugin on, a folder lists more than one page of items.
  Scenario: The AI Agents folder lists the agent the plugin ships
    Given I am on "/ai-agents?q=mariadb-helper"
     Then I should see "mariadb-helper"

  Scenario: The AI Skills folder lists the skill the plugin ships
    Given I am on "/ai-skills?q=mariadb-database"
     Then I should see "mariadb-database"

  Scenario: The AI Commands folder lists the command the plugin ships
    Given I am on "/ai-commands?q=mariadb-sizes"
     Then I should see "mariadb-sizes"

  Scenario: The AI Prompts folder lists the prompt the plugin ships
    Given I am on "/ai-prompts?q=mariadb-dump-and-check"
     Then I should see "mariadb-dump-and-check"
