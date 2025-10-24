import path from "path";
import type { BuildStrategy } from "./build-strategy";
import {
  CargoBuildStrategy,
  CMakeBuildStrategy,
  MakeBuildStrategy,
  MesonBuildStrategy,
  GoBuildStrategy,
  PythonBuildStrategy,
  ZigBuildStrategy,
  NimbleBuildStrategy,
  NinjaBuildStrategy,
  PnpmBuildStrategy,
  AutotoolsBuildStrategy,
} from "./strategies";
import { config } from "../utils/config";
import { fileExistsSync } from "../utils/fs-utils";
import { sourceAndRun } from "../utils/shell-utils";
import { logger } from "../utils/logger";
import { BuildError } from "../utils/errors";

export class Builder {
  private strategies: BuildStrategy[];

  constructor() {
    this.strategies = [
      new AutotoolsBuildStrategy(),
      new CargoBuildStrategy(),
      new CMakeBuildStrategy(),
      new GoBuildStrategy(),
      new MakeBuildStrategy(),
      new MesonBuildStrategy(),
      new NinjaBuildStrategy(),
      new NimbleBuildStrategy(),
      new PnpmBuildStrategy(),
      new PythonBuildStrategy(),
      new ZigBuildStrategy(),
    ];
  }

  async build(
    packageName: string,
    projectDir: string,
    installDir: string,
    url: string,
    version: string,
  ): Promise<void> {
    // Check for custom bldit script first
    const customBlditPath = path.join(config.dirs.bldit, packageName);
    if (fileExistsSync(customBlditPath)) {
      logger.detected("Custom bldit");
      await this.buildWithCustomScript(projectDir, customBlditPath);
      return;
    }

    // Check for bldit in project directory
    const projectBlditPath = path.join(projectDir, "bldit");
    if (fileExistsSync(projectBlditPath)) {
      logger.detected("bldit");
      await this.buildWithCustomScript(projectDir, projectBlditPath);
      return;
    }

    // Try each build strategy
    for (const strategy of this.strategies) {
      if (await strategy.detect(projectDir)) {
        logger.detected(strategy.getName());

        try {
          await strategy.build(projectDir, installDir, url, version);
          return;
        } catch (error) {
          if (error instanceof BuildError) {
            logger.error(error.message);
            // Try next strategy
            continue;
          }
          throw error;
        }
      }
    }

    throw new BuildError("No build system found", "Unknown");
  }

  private async buildWithCustomScript(
    projectDir: string,
    scriptPath: string,
  ): Promise<void> {
    const result = await sourceAndRun(scriptPath, "bldit", projectDir);

    if (!result.success) {
      throw new BuildError("Custom bldit script failed", "bldit");
    }
  }

  async detectBuildSystem(projectDir: string): Promise<string | null> {
    // Check custom scripts first
    const customBlditPath = path.join(
      config.dirs.bldit,
      path.basename(projectDir),
    );
    if (fileExistsSync(customBlditPath)) {
      return "Custom bldit";
    }

    const projectBlditPath = path.join(projectDir, "bldit");
    if (fileExistsSync(projectBlditPath)) {
      return "bldit";
    }

    // Check standard build systems
    for (const strategy of this.strategies) {
      if (await strategy.detect(projectDir)) {
        return strategy.getName();
      }
    }

    return null;
  }
}
