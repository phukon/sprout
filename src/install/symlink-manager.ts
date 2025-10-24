import path from "path";
import { createSymlinkSafe, walkDir } from "../utils/fs-utils";
import { config } from "../utils/config";
import { unlink, lstat, readlink, readdir } from "fs/promises";
import { existsSync } from "fs";

export class SymlinkManager {
  async createSymlinks(installDir: string, packageName?: string, version?: string): Promise<number> {
    let count = 0;

    for await (const filePath of walkDir(installDir)) {
      const stats = await Bun.file(filePath).stat();

      if (stats.isDirectory()) {
        continue;
      }

      const fileName = path.basename(filePath);
      
      // Create standard symlink (points to latest version)
      const standardSymlinkPath = path.join(config.dirs.bin, fileName);
      const createdStandard = await createSymlinkSafe(filePath, standardSymlinkPath);
      if (createdStandard) {
        count++;
      }

      // Create version-specific symlink if package name and version are provided
      if (packageName && version) {
        const versionedSymlinkPath = path.join(config.dirs.bin, `${fileName}@${version}`);
        const createdVersioned = await createSymlinkSafe(filePath, versionedSymlinkPath);
        if (createdVersioned) {
          count++;
        }
      }
    }

    return count;
  }

  async removeSymlinks(installDir: string, packageName?: string, version?: string): Promise<number> {
    let count = 0;

    for await (const filePath of walkDir(installDir)) {
      const fileName = path.basename(filePath);
      
      // Remove standard symlink
      const standardSymlinkPath = path.join(config.dirs.bin, fileName);
      count += await this.removeSymlinkIfTargetMatches(standardSymlinkPath, installDir);

      // Remove version-specific symlink if package name and version are provided
      if (packageName && version) {
        const versionedSymlinkPath = path.join(config.dirs.bin, `${fileName}@${version}`);
        count += await this.removeSymlinkIfTargetMatches(versionedSymlinkPath, installDir);
      }
    }

    return count;
  }

  private async removeSymlinkIfTargetMatches(symlinkPath: string, installDir: string): Promise<number> {
    if (!existsSync(symlinkPath)) {
      return 0;
    }

    try {
      const st = await lstat(symlinkPath);

      // Only remove if it's a symbolic link. Don't touch regular files or
      // directories which could be system-owned.
      if (!st.isSymbolicLink()) {
        return 0;
      }

      // Resolve the link target and only unlink if it points to the
      // package install directory (safety check).
      const target = await readlink(symlinkPath);
      const absTarget = path.resolve(path.dirname(symlinkPath), target);

      if (absTarget.startsWith(installDir)) {
        await unlink(symlinkPath);
        return 1;
      }
    } catch {
      // Ignore errors; do not remove anything we can't confidently handle.
    }

    return 0;
  }

  async removeSymlinksForPackage(packageName: string): Promise<number> {
    const installDir = path.join(config.dirs.pkgs, packageName);
    return this.removeSymlinks(installDir);
  }

  async switchVersion(packageName: string, version: string): Promise<boolean> {
    const installDir = path.join(config.dirs.pkgs, packageName, version);
    
    if (!existsSync(installDir)) {
      return false;
    }

    let switched = false;
    
    for await (const filePath of walkDir(installDir)) {
      const stats = await Bun.file(filePath).stat();

      if (stats.isDirectory()) {
        continue;
      }

      const fileName = path.basename(filePath);
      const standardSymlinkPath = path.join(config.dirs.bin, fileName);
      
      // Update the standard symlink to point to the specified version
      const created = await createSymlinkSafe(filePath, standardSymlinkPath);
      if (created) {
        switched = true;
      }
    }

    return switched;
  }

  async listVersionedSymlinks(packageName: string): Promise<string[]> {
    const versionedSymlinks: string[] = [];
    
    try {
      const entries = await readdir(config.dirs.bin, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isSymbolicLink() && entry.name.includes(`@`)) {
          const symlinkPath = path.join(config.dirs.bin, entry.name);
          const target = await readlink(symlinkPath);
          
          // Check if this symlink points to our package
          if (target.includes(`/var/sprout/pkgs/${packageName}/`)) {
            versionedSymlinks.push(entry.name);
          }
        }
      }
    } catch {
      // Directory might not exist or we don't have permission
    }

    return versionedSymlinks;
  }
}
