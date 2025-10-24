import path from "path";
import { config } from "../utils/config";
import { readLines, fileExists } from "../utils/fs-utils";
import { extractPackageName } from "../utils/git-utils";
import { DependencyError } from "../utils/errors";

export interface Dependency {
  url: string;
  version?: string;
  name: string;
}

export class DependencyResolver {
  async getDependencies(
    packageName: string,
    buildDir: string,
  ): Promise<Dependency[]> {
    const deps: Dependency[] = [];

    // Check for pkgdeps in build directory (from cloned repo)
    const buildPkgdeps = path.join(buildDir, "pkgdeps");
    if (await fileExists(buildPkgdeps)) {
      const buildDeps = await this.parsePkgdeps(buildPkgdeps);
      deps.push(...buildDeps);
    }

    // Check for custom pkgdeps in config
    const customPkgdeps = path.join(config.dirs.deps, `${packageName}.pkgdeps`);
    if (await fileExists(customPkgdeps)) {
      const customDeps = await this.parsePkgdeps(customPkgdeps);
      deps.push(...customDeps);
    }

    return deps;
  }

  private async parsePkgdeps(filePath: string): Promise<Dependency[]> {
    const lines = await readLines(filePath);
    const deps: Dependency[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      // Format: "url version" or just "url"
      const parts = trimmed.split(/\s+/);
      const url = parts[0];
      const version = parts.length > 1 ? parts[1] : undefined;

      deps.push({
        url: url!,
        version,
        name: extractPackageName(url!),
      });
    }

    return deps;
  }

  async resolveDependencyOrder(
    dependencies: Dependency[],
  ): Promise<Dependency[]> {
    // For now, we return dependencies in order
    // Future enhancement: implement topological sort for proper ordering
    return dependencies;
  }

  async checkCircularDependencies(
    packageName: string,
    dependencies: Dependency[],
    visited: Set<string> = new Set(),
  ): Promise<void> {
    if (visited.has(packageName)) {
      throw new DependencyError(
        `Circular dependency detected involving: ${packageName}`,
        packageName,
      );
    }

    visited.add(packageName);

    // Check each dependency
    for (const dep of dependencies) {
      if (visited.has(dep.name)) {
        throw new DependencyError(
          `Circular dependency detected: ${packageName} -> ${dep.name}`,
          packageName,
        );
      }
    }
  }

  async isDependencyOf(
    packageName: string,
    potentialDependent: string,
  ): Promise<boolean> {
    // Check if packageName is a dependency of potentialDependent
    const buildDir = path.join(config.dirs.build, potentialDependent);

    if (!(await fileExists(buildDir))) {
      return false;
    }

    const deps = await this.getDependencies(potentialDependent, buildDir);
    return deps.some((dep) => dep.name === packageName);
  }

  async findDependents(packageName: string): Promise<string[]> {
    const dependents: string[] = [];
    const buildDir = config.dirs.build;

    if (!(await fileExists(buildDir))) {
      return dependents;
    }

    // Check all packages in build directory
    try {
      const { readdir } = await import("fs/promises");
      const entries = await readdir(buildDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const isDependent = await this.isDependencyOf(
            packageName,
            entry.name,
          );
          if (isDependent) {
            dependents.push(entry.name);
          }
        }
      }
    } catch {
      // Build directory might not exist
    }

    return dependents;
  }
}
