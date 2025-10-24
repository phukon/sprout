import fs from "fs/promises";
import path from "path";
import { config } from "../utils/config";
import { FileScanner } from "./file-scanner";
import { SymlinkManager } from "./symlink-manager";
import { copyFileWithPermissions, copyDir, ensureDir } from "../utils/fs-utils";
import { logger } from "../utils/logger";
import { InstallError } from "../utils/errors";

export class Installer {
  private fileScanner: FileScanner;
  private symlinkManager: SymlinkManager;

  constructor() {
    this.fileScanner = new FileScanner();
    this.symlinkManager = new SymlinkManager();
  }

  async install(
    packageName: string,
    buildDir: string,
    installDir: string,
    version: string = "HEAD"
  ): Promise<void> {
    try {
      // Ensure install directory exists
      await ensureDir(installDir);

      // Scan build directory for files
      const scanned = await this.fileScanner.scanBuildDirectory(buildDir);

      // Copy special directories (include/lib go to system dirs; package bin
      // directories are copied into the package install directory so we don't
      // create /usr/bin/<package> directories which would block creating
      // symlinks for individual executables.
      await this.copySpecialDirectories(scanned, packageName, installDir);

      // Copy executables to install directory
      for (const executable of scanned.executables) {
        const fileName = path.basename(executable);
        const destPath = path.join(installDir, fileName);
        await copyFileWithPermissions(executable, destPath);
      }

      // Copy libraries to system lib directory
      for (const library of scanned.libraries) {
        const fileName = path.basename(library);
        const destPath = path.join(config.dirs.lib, fileName);
        await copyFileWithPermissions(library, destPath);
      }

      // Copy headers to system include directory
      for (const header of scanned.headers) {
        const fileName = path.basename(header);
        const destPath = path.join(config.dirs.include, fileName);
        await copyFileWithPermissions(header, destPath);
      }

      logger.success("Installed binaries");

      // Create symlinks with package name and version info
      const symlinkCount = await this.symlinkManager.createSymlinks(installDir, packageName, version);
      logger.success(`Created ${symlinkCount} symlinks`);

      // Optionally create desktop file
      await this.promptCreateDesktopFile(packageName, buildDir);
    } catch (error) {
      throw new InstallError(
        `Failed to install ${packageName}: ${error instanceof Error ? error.message : "Unknown error"}`,
        packageName,
      );
    }
  }

  private async copySpecialDirectories(
    scanned: ReturnType<FileScanner["scanBuildDirectory"]> extends Promise<
      infer T
    >
      ? T
      : never,
    packageName: string,
    installDir: string,
  ): Promise<void> {
    // Copy include directories
    for (const includeDir of scanned.includeDirs) {
      const destDir = path.join(config.dirs.include, packageName);
      await copyDir(includeDir, destDir);
    }

    // Copy lib directories
    for (const libDir of scanned.libDirs) {
      const destDir = path.join(config.dirs.lib, packageName);
      await copyDir(libDir, destDir);
    }

    // Copy bin directories into the package's install location (e.g.
    // /var/sprout/pkgs/<pkg>/<version>/bin). We avoid copying them into the
    // system `bin` directory to prevent creating a directory named after the
    // package in /usr/bin which would shadow the intended executable symlink
    // at /usr/bin/<executable>.
    for (const binDir of scanned.binDirs) {
      const destDir = path.join(installDir, "bin");
      await copyDir(binDir, destDir);
    }
  }

  private async promptCreateDesktopFile(
    packageName: string,
    buildDir: string,
  ): Promise<void> {
    // In a real implementation, you'd prompt the user
    // For now, we'll skip this in the automated version
    // You can use a library like 'prompts' for interactive prompts

    logger.newLine();
    logger.info(
      `To create a desktop file for ${packageName}, you can manually create one at:`,
    );
    logger.info(`  ${path.join(config.dirs.apps, packageName)}.desktop`);
  }

  async createDesktopFile(
    packageName: string,
    execPath: string,
  ): Promise<void> {
    const desktopFileContent = `[Desktop Entry]
Name=${packageName}
Exec=${execPath}
Type=Application
Terminal=false`;

    const desktopFilePath = path.join(
      config.dirs.apps,
      `${packageName}.desktop`,
    );
    await Bun.write(desktopFilePath, desktopFileContent);
    logger.success(`Desktop file created: ${desktopFilePath}`);
  }

  // new helper: safe recursive copy that handles files, dirs, symlinks
  private async copyRecursive(src: string, dest: string) {
    const stat = await fs.lstat(src);
    if (stat.isDirectory()) {
      await fs.mkdir(dest, { recursive: true });
      const entries = await fs.readdir(src, { withFileTypes: true });
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
          await this.copyRecursive(srcPath, destPath);
        } else if (entry.isSymbolicLink()) {
          try {
            const target = await fs.readlink(srcPath);
            await fs.symlink(target, destPath);
          } catch {
            // fallback to copying content if symlink handling fails
            await fs.copyFile(srcPath, destPath);
          }
        } else {
          await fs.copyFile(srcPath, destPath);
        }
      }
    } else {
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.copyFile(src, dest);
    }
  }
}
