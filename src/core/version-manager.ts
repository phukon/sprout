import path from "path";
import { config } from "../utils/config";
import { fileExists } from "../utils/fs-utils";
import { readdir } from "fs/promises";

export interface PackageVersion {
  name: string;
  version: string;
  path: string;
}

export class VersionManager {
  async isPackageInstalled(
    packageName: string,
    version?: string,
  ): Promise<boolean> {
    if (version) {
      const pkgPath = path.join(config.dirs.pkgs, packageName, version);
      return fileExists(pkgPath);
    } else {
      const pkgPath = path.join(config.dirs.pkgs, packageName);
      return fileExists(pkgPath);
    }
  }

  async getInstalledVersions(packageName: string): Promise<string[]> {
    const pkgPath = path.join(config.dirs.pkgs, packageName);

    if (!(await fileExists(pkgPath))) {
      return [];
    }

    try {
      const entries = await readdir(pkgPath, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
    } catch {
      return [];
    }
  }

  async getLatestInstalledVersion(packageName: string): Promise<string | null> {
    const versions = await this.getInstalledVersions(packageName);

    if (versions.length === 0) {
      return null;
    }

    // If HEAD exists, return it
    if (versions.includes("HEAD")) {
      return "HEAD";
    }

    // Sort versions and return the last one
    versions.sort();
    return versions[versions.length - 1]!;
  }

  async listInstalledPackages(): Promise<PackageVersion[]> {
    const pkgsDir = config.dirs.pkgs;

    if (!(await fileExists(pkgsDir))) {
      return [];
    }

    const packages: PackageVersion[] = [];

    try {
      const entries = await readdir(pkgsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const versions = await this.getInstalledVersions(entry.name);

          for (const version of versions) {
            packages.push({
              name: entry.name,
              version,
              path: path.join(pkgsDir, entry.name, version),
            });
          }
        }
      }
    } catch {
      // Directory might not exist
    }

    return packages;
  }

  getPackagePath(packageName: string, version: string): string {
    return path.join(config.dirs.pkgs, packageName, version);
  }

  getBuildPath(packageName: string, version: string): string {
    return path.join(config.dirs.build, packageName, version);
  }
}
