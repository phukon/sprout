export class BunpkgError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "BunpkgError";
  }
}

export class BuildError extends BunpkgError {
  constructor(
    message: string,
    public buildSystem: string,
  ) {
    super(message, "BUILD_FAILED", { buildSystem });
    this.name = "BuildError";
  }
}

export class DependencyError extends BunpkgError {
  constructor(
    message: string,
    public packageName: string,
  ) {
    super(message, "DEPENDENCY_ERROR", { packageName });
    this.name = "DependencyError";
  }
}

export class InstallError extends BunpkgError {
  constructor(
    message: string,
    public packageName: string,
  ) {
    super(message, "INSTALL_FAILED", { packageName });
    this.name = "InstallError";
  }
}

export class RepositoryError extends BunpkgError {
  constructor(
    message: string,
    public url?: string,
  ) {
    super(message, "REPOSITORY_ERROR", { url });
    this.name = "RepositoryError";
  }
}

export class PackageNotFoundError extends BunpkgError {
  constructor(packageName: string) {
    super(`Package not found: ${packageName}`, "PACKAGE_NOT_FOUND", {
      packageName,
    });
    this.name = "PackageNotFoundError";
  }
}
