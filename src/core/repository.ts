import { config } from "../utils/config";
import {
  readLines,
  writeLines,
  appendLine,
  ensureDir,
  fileExists,
} from "../utils/fs-utils";
import {
  gitGetLatestTag,
  normalizeGitUrl,
  extractPackageName,
} from "../utils/git-utils";
import { logger } from "../utils/logger";
import { RepositoryError } from "../utils/errors";
import { execCommand } from "../utils/shell-utils";

export class Repository {
  private reposFile: string;

  constructor() {
    this.reposFile = config.files.repos;
  }

  async initialize(): Promise<void> {
    await ensureDir(config.dirs.repos);

    if (!(await fileExists(this.reposFile))) {
      await Bun.write(this.reposFile, "");
    }
  }

  async addRepository(url: string): Promise<string> {
    await this.initialize();

    const normalizedUrl = normalizeGitUrl(url);
    const repos = await this.listRepositories();

    // Check if already exists
    if (repos.includes(normalizedUrl)) {
      logger.skipped(`Repo already exists: ${normalizedUrl}`);
      return await gitGetLatestTag(url);
    }

    // Verify the repository is accessible
    const latestTag = await gitGetLatestTag(url);

    // Add to repos file
    await appendLine(this.reposFile, normalizedUrl);
    logger.success(`Successfully added repo: ${normalizedUrl}`);

    return latestTag;
  }

  async addRepositoriesFromFile(filePath: string): Promise<void> {
    const lines = await readLines(filePath);

    for (const line of lines) {
      if (line.trim()) {
        await this.addRepository(line.trim());
      }
    }
  }

  async addRepositoriesFromUrl(url: string): Promise<void> {
    const result = await execCommand("curl", ["-sL", url]);

    if (!result.success) {
      throw new RepositoryError(`Could not fetch repositories from: ${url}`);
    }

    const lines = result.stdout.split("\n");

    for (const line of lines) {
      if (line.trim()) {
        await this.addRepository(line.trim());
      }
    }
  }

  async removeRepository(url: string): Promise<void> {
    await this.initialize();

    const normalizedUrl = normalizeGitUrl(url);
    const repos = await this.listRepositories();

    const filtered = repos.filter((repo) => repo !== normalizedUrl);

    if (filtered.length === repos.length) {
      throw new RepositoryError(`Repository not found: ${normalizedUrl}`);
    }

    await writeLines(this.reposFile, filtered);
    logger.success(`Removed repository: ${normalizedUrl}`);
  }

  async listRepositories(): Promise<string[]> {
    await this.initialize();
    return readLines(this.reposFile);
  }

  async searchRepositories(query: string): Promise<string[]> {
    const repos = await this.listRepositories();
    return repos.filter((repo) =>
      repo.toLowerCase().includes(query.toLowerCase()),
    );
  }

  async findPackageUrl(packageName: string): Promise<string | null> {
    const repos = await this.listRepositories();

    for (const repo of repos) {
      const pkgName = extractPackageName(repo);
      if (pkgName === packageName.toLowerCase()) {
        return repo;
      }
    }

    return null;
  }

  async findPackageUrls(packageName: string): Promise<string[]> {
    const repos = await this.listRepositories();
    const matches: string[] = [];

    for (const repo of repos) {
      if (repo.toLowerCase().includes(packageName.toLowerCase())) {
        matches.push(repo);
      }
    }

    return matches;
  }
}
