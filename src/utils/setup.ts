import { essentialDirs, config, homeDir, getShellConfigFile } from "./config";
import { ensureDir, fileExists, appendLine } from "./fs-utils";
import { logger } from "./logger";

export async function setupEnvironment(): Promise<void> {
  // Create all essential directories
  for (const dir of essentialDirs) {
    await ensureDir(dir);
  }

  // Check if binDir is in PATH
  const pathEnv = process.env.PATH || "";
  if (!pathEnv.includes(config.dirs.bin)) {
    await addToPath();
  }
}

async function addToPath(): Promise<void> {
  const shellConfig = getShellConfigFile();

  if (!shellConfig) {
    logger.warning("Could not determine shell configuration file");
    logger.info(`Please manually add ${config.dirs.bin} to your PATH`);
    return;
  }

  if (!(await fileExists(shellConfig))) {
    logger.warning(`Shell configuration file not found: ${shellConfig}`);
    return;
  }

  const shellConfigContent = await Bun.file(shellConfig).text();

  if (shellConfigContent.includes(config.dirs.bin)) {
    // Already in config
    return;
  }

  const shell = process.env.SHELL || "";
  let pathCommand = "";

  if (shell.includes("fish")) {
    pathCommand = `fish_add_path -aP ${config.dirs.bin}`;
  } else if (shell.includes("nu")) {
    pathCommand = `use std/util "path add"\npath add "${config.dirs.bin}"`;
  } else {
    // bash, zsh, and others
    pathCommand = `PATH=$PATH:${config.dirs.bin}`;
  }

  await appendLine(shellConfig, pathCommand);
  logger.warning("PATH modified, please restart your shell or run:");
  logger.info(`  source ${shellConfig}`);
}

export async function checkRootPrivileges(): Promise<boolean> {
  // Check if running as root/sudo
  return process.getuid?.() === 0;
}

export async function ensureRoot(): Promise<void> {
  if (process.getuid && process.getuid() !== 0) {
    logger.error("This command requires root privileges");
    logger.info("Please run with sudo or doas");
    process.exit(1);
  }
}
