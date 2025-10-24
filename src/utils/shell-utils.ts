import { spawn } from "bun";

export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export async function execCommand(
  command: string,
  args: string[] = [],
  options: { cwd?: string; silent?: boolean } = {},
): Promise<CommandResult> {
  const proc = spawn([command, ...args], {
    cwd: options.cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  if (!options.silent && stderr) {
    console.error(stderr);
  }

  return {
    success: exitCode === 0,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    exitCode,
  };
}

export async function execShell(
  command: string,
  options: { cwd?: string; silent?: boolean } = {},
): Promise<CommandResult> {
  const proc = spawn(["sh", "-c", command], {
    cwd: options.cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  if (!options.silent && stderr) {
    console.error(stderr);
  }

  return {
    success: exitCode === 0,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    exitCode,
  };
}

export async function checkCommandExists(command: string): Promise<boolean> {
  const result = await execCommand("which", [command], { silent: true });
  return result.success;
}

export async function sourceAndRun(
  scriptPath: string,
  functionName: string,
  cwd?: string,
): Promise<CommandResult> {
  const command = `source ${scriptPath} && ${functionName}`;
  return execShell(command, { cwd });
}
