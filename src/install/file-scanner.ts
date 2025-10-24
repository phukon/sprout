import path from "path";
import { walkDir, isExecutableSync } from "../utils/fs-utils";

export interface ScannedFiles {
  executables: string[];
  libraries: string[];
  headers: string[];
  includeDirs: string[];
  libDirs: string[];
  binDirs: string[];
}

export class FileScanner {
  async scanBuildDirectory(buildDir: string): Promise<ScannedFiles> {
    const scanned: ScannedFiles = {
      executables: [],
      libraries: [],
      headers: [],
      includeDirs: [],
      libDirs: [],
      binDirs: [],
    };

    for await (const filePath of walkDir(buildDir)) {
      const fileName = path.basename(filePath);
      const baseName = path.basename(filePath);
      const dirName = path.basename(path.dirname(filePath));

      // Helper to push directory paths and avoid duplicates
      const pushDirOnce = (arr: string[], dir: string) => {
        if (!arr.includes(dir)) arr.push(dir);
      };

      // Check for special directories. We may see either the directory itself
      // (e.g. .../include) or files contained within it (.../include/foo.h).
      // In the latter case we should push the parent directory, not the file.
      if (baseName === "include" || dirName === "include") {
        const includeDir = baseName === "include" ? filePath : path.dirname(filePath);
        pushDirOnce(scanned.includeDirs, includeDir);
        continue;
      }

      if (baseName === "bin" || dirName === "bin") {
        const binDir = baseName === "bin" ? filePath : path.dirname(filePath);
        pushDirOnce(scanned.binDirs, binDir);
        continue;
      }

      if (
        ["lib", "libs", "lib32", "lib64"].includes(baseName) ||
        ["lib", "libs", "lib32", "lib64"].includes(dirName)
      ) {
        const libDir = ["lib", "libs", "lib32", "lib64"].includes(baseName)
          ? filePath
          : path.dirname(filePath);
        pushDirOnce(scanned.libDirs, libDir);
        continue;
      }

      // Check file types
      if (this.isExecutable(filePath, fileName)) {
        scanned.executables.push(filePath);
      } else if (this.isLibrary(fileName)) {
        scanned.libraries.push(filePath);
      } else if (this.isHeader(fileName)) {
        scanned.headers.push(filePath);
      }
    }

    return scanned;
  }

  private isExecutable(filePath: string, fileName: string): boolean {
    // Skip bldit files
    if (fileName === "bldit") {
      return false;
    }

    return isExecutableSync(filePath);
  }

  private isLibrary(fileName: string): boolean {
    const libraryExtensions = [
      ".so", // Shared object
      ".o", // Object file
      ".a", // Static library
      ".prl", // Qt project library
      ".spec", // RPM spec
    ];

    // Check for exact matches
    for (const ext of libraryExtensions) {
      if (fileName.endsWith(ext)) {
        return true;
      }
    }

    // Check for versioned libraries (e.g., libfoo.so.1.2.3)
    if (
      fileName.includes(".so.") ||
      fileName.includes(".o.") ||
      fileName.includes(".a.")
    ) {
      return true;
    }

    return false;
  }

  private isHeader(fileName: string): boolean {
    const headerExtensions = [".h", ".hpp", ".hxx", ".h++"];
    return headerExtensions.some((ext) => fileName.endsWith(ext));
  }
}
