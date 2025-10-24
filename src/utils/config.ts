import { homedir } from "os";
import path from "path";

export interface Config {
  dirs: {
    sprout: string;
    pkgs: string;
    build: string;
    bin: string;
    lib: string;
    include: string;
    config: string;
    repos: string;
    deps: string;
    bldit: string;
    apps: string;
  };
  files: {
    repos: string;
  };
  version: string;
}

export const config: Config = {
  dirs: {
    sprout: "/var/sprout",
    pkgs: "/var/sprout/pkgs",
    build: "/var/sprout/build",
    bin: "/usr/bin",
    lib: "/usr/lib",
    include: "/usr/include",
    config: "/etc/sprout",
    repos: "/etc/sprout/repos",
    deps: "/etc/sprout/deps",
    bldit: "/etc/sprout/bldit",
    apps: "/usr/share/applications",
  },
  files: {
    repos: "/etc/sprout/repos/repos",
  },
  version: "0.1.0-typescript",
};

export const homeDir = homedir();

export const essentialDirs = [
  config.dirs.sprout,
  config.dirs.pkgs,
  config.dirs.build,
  config.dirs.bin,
  config.dirs.lib,
  config.dirs.include,
  config.dirs.config,
  config.dirs.repos,
  config.dirs.deps,
  config.dirs.bldit,
  config.dirs.apps,
];

export function getShellConfigFile(): string | null {
  const shell = process.env.SHELL || "";

  if (shell.includes("bash")) {
    return path.join(homeDir, ".bashrc");
  } else if (shell.includes("zsh")) {
    return path.join(homeDir, ".zshrc");
  } else if (shell.includes("fish")) {
    return path.join(homeDir, ".config/fish/config.fish");
  } else if (shell.includes("nu")) {
    return path.join(homeDir, ".config/nushell/config.nu");
  }

  return null;
}
