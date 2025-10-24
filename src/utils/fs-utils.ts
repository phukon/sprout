import {
  mkdir,
  readdir,
  stat,
  unlink,
  rm,
  copyFile,
  symlink,
  readlink,
  chmod,
} from "fs/promises";
import { existsSync, statSync } from "fs";
import path from "path";

export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}

export async function removeDir(dirPath: string): Promise<void> {
  try {
    await rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    // Directory might not exist
  }
}

export async function copyFileWithPermissions(
  src: string,
  dest: string,
): Promise<void> {
  await copyFile(src, dest);

  const srcStat = await stat(src);
  await chmod(dest, srcStat.mode);
}

export async function copyDir(src: string, dest: string): Promise<void> {
  await ensureDir(dest);

  const entries = await readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await copyFileWithPermissions(srcPath, destPath);
    }
  }
}

export async function* walkDir(dir: string): AsyncGenerator<string> {
  if (!existsSync(dir)) {
    return;
  }

  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      yield fullPath;
      yield* walkDir(fullPath);
    } else {
      yield fullPath;
    }
  }
}

export async function isExecutable(filePath: string): Promise<boolean> {
  try {
    const stats = await stat(filePath);
    if (!stats.isFile()) {
      return false;
    }

    // Check if any execute bit is set
    const mode = stats.mode;
    const execBits = 0o111; // User, group, or other execute
    return (mode & execBits) !== 0;
  } catch {
    return false;
  }
}

export function isExecutableSync(filePath: string): boolean {
  try {
    const stats = statSync(filePath);
    if (!stats.isFile()) {
      return false;
    }

    const mode = stats.mode;
    const execBits = 0o111;
    return (mode & execBits) !== 0;
  } catch {
    return false;
  }
}

export async function createSymlinkSafe(
  target: string,
  linkPath: string,
): Promise<boolean> {
  try {
    // Check if symlink already exists
    if (existsSync(linkPath)) {
      // If the existing path is a directory, don't try to remove it here:
      // removing directories in system locations can be dangerous. Just skip
      // creating the symlink so we don't overwrite directories like
      // /usr/bin/<pkg>.
      try {
        const existingStat = statSync(linkPath);
        if (existingStat.isDirectory()) {
          return false;
        }
      } catch {
        // ignore stat errors and fallthrough to readlink/unlink behavior
      }

      try {
        const existingTarget = await readlink(linkPath);
        if (existingTarget === target) {
          return true; // Already points to the right place
        }
        await unlink(linkPath);
      } catch {
        // Not a symlink or couldn't read it; attempt to remove it if it's a
        // regular file
        try {
          await unlink(linkPath);
        } catch {
          return false;
        }
      }
    }

    await symlink(target, linkPath);
    return true;
  } catch (error) {
    return false;
  }
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export function fileExistsSync(filePath: string): boolean {
  return existsSync(filePath);
}

export async function readLines(filePath: string): Promise<string[]> {
  try {
    const file = Bun.file(filePath);
    const text = await file.text();
    return text.split("\n").filter((line) => line.trim().length > 0);
  } catch {
    return [];
  }
}

export async function writeLines(
  filePath: string,
  lines: string[],
): Promise<void> {
  const content = lines.join("\n") + "\n";
  await Bun.write(filePath, content);
}

export async function appendLine(
  filePath: string,
  line: string,
): Promise<void> {
  const file = Bun.file(filePath);
  let content = "";

  try {
    content = await file.text();
  } catch {
    // File doesn't exist yet
  }

  content += line + "\n";
  await Bun.write(filePath, content);
}
