#!/usr/bin/env bun

import { Command } from "commander";
import { config } from "./utils/config";
import { setupEnvironment, ensureRoot } from "./utils/setup";
import * as commands from "./commands";
import chalk from "chalk";

const program = new Command();

// Setup environment before running commands
await setupEnvironment();

program
  .name("sprout")
  .description("Unconventional package manager - compile & install from git")
  .version(config.version);

// Add repository
program
  .command("add-repo <url>")
  .alias("ar")
  .description("Add a package repository")
  .action(async (url: string) => {
    await ensureRoot();
    await commands.addRepo(url);
  });

// Add repository from file/URL
program
  .command("add-repo-pkg <path>")
  .alias("arp")
  .description("Add repositories from a file or URL")
  .action(async (path: string) => {
    await ensureRoot();
    await commands.addRepoFromFile(path);
  });

// Install packages
program
  .command("install <packages...>")
  .alias("i")
  .description("Install packages from repositories")
  .action(async (packages: string[]) => {
    await ensureRoot();
    await commands.install(packages);
  });

// Install from repository URL
program
  .command("install-repo <url> [version]")
  .alias("ir")
  .description("Add and install a package from a git repository")
  .action(async (url: string, version?: string) => {
    await ensureRoot();
    await commands.installRepo(url, version);
  });

// Remove packages
program
  .command("remove <packages...>")
  .alias("r")
  .description("Remove installed packages")
  .option("-p, --purge", "Also remove system files (headers, libs, desktop)")
  .action(async (packages: string[], options: { purge?: boolean }) => {
    await ensureRoot();
    await commands.remove(packages, options.purge || false);
  });

// Remove repository
program
  .command("remove-repo <repos...>")
  .alias("rr")
  .description("Remove package repositories")
  .action(async (repos: string[]) => {
    await ensureRoot();
    await commands.removeRepo(repos);
  });

// List installed packages
program
  .command("list")
  .alias("l")
  .description("List installed packages")
  .action(async () => {
    await commands.list();
  });

// Search packages
program
  .command("search <queries...>")
  .alias("s")
  .description("Search for packages in repositories")
  .action(async (queries: string[]) => {
    await commands.search(queries);
  });

// List package files
program
  .command("files <package>")
  .alias("f")
  .description("List all files installed by a package")
  .action(async (packageName: string) => {
    await commands.files(packageName);
  });

// Update all packages
program
  .command("update")
  .alias("u")
  .description("Update all installed packages")
  .action(async () => {
    await ensureRoot();
    await commands.update();
  });

// Switch package version
program
  .command("switch <package> <version>")
  .alias("sw")
  .description("Switch active version of a package")
  .action(async (packageName: string, version: string) => {
    await ensureRoot();
    await commands.switchVersion(packageName, version);
  });

// List package versions
program
  .command("versions <package>")
  .alias("v")
  .description("List available versions for a package")
  .action(async (packageName: string) => {
    await commands.listVersions(packageName);
  });

// Custom help text
program.addHelpText(
  "after",
  `

${chalk.bold.magenta("Examples:")}
  ${chalk.gray("# Add a repository")}
  ${chalk.cyan("$ sprout ar https://github.com/user/repo")}

  ${chalk.gray("# Install a package")}
  ${chalk.cyan("$ sprout i packagename")}

  ${chalk.gray("# Install a specific version")}
  ${chalk.cyan("$ sprout i packagename:v1.2.3")}

  ${chalk.gray("# Install directly from git")}
  ${chalk.cyan("$ sprout ir https://github.com/user/repo v1.2.3")}

  ${chalk.gray("# Search for packages")}
  ${chalk.cyan("$ sprout s keyword")}

  ${chalk.gray("# List installed packages")}
  ${chalk.cyan("$ sprout l")}

  ${chalk.gray("# Update all packages")}
  ${chalk.cyan("$ sprout u")}

  ${chalk.gray("# Remove a package")}
  ${chalk.cyan("$ sprout r packagename")}

  ${chalk.gray("# Switch package version")}
  ${chalk.cyan("$ sprout sw packagename v1.2.3")}

  ${chalk.gray("# List package versions")}
  ${chalk.cyan("$ sprout v packagename")}

${chalk.bold.magenta("Documentation:")}
  For more information, visit: https://github.com/phukon/sprout
`,
);

// Handle case when no arguments provided
if (process.argv.length <= 2) {
  program.outputHelp();
  process.exit(0);
}

program.parse();
