import path from "path";
import { BaseBuildStrategy } from "./build-strategy";
import { fileExistsSync } from "../utils/fs-utils";
import {
  execCommand,
  execShell,
  checkCommandExists,
} from "../utils/shell-utils";
import { BuildError } from "../utils/errors";
import { parse as parseToml } from "toml";

export class CargoBuildStrategy extends BaseBuildStrategy {
  getName(): string {
    return "Cargo (Rust)";
  }

  getDetectionFile(): string {
    return "Cargo.toml";
  }

  async detect(projectDir: string): Promise<boolean> {
    return fileExistsSync(path.join(projectDir, this.getDetectionFile()));
  }

  async build(
    projectDir: string,
    installDir: string,
    url: string,
    version: string,
  ): Promise<void> {
    if (!(await checkCommandExists("cargo"))) {
      throw new BuildError("Cargo is not installed!", this.getName());
    }

    const tomlPath = path.join(projectDir, "Cargo.toml");
    const tomlContent = await Bun.file(tomlPath).text();
    const config = parseToml(tomlContent);
    const crateName = config.package?.name || "";

    const args = ["install", "--git", url, "--root", installDir];
    if (version !== "HEAD") {
      args.push("--tag", version);
    }
    args.push(crateName);

    const result = await execCommand("cargo", args, { cwd: projectDir });
    if (!result.success) {
      throw new BuildError("Cargo build failed", this.getName());
    }
  }
}

export class CMakeBuildStrategy extends BaseBuildStrategy {
  getName(): string {
    return "CMake";
  }

  getDetectionFile(): string {
    return "CMakeLists.txt";
  }

  async detect(projectDir: string): Promise<boolean> {
    return fileExistsSync(path.join(projectDir, this.getDetectionFile()));
  }

  async build(projectDir: string, installDir: string): Promise<void> {
    if (!(await checkCommandExists("cmake"))) {
      throw new BuildError("CMake is not installed!", this.getName());
    }

    const buildDir = path.join(projectDir, "build");
    await execCommand("mkdir", ["-p", buildDir]);

    let result = await execCommand("cmake", [".."], { cwd: buildDir });
    if (!result.success) {
      throw new BuildError("CMake configuration failed", this.getName());
    }

    result = await execCommand("make", [], { cwd: buildDir });
    if (!result.success) {
      throw new BuildError("Make build failed", this.getName());
    }
  }
}

export class MakeBuildStrategy extends BaseBuildStrategy {
  getName(): string {
    return "Make";
  }

  getDetectionFile(): string {
    return "Makefile";
  }

  async detect(projectDir: string): Promise<boolean> {
    return (
      fileExistsSync(path.join(projectDir, this.getDetectionFile())) ||
      fileExistsSync(path.join(projectDir, "Makefile.am"))
    );
  }

  async build(projectDir: string, installDir: string): Promise<void> {
    if (!(await checkCommandExists("make"))) {
      throw new BuildError("Make is not installed!", this.getName());
    }

    // Check for autogen/configure
    if (fileExistsSync(path.join(projectDir, "autogen.sh"))) {
      await execCommand("sh", ["autogen.sh"], { cwd: projectDir });
    }

    if (fileExistsSync(path.join(projectDir, "configure"))) {
      await execCommand("sh", ["configure"], { cwd: projectDir });
    }

    const result = await execCommand("make", [], { cwd: projectDir });
    if (!result.success) {
      throw new BuildError("Make build failed", this.getName());
    }
  }
}

export class MesonBuildStrategy extends BaseBuildStrategy {
  getName(): string {
    return "Meson";
  }

  getDetectionFile(): string {
    return "meson.build";
  }

  async detect(projectDir: string): Promise<boolean> {
    return fileExistsSync(path.join(projectDir, this.getDetectionFile()));
  }

  async build(projectDir: string, installDir: string): Promise<void> {
    if (!(await checkCommandExists("meson"))) {
      throw new BuildError("Meson is not installed!", this.getName());
    }

    let result = await execCommand("meson", ["setup", "build"], {
      cwd: projectDir,
    });
    if (!result.success) {
      throw new BuildError("Meson setup failed", this.getName());
    }

    result = await execCommand("meson", ["compile", "-C", "build"], {
      cwd: projectDir,
    });
    if (!result.success) {
      throw new BuildError("Meson build failed", this.getName());
    }
  }
}

export class GoBuildStrategy extends BaseBuildStrategy {
  getName(): string {
    return "Go";
  }

  getDetectionFile(): string {
    return "go.mod";
  }

  async detect(projectDir: string): Promise<boolean> {
    return fileExistsSync(path.join(projectDir, this.getDetectionFile()));
  }

  async build(
    projectDir: string,
    installDir: string,
    url: string,
    version: string,
  ): Promise<void> {
    if (!(await checkCommandExists("go"))) {
      throw new BuildError("Go is not installed!", this.getName());
    }

    await execCommand("go", ["env", "-w", `GOBIN=${installDir}`]);

    const installPath = version === "HEAD" ? url : `${url}@${version}`;
    const result = await execCommand("go", ["install", installPath], {
      cwd: projectDir,
    });

    if (!result.success) {
      throw new BuildError("Go build failed", this.getName());
    }
  }
}

export class PythonBuildStrategy extends BaseBuildStrategy {
  getName(): string {
    return "Python (pipx)";
  }

