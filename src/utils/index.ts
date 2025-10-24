// Configuration
export { config, homeDir, essentialDirs, getShellConfigFile } from "./config";

// Logging
export { logger } from "./logger";

// Spinner
export { Spinner, withSpinner } from "./spinner";

// Shell utilities
export {
  execCommand,
  execShell,
  checkCommandExists,
  sourceAndRun,
} from "./shell-utils";
export type { CommandResult } from "./shell-utils";

// Git utilities
export {
  gitClone,
  gitGetTags,
  gitGetLatestTag,
  normalizeGitUrl,
  extractPackageName,
} from "./git-utils";
export type { GitTag } from "./git-utils";

// File system utilities
export {
  ensureDir,
  removeDir,
  copyFileWithPermissions,
  copyDir,
  walkDir,
  isExecutable,
  isExecutableSync,
  createSymlinkSafe,
  fileExists,
  fileExistsSync,
  readLines,
  writeLines,
  appendLine,
} from "./fs-utils";

// Errors
export {
  BunpkgError,
  BuildError,
  DependencyError,
  InstallError,
  RepositoryError,
  PackageNotFoundError,
} from "./errors";

// Setup
export { setupEnvironment, checkRootPrivileges, ensureRoot } from "./setup";
