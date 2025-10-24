import { execCommand } from "./shell-utils";
import { logger } from "./logger";

export interface GitTag {
  name: string;
  commit: string;
}

export async function gitClone(
  url: string,
  destination: string,
  options?: { branch?: string; depth?: number },
): Promise<boolean> {
  const args = ["-c", "advice.detachedHead=false", "clone"];

  if (options?.depth) {
    args.push("--depth", options.depth.toString());
  }

  if (options?.branch) {
    args.push("--branch", options.branch);
  }

  args.push(url, destination);

  const result = await execCommand("git", args, { silent: true });

  if (!result.success) {
    logger.error(`Could not clone repository: ${url}`);
    if (result.stderr) {
      logger.error(result.stderr);
    }
    return false;
  }

  return true;
}

export async function gitGetTags(url: string): Promise<GitTag[]> {
  const result = await execCommand(
    "git",
    ["ls-remote", "--tags", "--refs", url],
    { silent: true },
  );

  if (!result.success) {
    logger.warning(`Could not fetch tags from: ${url}`);
    return [];
  }

  const tags: GitTag[] = [];
  const lines = result.stdout.split("\n").filter((line) => line.trim());

  for (const line of lines) {
    const parts = line.split("\t");
    if (parts.length === 2) {
      const commit = parts[0];
      const ref = parts[1];
      const tagName = ref!.substring(ref!.lastIndexOf("/") + 1);
      tags.push({ name: tagName, commit: commit! });
    }
  }

  return tags;
}

export async function gitGetLatestTag(url: string): Promise<string> {
  const tags = await gitGetTags(url);

  if (tags.length === 0) {
    return "HEAD";
  }

  return tags[tags.length - 1]!.name;
}

export function normalizeGitUrl(url: string): string {
  return url.replace(/\.git$/, "");
}

export function extractPackageName(url: string): string {
  const normalized = normalizeGitUrl(url);
  const parts = normalized.split("/");
  const lastPart = parts[parts.length - 1];
  return lastPart!.toLowerCase();
}