  getDetectionFile(): string {
    return "pyproject.toml";
  }

  async detect(projectDir: string): Promise<boolean> {
    return fileExistsSync(path.join(projectDir, this.getDetectionFile()));
  }

  async build(projectDir: string, installDir: string): Promise<void> {
    if (!(await checkCommandExists("pipx"))) {
      throw new BuildError("Pipx is not installed!", this.getName());
    }

    const tomlPath = path.join(projectDir, "pyproject.toml");
    const tomlContent = await Bun.file(tomlPath).text();
    const config = parseToml(tomlContent);
    const pkgName = config.project?.name || "";

    await execShell(`export PIPX_BIN_DIR=${installDir}`, { cwd: projectDir });

    const result = await execCommand("pipx", ["install", pkgName], {
      cwd: projectDir,
    });
    if (!result.success) {
      throw new BuildError("Pipx install failed", this.getName());
    }
  }
}

export class ZigBuildStrategy extends BaseBuildStrategy {
  getName(): string {
    return "Zig";
  }

  getDetectionFile(): string {
    return "build.zig";
  }

  async detect(projectDir: string): Promise<boolean> {
    return fileExistsSync(path.join(projectDir, this.getDetectionFile()));
  }

  async build(projectDir: string, installDir: string): Promise<void> {
    if (!(await checkCommandExists("zig"))) {
      throw new BuildError("Zig is not installed!", this.getName());
    }

    const result = await execCommand("zig", ["build"], { cwd: projectDir });
    if (!result.success) {
      throw new BuildError("Zig build failed", this.getName());
    }
  }
}

export class NimbleBuildStrategy extends BaseBuildStrategy {
  getName(): string {
    return "Nimble";
  }

  getDetectionFile(): string {
    return "*.nimble";
  }

  async detect(projectDir: string): Promise<boolean> {
    const { readdir } = await import("fs/promises");
    try {
      const files = await readdir(projectDir);
      return files.some((file) => file.endsWith(".nimble"));
    } catch {
      return false;
    }
  }

  async build(
    projectDir: string,
    installDir: string,
    url: string,
  ): Promise<void> {
    if (!(await checkCommandExists("nimble"))) {
      throw new BuildError("Nimble is not installed!", this.getName());
    }

    const pkgName = url.split("/").pop()?.replace(".git", "") || "";
    const result = await execCommand(
      "nimble",
      ["install", pkgName, "-p", installDir],
      { cwd: projectDir },
    );

    if (!result.success) {
      throw new BuildError("Nimble build failed", this.getName());
    }
  }
}

export class NinjaBuildStrategy extends BaseBuildStrategy {
  getName(): string {
    return "Ninja";
  }

  getDetectionFile(): string {
    return "build.ninja";
  }

  async detect(projectDir: string): Promise<boolean> {
    return fileExistsSync(path.join(projectDir, this.getDetectionFile()));
  }

  async build(projectDir: string, installDir: string): Promise<void> {
    if (!(await checkCommandExists("ninja"))) {
      throw new BuildError("Ninja is not installed!", this.getName());
    }

    const result = await execCommand("ninja", [], { cwd: projectDir });
    if (!result.success) {
      throw new BuildError("Ninja build failed", this.getName());
    }
  }
}

export class PnpmBuildStrategy extends BaseBuildStrategy {
  getName(): string {
    return "pnpm";
  }

  getDetectionFile(): string {
    return "pnpm-lock.yaml";
  }

  async detect(projectDir: string): Promise<boolean> {
    return fileExistsSync(path.join(projectDir, this.getDetectionFile()));
  }

  async build(projectDir: string, installDir: string): Promise<void> {
    if (!(await checkCommandExists("pnpm"))) {
      throw new BuildError("pnpm is not installed!", this.getName());
    }

    let result = await execCommand("pnpm", ["install"], { cwd: projectDir });
    if (!result.success) {
      throw new BuildError("pnpm install failed", this.getName());
    }

    result = await execCommand("pnpm", ["run", "build"], { cwd: projectDir });
    if (!result.success) {
      throw new BuildError("pnpm build failed", this.getName());
    }
  }
}

export class AutotoolsBuildStrategy extends BaseBuildStrategy {
  getName(): string {
    return "Autotools";
  }

  getDetectionFile(): string {
    return "configure";
  }

  async detect(projectDir: string): Promise<boolean> {
    return (
      fileExistsSync(path.join(projectDir, "configure")) ||
      fileExistsSync(path.join(projectDir, "configure.ac"))
    );
  }

  async build(projectDir: string, installDir: string): Promise<void> {
    let result = await execCommand("sh", ["configure"], { cwd: projectDir });
    if (!result.success) {
      throw new BuildError("Configure failed", this.getName());
    }

    if (fileExistsSync(path.join(projectDir, "CMakeLists.txt"))) {
      if (!(await checkCommandExists("cmake"))) {
        throw new BuildError("CMake is not installed!", this.getName());
      }
      const buildDir = path.join(projectDir, "build");
      await execCommand("mkdir", ["-p", buildDir]);
      await execCommand("cmake", [".."], { cwd: buildDir });
    }

    result = await execCommand("make", [], { cwd: projectDir });
    if (!result.success) {
      throw new BuildError("Make build failed", this.getName());
    }
  }
}
