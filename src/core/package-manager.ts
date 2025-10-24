// import path from "path";
import { Repository } from "./repository";
import { VersionManager } from "./version-manager";
import { DependencyResolver } from "./dependency-resolver";
import { Builder } from "../build/builder";
import { Installer } from "../install/installer";
import { SymlinkManager } from "../install/symlink-manager";
import { config, essentialDirs } from "../utils/config";
import { gitClone, extractPackageName } from "../utils/git-utils";
import { ensureDir, removeDir } from "../utils/fs-utils";
import { logger } from "../utils/logger";
import { withSpinner } from "../utils/spinner";
import { PackageNotFoundError, InstallError } from "../utils/errors";

export class PackageManager {
  private repository: Repository;
  private versionManager: VersionManager;
  private dependencyResolver: DependencyResolver;
  private builder: Builder;
  private installer: Installer;
  private symlinkManager: SymlinkManager;

  constructor() {
    this.repository = new Repository();
    this.versionManager = new VersionManager();
    this.dependencyResolver = new DependencyResolver();
    this.builder = new Builder();
    this.installer = new Installer();
    this.symlinkManager = new SymlinkManager();
  }

  async initialize(): Promise<void> {
    // Ensure all essential directories exist
    for (const dir of essentialDirs) {
      await ensureDir(dir);
    }

    await this.repository.initialize();
  }

  async install(packageSpec: string): Promise<void> {
    await this.initialize();

    const { packageName, version } = this.parsePackageSpec(packageSpec);

    // Check if already installed
    if (await this.versionManager.isPackageInstalled(packageName, version)) {
      logger.info(`${packageName}:${version} is already installed!`);
      return;
    }

    // Find package URL
    const url = await this.repository.findPackageUrl(packageName);
    if (!url) {
      throw new PackageNotFoundError(packageName);
    }

    // Install the package
    await this.installFromUrl(url, version);
  }

  async installFromUrl(url: string, version: string = "HEAD"): Promise<void> {
    await this.initialize();

    const packageName = extractPackageName(url);
    const buildDir = this.versionManager.getBuildPath(packageName, version);
    const installDir = this.versionManager.getPackagePath(packageName, version);

    // Clean build directory
    await removeDir(buildDir);

    // Clone repository
    logger.info(`Cloning ${packageName}...`);
    const cloneOptions =
      version === "HEAD" ? { depth: 1 } : { branch: version, depth: 1 };
    const cloned = await withSpinner(() =>
      gitClone(url, buildDir, cloneOptions),
    );

    if (!cloned) {
      throw new InstallError(`Failed to clone repository: ${url}`, packageName);
    }

    // Resolve and install dependencies
    const deps = await this.dependencyResolver.getDependencies(
      packageName,
      buildDir,
    );

    if (deps.length > 0) {
      logger.info(`Installing ${deps.length} dependencies...`);

      for (const dep of deps) {
        if (
          await this.versionManager.isPackageInstalled(dep.name, dep.version)
        ) {
          logger.info(`${dep.name} already installed`);
          continue;
        }

        await this.installFromUrl(dep.url, dep.version || "HEAD");
      }
    }

    // Build the package
    logger.building(packageName);
    try {
      await withSpinner(() =>
        this.builder.build(packageName, buildDir, installDir, url, version),
      );
      logger.clearLine();
      logger.success(`Package built: ${packageName}`);
    } catch (error) {
      logger.clearLine();
      logger.error(`Build failed for ${packageName}`, error);
      throw error;
    }

    // Install files
    logger.installing(packageName);
    try {
      await withSpinner(() =>
        this.installer.install(packageName, buildDir, installDir, version),
      );
      logger.clearLine();
      logger.success(`Package installed: ${packageName}`);
    } catch (error) {
      logger.clearLine();
      logger.error(`Installation failed for ${packageName}`, error);
      throw error;
    }
  }

  async remove(packageName: string, version?: string): Promise<void> {
    await this.initialize();

    const versionToRemove =
      version ||
      (await this.versionManager.getLatestInstalledVersion(packageName));

    if (!versionToRemove) {
      logger.error(`Package not installed: ${packageName}`);
      return;
    }

    // Check if other packages depend on this
    const dependents =
      await this.dependencyResolver.findDependents(packageName);
    if (dependents.length > 0) {
      logger.error(
        `Cannot remove ${packageName}: it is required by: ${dependents.join(", ")}`,
      );
      return;
    }

    const installDir = this.versionManager.getPackagePath(
      packageName,
      versionToRemove,
    );
    const buildDir = this.versionManager.getBuildPath(
      packageName,
      versionToRemove,
    );

    // Remove symlinks
    logger.removing(packageName);
    await withSpinner(() => this.symlinkManager.removeSymlinks(installDir, packageName, versionToRemove));
    logger.clearLine();
    logger.success("Removed symlinks");

    // Remove package directory
    await withSpinner(async () => {
      await removeDir(installDir);
      await removeDir(buildDir);
    });
    logger.success(`Package removed: ${packageName}`);
  }

  async update(): Promise<void> {
    await this.initialize();

    const installed = await this.versionManager.listInstalledPackages();
    logger.info(`Updating ${installed.length} packages...`);

    for (const pkg of installed) {
      const url = await this.repository.findPackageUrl(pkg.name);
      if (!url) {
        logger.warning(`Could not find repository for ${pkg.name}`);
        continue;
      }

      logger.info(`Checking ${pkg.name}...`);
      // For now, we'll just reinstall. A better implementation would check versions
      await this.installFromUrl(url, pkg.version);
    }

    logger.success("All packages are up to date!");
  }

  async list(): Promise<void> {
    await this.initialize();

    const packages = await this.versionManager.listInstalledPackages();

    if (packages.length === 0) {
      logger.info("No packages installed");
      return;
    }

    logger.info("Installed packages:");
    for (const pkg of packages) {
      logger.plain(`  ${pkg.name}:${pkg.version}`);
    }
  }

  async search(query: string): Promise<void> {
    await this.initialize();

    const results = await this.repository.searchRepositories(query);

    if (results.length === 0) {
      logger.warning("No packages found");
      return;
    }

    logger.info(`Found ${results.length} packages:`);
    for (const url of results) {
      const pkgName = extractPackageName(url);
      logger.plain(`  ${pkgName}:\t${url}`);
    }
  }

  async switchVersion(packageName: string, version: string): Promise<void> {
    await this.initialize();

    if (!(await this.versionManager.isPackageInstalled(packageName, version))) {
      logger.error(`Package version not installed: ${packageName}:${version}`);
      return;
    }

    const switched = await this.symlinkManager.switchVersion(packageName, version);
    if (switched) {
      logger.success(`Switched ${packageName} to version ${version}`);
    } else {
      logger.error(`Failed to switch ${packageName} to version ${version}`);
    }
  }

  async listVersions(packageName: string): Promise<void> {
    await this.initialize();

    const versions = await this.versionManager.getInstalledVersions(packageName);
    const versionedSymlinks = await this.symlinkManager.listVersionedSymlinks(packageName);

    if (versions.length === 0) {
      logger.error(`Package not installed: ${packageName}`);
      return;
    }

    logger.info(`Available versions for ${packageName}:`);
    for (const version of versions) {
      const isActive = versionedSymlinks.some(symlink => symlink.includes(`@${version}`));
      logger.plain(`  ${version}${isActive ? " (active)" : ""}`);
    }
  }

  private parsePackageSpec(spec: string): {
    packageName: string;
    version: string;
  } {
    const parts = spec.split(":");
    return {
      packageName: parts[0]!,
      version: parts[1] || "HEAD",
    };
  }
}
