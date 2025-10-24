import { PackageManager } from "../core/package-manager";
import { Repository } from "../core/repository";
import { VersionManager } from "../core/version-manager";
import { logger } from "../utils/logger";
// import { extractPackageName } from "../utils/git-utils";
import { walkDir } from "../utils/fs-utils";
import path from "path";
import { config } from "../utils/config";

const pm = new PackageManager();
const repo = new Repository();
const versionMgr = new VersionManager();

export async function addRepo(url: string): Promise<void> {
  try {
    await repo.addRepository(url);
  } catch (error) {
    logger.error("Failed to add repository", error);
    process.exit(1);
  }
}

export async function addRepoFromFile(filePathOrUrl: string): Promise<void> {
  try {
    if (
      filePathOrUrl.startsWith("http://") ||
      filePathOrUrl.startsWith("https://")
    ) {
      await repo.addRepositoriesFromUrl(filePathOrUrl);
    } else {
      await repo.addRepositoriesFromFile(filePathOrUrl);
    }
  } catch (error) {
    logger.error("Failed to add repositories", error);
    process.exit(1);
  }
}

export async function install(packages: string[]): Promise<void> {
  try {
    for (const pkg of packages) {
      await pm.install(pkg);
    }
  } catch (error) {
    logger.error("Installation failed", error);
    process.exit(1);
  }
}

export async function installRepo(
  url: string,
  version?: string,
): Promise<void> {
  try {
    await pm.installFromUrl(url, version || "HEAD");
  } catch (error) {
    logger.error("Installation failed", error);
    process.exit(1);
  }
}

export async function remove(packages: string[], purge?: boolean): Promise<void> {
  try {
    for (const pkg of packages) {
      const parts = pkg.split(":");
      const packageName = parts[0]!;
      const version = parts[1];
      await pm.remove(packageName, version || "HEAD");
    }
  } catch (error) {
    logger.error("Removal failed", error);
    process.exit(1);
  }
}

export async function removeRepo(packageNames: string[]): Promise<void> {
  try {
    for (const pkgName of packageNames) {
      const urls = await repo.findPackageUrls(pkgName);

      if (urls.length === 0) {
        logger.error(`No repository found for: ${pkgName}`);
        continue;
      }

      if (urls.length === 1) {
        await repo.removeRepository(urls[0]!);
        continue;
      }

      // Multiple matches - show them
      logger.info(`Multiple repositories found for ${pkgName}:`);
      urls.forEach((url, index) => {
        logger.plain(`  ${index}: ${url}`);
      });

      // In a non-interactive version, remove the first match
      // In a real implementation, you'd prompt the user
      await repo.removeRepository(urls[0]!);
    }
  } catch (error) {
    logger.error("Failed to remove repository", error);
    process.exit(1);
  }
}

export async function list(): Promise<void> {
  try {
    await pm.list();
  } catch (error) {
    logger.error("Failed to list packages", error);
    process.exit(1);
  }
}

export async function search(queries: string[]): Promise<void> {
  try {
    for (const query of queries) {
      await pm.search(query);
    }
  } catch (error) {
    logger.error("Search failed", error);
    process.exit(1);
  }
}

export async function update(): Promise<void> {
  try {
    await pm.update();
  } catch (error) {
    logger.error("Update failed", error);
    process.exit(1);
  }
}

export async function files(packageName: string): Promise<void> {
  try {
    const versions = await versionMgr.getInstalledVersions(packageName);

    if (versions.length === 0) {
      logger.error(`Package not installed: ${packageName}`);
      return;
    }

    // Show files for all installed versions
    for (const version of versions) {
      logger.info(`Files for ${packageName}:${version}:`);
      const pkgPath = versionMgr.getPackagePath(packageName, version);

      for await (const filePath of walkDir(pkgPath)) {
        logger.plain(`  ${filePath}`);
      }

      // Also check system directories
      const includeDir = path.join(config.dirs.include, packageName);
      const libDir = path.join(config.dirs.lib, packageName);

      for await (const filePath of walkDir(includeDir)) {
        logger.plain(`  ${filePath}`);
      }

      for await (const filePath of walkDir(libDir)) {
        logger.plain(`  ${filePath}`);
      }
    }
  } catch (error) {
    logger.error("Failed to list files", error);
    process.exit(1);
  }
}

export async function switchVersion(packageName: string, version: string): Promise<void> {
  try {
    await pm.switchVersion(packageName, version);
  } catch (error) {
    logger.error("Failed to switch version", error);
    process.exit(1);
  }
}

export async function listVersions(packageName: string): Promise<void> {
  try {
    await pm.listVersions(packageName);
  } catch (error) {
    logger.error("Failed to list versions", error);
    process.exit(1);
  }
}
