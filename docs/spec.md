# Sprout Package Manager - Complete Specification & Architecture

**Version:** 0.1.0-typescript  
**Last Updated:** October 2025  
**Status:** Active Development

---

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Architecture](#architecture)
4. [Installation Flow](#installation-flow)
5. [Build Systems](#build-systems)
6. [File Management](#file-management)
7. [Dependency Resolution](#dependency-resolution)
8. [Version Management](#version-management)
9. [Removal & Cleanup](#removal--cleanup)
10. [Directory Structure](#directory-structure)
11. [File Formats](#file-formats)
12. [Command Reference](#command-reference)
13. [Known Limitations](#known-limitations)
14. [Future Enhancements](#future-enhancements)

---

## Overview

### What is Sprout?

Sprout is an unconventional package manager that builds and installs software directly from Git repositories. Unlike traditional package managers that download pre-compiled binaries, Sprout:

- Clones source code from Git repositories
- Detects the appropriate build system automatically
- Compiles the software for your specific system
- Manages multiple versions simultaneously
- Uses symlinks for clean version switching

### Key Principles

1. **Decentralized**: No central package registry required
2. **Transparent**: All source code is visible and auditable
3. **Optimized**: Software compiled specifically for your system
4. **Flexible**: Supports multiple build systems and languages
5. **Version-Safe**: Multiple versions can coexist

### Runtime

- **Platform**: Bun (fast JavaScript runtime)
- **Language**: TypeScript
- **Target**: Linux/Unix systems

---

## Core Concepts

### Building from Source

**The compilation process:**

```
Source Code (.c, .rs, .go, etc.)
          ↓
    [Compiler]
          ↓
   Object Files (.o)
          ↓
     [Linker]
          ↓
   Executable Binary
```

**Why build from source?**

| Advantage | Description |
|-----------|-------------|
| **Optimization** | Compiled for your CPU architecture and system |
| **Latest Code** | Direct from developers, no packaging lag |
| **Transparency** | You see exactly what's being installed |
| **Security** | No binary trust issues |
| **Flexibility** | Custom build options possible |

**Trade-offs:**

| Disadvantage | Impact |
|--------------|--------|
| **Slower** | Compilation takes time vs instant binary install |
| **Dependencies** | Requires build tools (compilers, make, etc.) |
| **Failures** | Complex builds may fail |
| **Disk Space** | Source + build artifacts temporarily stored |

### Git Repositories as Packages

Instead of a central registry, packages are identified by Git URLs:

```
Package Source: https://github.com/user/awesome-tool
         ↓
   git clone
         ↓
   /var/sprout/build/awesome-tool/HEAD/
```

**Advantages:**
- Any Git repo can be a package
- Version control built-in (tags, branches)
- No infrastructure needed
- Direct from developers

### Symlinks & PATH

**How commands are found:**

```bash
$ awesome-tool
```

1. **Shell checks PATH:**
   ```
   PATH=/usr/local/bin:/usr/bin:/bin
   ```

2. **Finds symlink:**
   ```
   /usr/bin/awesome-tool → /var/sprout/pkgs/awesome-tool/HEAD/awesome-tool
        (symlink)                     (actual binary)
   ```

3. **Executes target:**
   ```
   /var/sprout/pkgs/awesome-tool/HEAD/awesome-tool
   ```

**Benefits:**
- Clean version switching (just update symlink)
- Multiple versions coexist peacefully
- Easy rollback
- Standard Unix convention

---

## Architecture

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│                      CLI Layer                          │
│  (cli.ts + commands/)                                   │
│  • Command parsing (Commander.js)                       │
│  • User interaction                                     │
│  • Root privilege checks                                │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│              PackageManager (Orchestrator)              │
│  (core/package-manager.ts)                             │
│  • Coordinates all operations                           │
│  • High-level workflow management                       │
│  • Error handling & recovery                            │
└───┬─────┬─────┬─────┬─────┬─────┬──────────────────────┘
    │     │     │     │     │     │
┌───▼───┐ │     │     │     │     │
│ Repo  │ │     │     │     │     │
│ Mgmt  │ │     │     │     │     │
└───────┘ │     │     │     │     │
          │     │     │     │     │
     ┌────▼──┐  │     │     │     │
     │Version│  │     │     │     │
     │ Mgmt  │  │     │     │     │
     └───────┘  │     │     │     │
                │     │     │     │
           ┌────▼──┐  │     │     │
           │  Dep  │  │     │     │
           │Resolve│  │     │     │
           └───────┘  │     │     │
                      │     │     │
                 ┌────▼───┐ │     │
                 │Builder │ │     │
                 │+Strats │ │     │
                 └────────┘ │     │
                            │     │
                      ┌─────▼──┐  │
                      │  File  │  │
                      │Scanner │  │
                      └────────┘  │
                                  │
                            ┌─────▼────┐
                            │Installer │
                            │+Symlinks │
                            └──────────┘
```

### Module Responsibilities

| Module | File | Responsibility |
|--------|------|----------------|
| **PackageManager** | `core/package-manager.ts` | Main orchestrator, coordinates entire package lifecycle |
| **Repository** | `core/repository.ts` | Manages package repository URLs, search, add/remove |
| **VersionManager** | `core/version-manager.ts` | Tracks installed versions, provides package paths |
| **DependencyResolver** | `core/dependency-resolver.ts` | Parses pkgdeps, resolves dependencies, checks circular deps |
| **Builder** | `build/builder.ts` | Detects build system, delegates to appropriate strategy |
| **BuildStrategies** | `build/strategies.ts` | Language-specific build implementations |
| **FileScanner** | `install/file-scanner.ts` | Identifies executables, libraries, headers in build output |
| **Installer** | `install/installer.ts` | Copies files to installation locations |
| **SymlinkManager** | `install/symlink-manager.ts` | Creates/removes symlinks in /usr/bin |
| **CLI** | `cli.ts` | Command-line interface, argument parsing |
| **Commands** | `commands/index.ts` | Command implementations (install, remove, list, etc.) |
| **Utilities** | `utils/` | Git, shell, filesystem, logging helpers |

---

## Installation Flow

### Complete Installation Sequence

```
┌─────────────────────────────────────────────────────┐
│ 1. USER COMMAND                                     │
│    $ sprout install awesome-tool:v1.0.0             │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│ 2. PARSE PACKAGE SPECIFICATION                      │
│    package: "awesome-tool"                          │
│    version: "v1.0.0"                                │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│ 3. CHECK IF ALREADY INSTALLED                       │
│    VersionManager.isPackageInstalled()              │
│    • Yes → Skip, show message                       │
│    • No  → Continue                                 │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│ 4. FIND PACKAGE URL                                 │
│    Repository.findPackageUrl("awesome-tool")        │
│    • Searches /etc/sprout/repos/repos               │
│    • Matches package name from URL                  │
│    • Returns: https://github.com/user/awesome-tool  │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│ 5. CLONE REPOSITORY                                 │
│    git clone --depth 1 --branch v1.0.0 \            │
│      https://github.com/user/awesome-tool \         │
│      /var/sprout/build/awesome-tool/v1.0.0          │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│ 6. RESOLVE DEPENDENCIES                             │
│    DependencyResolver.getDependencies()             │
│    • Check ./pkgdeps in cloned repo                 │
│    • Check /etc/sprout/deps/awesome-tool.pkgdeps    │
│    • Parse format: "url version"                    │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│ 7. INSTALL DEPENDENCIES (RECURSIVE)                 │
│    For each dependency:                             │
│      • Check if already installed                   │
│      • If not: PackageManager.install(dep) → Step 1 │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│ 8. DETECT BUILD SYSTEM                              │
│    Builder.build()                                  │
│    Priority order:                                  │
│    1. /etc/sprout/bldit/awesome-tool (custom)       │
│    2. ./bldit (project-specific)                    │
│    3. Cargo.toml → Cargo strategy                   │
│    4. CMakeLists.txt → CMake strategy               │
│    5. Makefile → Make strategy                      │
│    6. go.mod → Go strategy                          │
│    7. ... (see Build Systems section)               │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│ 9. BUILD PACKAGE                                    │
│    BuildStrategy.build()                            │
│    Example (Cargo):                                 │
│      cargo install --git URL --root installDir      │
│    Output: Compiled binaries in build directory     │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│ 10. SCAN BUILD OUTPUT                               │
│     FileScanner.scanBuildDirectory()                │
│     Identifies:                                     │
│     • Executables (files with +x permission)        │
│     • Libraries (.so, .a, .o files)                 │
│     • Headers (.h, .hpp files)                      │
│     • Special dirs (bin/, lib/, include/)           │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│ 11. INSTALL FILES                                   │
│     Installer.install()                             │
│     • Executables → /var/sprout/pkgs/pkg/ver/       │
│     • Libraries   → /usr/lib/                       │
│     • Headers     → /usr/include/                   │
│     • Lib dirs    → /usr/lib/awesome-tool/          │
│     • Include dirs→ /usr/include/awesome-tool/      │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│ 12. CREATE SYMLINKS                                 │
│     SymlinkManager.createSymlinks()                 │
│     For each executable:                            │
│       ln -s /var/sprout/pkgs/pkg/ver/exe \          │
│               /usr/bin/exe                          │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│ 13. CLEANUP & SUCCESS                               │
│     • Build directory remains for future reference  │
│     • Package ready to use                          │
│     • User can type 'awesome-tool' to run           │
└─────────────────────────────────────────────────────┘
```

### State Transitions

```
┌─────────────┐
│ NOT_FOUND   │ ──add-repo──> ┌──────────────┐
└─────────────┘               │ IN_REPO_LIST │
                              └──────┬───────┘
                                     │ install
                                     ▼
                              ┌──────────────┐
                              │  CLONING     │
                              └──────┬───────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │  RESOLVING   │ ─→ (recursively install deps)
                              │  DEPS        │
                              └──────┬───────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │  BUILDING    │
                              └──────┬───────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │  INSTALLING  │
                              └──────┬───────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │  INSTALLED   │ ──remove──> ┌─────────────┐
                              └──────────────┘             │  REMOVED    │
                                     ▲                     └─────────────┘
                                     │
                                     └── update (reinstall)
```

---

## Build Systems

### Strategy Pattern Implementation

Each build system implements the `BuildStrategy` interface:

```typescript
interface BuildStrategy {
  detect(projectDir: string): Promise<boolean>;
  build(projectDir: string, installDir: string, url: string, version: string): Promise<void>;
  getName(): string;
  getDetectionFile(): string;
}
```

### Supported Build Systems

| Build System | Language | Detection File | Build Command |
|--------------|----------|----------------|---------------|
| **Cargo** | Rust | `Cargo.toml` | `cargo install --git URL --root DIR` |
| **CMake** | C/C++ | `CMakeLists.txt` | `cmake .. && make` |
| **Make** | C/C++/Any | `Makefile` | `make` |
| **Autotools** | C/C++ | `configure` | `./configure && make` |
| **Meson** | C/C++/Any | `meson.build` | `meson setup build && meson compile` |
| **Ninja** | Any | `build.ninja` | `ninja` |
| **Go** | Go | `go.mod` | `go install URL@VERSION` |
| **Python** | Python | `pyproject.toml` | `pipx install PACKAGE` |
| **Zig** | Zig | `build.zig` | `zig build` |
| **Nimble** | Nim | `*.nimble` | `nimble install PACKAGE` |
| **pnpm** | Node.js | `pnpm-lock.yaml` | `pnpm install && pnpm run build` |

### Build System Detection Order

```
1. /etc/sprout/bldit/package-name (highest priority)
   ↓ (not found)
2. ./bldit (in project root)
   ↓ (not found)
3. Autotools (configure)
   ↓ (not found)
4. Cargo (Cargo.toml)
   ↓ (not found)
5. CMake (CMakeLists.txt)
   ↓ (not found)
6. Go (go.mod)
   ↓ (not found)
7. Make (Makefile)
   ↓ (not found)
... (continues through all strategies)
   ↓ (none found)
ERROR: No build system detected
```

### Custom Build Scripts (bldit)

Users can provide custom build instructions:

**Global custom script:**
```bash
# /etc/sprout/bldit/awesome-tool
bldit() {
  ./configure --prefix=/usr
  make -j$(nproc)
  make install DESTDIR=$PWD/install
}
```

**Project-specific script:**
```bash
# ./bldit (in project root)
bldit() {
  mkdir -p build
  cd build
  cmake .. -DCMAKE_BUILD_TYPE=Release
  make -j$(nproc)
}
```

The script must define a `bldit()` function that performs the build.

---

## File Management

### File Type Identification

The `FileScanner` categorizes files during the scanning phase:

```typescript
interface ScannedFiles {
  executables: string[];    // Files with execute permission
  libraries: string[];      // .so, .a, .o files
  headers: string[];        // .h, .hpp files
  includeDirs: string[];    // include/ directories
  libDirs: string[];        // lib/, lib64/ directories
  binDirs: string[];        // bin/ directories
}
```

#### Executable Detection

```typescript
isExecutable(filePath: string): boolean {
  const stats = statSync(filePath);
  if (!stats.isFile()) return false;
  
  // Check if any execute bit is set (user, group, or other)
  const mode = stats.mode;
  const execBits = 0o111;  // Binary: 001 001 001
  return (mode & execBits) !== 0;
}
```

**Execute bits explained:**

```
File Permissions: rwxr-xr-x
                  ||||||||| 
                  |||++++++-- Other: r-x (read + execute)
                  |||
                  +++------- Group: r-x (read + execute)
                  |
                  +--------- User: rwx (read + write + execute)

Octal: 0o755
Binary: 111 101 101
         |   |   |
         |   |   +-- Other: execute bit SET
         |   +------ Group: execute bit SET
         +---------- User: execute bit SET
```

#### Library Detection

```typescript
isLibrary(fileName: string): boolean {
  // Static libraries
  if (fileName.endsWith('.a')) return true;
  
  // Object files
  if (fileName.endsWith('.o')) return true;
  
  // Shared libraries
  if (fileName.endsWith('.so')) return true;
  
  // Versioned shared libraries: libfoo.so.1.2.3
  if (fileName.includes('.so.')) return true;
  
  return false;
}
```

**Library types:**

| Extension | Type | Description | Example |
|-----------|------|-------------|---------|
| `.a` | Static | Compiled code linked directly into executable | `libawesome.a` |
| `.so` | Shared | Loaded at runtime, shared between programs | `libawesome.so` |
| `.so.X` | Versioned | Shared library with version number | `libawesome.so.1.2.3` |
| `.o` | Object | Compiled but not yet linked | `awesome.o` |

#### Header Detection

```typescript
isHeader(fileName: string): boolean {
  const extensions = ['.h', '.hpp', '.hxx', '.h++'];
  return extensions.some(ext => fileName.endsWith(ext));
}
```

### Installation Destinations

| File Type | Source Example | Destination |
|-----------|----------------|-------------|
| **Executables** | `build/target/release/awesome-tool` | `/var/sprout/pkgs/awesome-tool/v1.0.0/awesome-tool` |
| **Libraries** | `build/lib/libawesome.so` | `/usr/lib/libawesome.so` |
| **Headers** | `build/include/awesome.h` | `/usr/include/awesome.h` |
| **Lib Directory** | `build/lib/` | `/usr/lib/awesome-tool/` |
| **Include Directory** | `build/include/` | `/usr/include/awesome-tool/` |
| **Bin Directory** | `build/bin/` | `/var/sprout/pkgs/awesome-tool/v1.0.0/bin/` |
| **Symlinks** | (created for executables) | `/usr/bin/awesome-tool → /var/sprout/pkgs/.../awesome-tool` |

### Special Directory Handling

**Include directories:**
```
build/include/awesome/
  ├── core.h
  ├── utils.h
  └── config.h

Installed to:
/usr/include/awesome-tool/
  ├── core.h
  ├── utils.h
  └── config.h
```

**Library directories:**
```
build/lib/
  ├── libawesome.so.1.0.0
  ├── static/
  │   └── libawesome.a
  └── plugins/
      └── awesome-plugin.so

Installed to:
/usr/lib/awesome-tool/
  ├── libawesome.so.1.0.0
  ├── static/
  │   └── libawesome.a
  └── plugins/
      └── awesome-plugin.so
```

---

## Dependency Resolution

### Dependency File Format (pkgdeps)

**Location priority:**
1. `/etc/sprout/deps/package-name.pkgdeps` (user-defined, highest priority)
2. `./pkgdeps` (in project root, shipped with package)

**Format:**
```
# Comments start with #
https://github.com/user/dependency1
https://github.com/user/dependency2 v1.2.3
https://github.com/user/dependency3 HEAD
```

**Syntax:**
```
<git-url> [version]

Where:
  git-url  = Full HTTPS git repository URL
  version  = Optional: git tag, branch, or "HEAD" (default: HEAD)
```

**Example:**
```
# /etc/sprout/deps/awesome-tool.pkgdeps
https://github.com/rust-lang/regex
https://github.com/serde-rs/serde v1.0.195
https://github.com/tokio-rs/tokio HEAD
```

### Dependency Resolution Algorithm

```
function resolveDependencies(packageName):
  1. Read pkgdeps files (user-defined overrides project-defined)
  2. Parse each line into {url, version, name}
  3. For each dependency:
       a. Check if already installed
       b. If not installed:
            - Recursively call install(dependency)
       c. If installed:
            - Log "already installed" and skip
  4. Return when all dependencies processed
```

**Current limitations:**
- No transitive dependency resolution (dependencies don't auto-resolve their dependencies)
- No version conflict resolution
- No circular dependency detection at package level (only at immediate deps)

### Circular Dependency Detection

```typescript
checkCircularDependencies(
  packageName: string, 
  dependencies: Dependency[], 
  visited: Set<string> = new Set()
): void {
  if (visited.has(packageName)) {
    throw Error(`Circular dependency: ${packageName}`);
  }
  
  visited.add(packageName);
  
  for (const dep of dependencies) {
    if (visited.has(dep.name)) {
      throw Error(`Circular: ${packageName} → ${dep.name}`);
    }
  }
}
```

**Limitation:** Only checks one level deep. A → B → A would be caught, but A → B → C → A would not.

### Dependent Tracking (for safe removal)

Before removing a package, check if other packages depend on it:

```typescript
async findDependents(packageName: string): Promise<string[]> {
  const dependents: string[] = [];
  
  // Check all packages in build directory
  for each package in /var/sprout/build/:
    deps = getDependencies(package);
    if (deps.includes(packageName)):
      dependents.push(package);
  
  return dependents;
}
```

**Usage:**
```bash
$ sprout remove libawesome

# Checks:
dependents = findDependents("libawesome")
if dependents.length > 0:
  ERROR: Cannot remove libawesome: required by awesome-tool, cool-app
else:
  # Safe to remove
```

---

## Version Management

### Version Storage Structure

```
/var/sprout/pkgs/
  └── awesome-tool/
      ├── HEAD/                    ← Latest from default branch
      │   ├── awesome-tool         ← Executable
      │   └── bin/                 ← Additional executables
      ├── v1.0.0/                  ← Specific git tag
      │   └── awesome-tool
      ├── v1.1.0/
      │   └── awesome-tool
      └── v2.0.0/
          └── awesome-tool
```

### Version Specification

```bash
# Install latest (HEAD)
sprout install awesome-tool

# Install specific version (git tag)
sprout install awesome-tool:v1.0.0

# Install specific branch
sprout install awesome-tool:main

# Install specific commit (if supported)
sprout install awesome-tool:a1b2c3d
```

### Version Resolution

```typescript
parsePackageSpec(spec: string): {packageName: string, version: string} {
  const parts = spec.split(':');
  return {
    packageName: parts[0],
    version: parts[1] || 'HEAD'  // Default to HEAD if not specified
  };
}
```

**Examples:**
```
"awesome-tool"        → {packageName: "awesome-tool", version: "HEAD"}
"awesome-tool:v1.0.0" → {packageName: "awesome-tool", version: "v1.0.0"}
"awesome-tool:main"   → {packageName: "awesome-tool", version: "main"}
```

### Version Checking

```typescript
async isPackageInstalled(packageName: string, version?: string): Promise<boolean> {
  if (version) {
    // Check specific version
    const path = `/var/sprout/pkgs/${packageName}/${version}`;
    return fileExists(path);
  } else {
    // Check if any version exists
    const path = `/var/sprout/pkgs/${packageName}`;
    return fileExists(path);
  }
}
```

### Multi-Version Package Management

Sprout supports installing and managing multiple versions of the same package simultaneously:

#### Version-Specific Symlinks

When installing packages, Sprout creates two types of symlinks:

- **Standard symlink**: `/usr/bin/awesome-tool` (points to active version)
- **Version-specific symlink**: `/usr/bin/awesome-tool:v1.0.0` (always points to specific version)

This allows you to:
- Run the active version: `awesome-tool`
- Run a specific version: `awesome-tool:v1.0.0`
- Switch between versions easily
- Keep multiple versions installed for testing or compatibility

#### Version Switching

```bash
# Switch active version
sprout switch awesome-tool v1.0.0
# Updated: /usr/bin/awesome-tool → /var/sprout/pkgs/awesome-tool/v1.0.0/awesome-tool

# List available versions
sprout versions awesome-tool
# Available versions:
#   v1.0.0 (active)
#   v2.0.0
#   HEAD
```

#### Installation Examples

```bash
# Install multiple versions
sprout install awesome-tool:v1.0.0
sprout install awesome-tool:v2.0.0
sprout install awesome-tool:HEAD

# Each version creates its own symlinks:
# /usr/bin/awesome-tool       → points to active version
# /usr/bin/awesome-tool:v1.0.0 → always points to v1.0.0
# /usr/bin/awesome-tool:v2.0.0 → always points to v2.0.0
# /usr/bin/awesome-tool:HEAD   → always points to HEAD

# Switch between versions
sprout switch awesome-tool v1.0.0
sprout switch awesome-tool v2.0.0
```

#### Removal with Version Support

```bash
# Remove specific version (keeps other versions)
sprout remove awesome-tool:v1.0.0
# Removes v1.0.0 but keeps v2.0.0 and HEAD

# Remove all versions
sprout remove awesome-tool
# Removes all installed versions of awesome-tool
```

### Active Version (Symlink Target)

The symlink in `/usr/bin/` points to the "active" version:

```bash
# Check which version is active
$ ls -la /usr/bin/awesome-tool
lrwxrwxrwx ... /usr/bin/awesome-tool -> /var/sprout/pkgs/awesome-tool/v1.0.0/awesome-tool

# Check version-specific symlinks
$ ls -la /usr/bin/awesome-tool@*
lrwxrwxrwx ... /usr/bin/awesome-tool:v1.0.0 -> /var/sprout/pkgs/awesome-tool/v1.0.0/awesome-tool
lrwxrwxrwx ... /usr/bin/awesome-tool:v2.0.0 -> /var/sprout/pkgs/awesome-tool/v2.0.0/awesome-tool

# Switch active version
sprout switch awesome-tool v2.0.0
# Updated: /usr/bin/awesome-tool → /var/sprout/pkgs/awesome-tool/v2.0.0/awesome-tool
```

---

## Removal & Cleanup

### Removal Process

```bash
sprout remove awesome-tool
```

**Steps:**

```
┌─────────────────────────────────────────────────────┐
│ 1. CHECK FOR DEPENDENTS                             │
│    findDependents("awesome-tool")                   │
│    • If dependents exist → ERROR, abort             │
│    • If no dependents → Continue                    │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│ 2. DETERMINE VERSION TO REMOVE                      │
│    • If version specified: use that                 │
│    • If not specified: use latest installed         │
│      (HEAD if exists, else highest version)         │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│ 3. REMOVE SYMLINKS                                  │
│    SymlinkManager.removeSymlinks(installDir)        │
│    For each executable in installDir:               │
│      • Check if /usr/bin/exe exists                 │
│      • Verify it's a symlink                        │
│      • Verify target is in installDir               │
│      • Remove symlink safely                        │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│ 4. REMOVE PACKAGE DIRECTORY                         │
│    rm -rf /var/sprout/pkgs/awesome-tool/v1.0.0      │
└────────────────┬────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────┐
│ 5. REMOVE BUILD DIRECTORY                           │
│    rm -rf /var/sprout/build/awesome-tool/v1.0.0     │
└─────────────────────────────────────────────────────┘
```

### What Gets Removed ✅

| Item | Location | Removed? |
|------|----------|----------|
| Executables | `/var/sprout/pkgs/pkg/ver/*` | ✅ Yes |
| Symlinks | `/usr/bin/*` | ✅ Yes (safely) |
| Build directory | `/var/sprout/build/pkg/ver/` | ✅ Yes |
| Package-named lib dirs | `/usr/lib/pkg/` | ✅ Yes |
| Package-named include dirs | `/usr/include/pkg/` | ✅ Yes |

### What Does NOT Get Removed ❌

| Item | Location | Removed? | Impact |
|------|----------|----------|--------|
| Individual libraries | `/usr/lib/libawesome.so` | ❌ No | Accumulates over time |
| Individual headers | `/usr/include/awesome.h` | ❌ No | Clutters system includes |
| Desktop files | `/usr/share/applications/` | ❌ No | Old entries remain |
| Config files | `/etc/`, `~/.config/` | ❌ No | User data preserved (good) |

### Cleanup Quality Assessment

**Score: 6/10**

**Pros:**
- ✅ Safe symlink removal (checks before deletion)
- ✅ Dependency-aware (won't remove if other packages depend on it)
- ✅ Removes package-specific directories
- ✅ Clean build artifact removal

**Cons:**
- ❌ No file manifest tracking
- ❌ System library pollution
- ❌ Header file pollution
- ❌ No purge option for force removal

### Safe Symlink Removal Algorithm

```typescript
async removeSymlinks(installDir: string): Promise<number> {
  let count = 0;
  
  for each file in walkDir(installDir):
    symlinkPath = `/usr/bin/${basename(file)}`;
    
    // Safety checks
    if (!exists(symlinkPath)) continue;
    
    stats = lstat(symlinkPath);
    if (!stats.isSymbolicLink()) continue;  // Don't touch real files!
    
    target = readlink(symlinkPath);
    absoluteTarget = resolve(dirname(symlinkPath), target);
    
    // Only remove if it points to our package
    if (absoluteTarget.startsWith(installDir)):
      unlink(symlinkPath);
      count++;
  
  return count;
}
```

**Safety features:**
1. Only removes symbolic links (never real files or directories)
2. Verifies link target points to the package being removed
3. Skips system files, directories, or broken links
4. Returns count of removed symlinks for user feedback

### Proposed Improvement: File Manifest

**Create during installation:**

```json
// /var/sprout/pkgs/awesome-tool/v1.0.0/.manifest
{
  "version": "1.0.0",
  "installed_at": "2025-10-26T10:30:00Z",
  "files": {
    "executables": [
      "/var/sprout/pkgs/awesome-tool/v1.0.0/awesome-tool"
    ],
    "libraries": [
      "/usr/lib/libawesome.so",
      "/usr/lib/libawesome.so.1.0.0"
    ],
    "headers": [
      "/usr/include/awesome.h",
      "/usr/include/awesome/core.h"
    ],
    "directories": [
      "/usr/lib/awesome-tool",
      "/usr/include/awesome-tool"
    ],
    "symlinks": [
      "/usr/bin/awesome-tool"
    ],
    "desktop_files": [
      "/usr/share/applications/awesome-tool.desktop"
    ]
  },
  "build_system": "Cargo",
  "dependencies": [
    "libfoo:v1.0.0",
    "libbar:HEAD"
  ]
}
```

**Use during removal:**

```typescript
async removeWithManifest(packageName: string, version: string): Promise<void> {
  const manifestPath = `/var/sprout/pkgs/${packageName}/${version}/.manifest`;
  const manifest = JSON.parse(await readFile(manifestPath));
  
  // Remove all tracked files
  for (const file of manifest.files.libraries) {
    await unlink(file);
  }
  
  for (const file of manifest.files.headers) {
    await unlink(file);
  }
  
  for (const dir of manifest.files.directories) {
    await removeDir(dir);
  }
  
  // Finally remove package directory
  await removeDir(`/var/sprout/pkgs/${packageName}/${version}`);
}
```

---

## Directory Structure

### Complete Filesystem Layout

```
/var/sprout/                           # Root directory for sprout
├── pkgs/                              # Installed packages
│   ├── awesome-tool/
│   │   ├── HEAD/                      # Latest version
│   │   │   ├── awesome-tool           # Executable
│   │   │   └── bin/                   # Additional executables
│   │   ├── v1.0.0/                    # Specific version
│   │   │   └── awesome-tool
│   │   └── v2.0.0/
│   │       └── awesome-tool
│   └── another-package/
│       └── HEAD/
│           └── another-package
│
└── build/                             # Temporary build directories
    ├── awesome-tool/
    │   ├── HEAD/                      # Cloned source for HEAD
    │   │   ├── src/
    │   │   ├── Cargo.toml
    │   │   └── target/                # Build artifacts
    │   ├── v1.0.0/                    # Cloned source for v1.0.0
    │   └── v2.0.0/
    └── another-package/
        └── HEAD/

/etc/sprout/                           # Configuration directory
├── repos/
│   └── repos                          # List of repository URLs
├── deps/
│   ├── awesome-tool.pkgdeps           # User-defined dependencies
│   └── another-package.pkgdeps
└── bldit/
    ├── awesome-tool                   # Custom build script
    └── another-package

/usr/bin/                              # Symlinks to executables
├── awesome-tool -> /var/sprout/pkgs/awesome-tool/HEAD/awesome-tool
└── another-package -> /var/sprout/pkgs/another-package/HEAD/another-package

/usr/lib/                              # System libraries
├── libawesome.so                      # Shared library
├── libawesome.so.1.0.0                # Versioned library
├── libawesome.a                       # Static library
└── awesome-tool/                      # Package-specific libraries
    └── plugins/
        └── plugin.so

/usr/include/                          # System headers
├── awesome.h                          # Individual header
└── awesome-tool/                      # Package-specific headers
    ├── core.h
    └── utils.h

/usr/share/applications/               # Desktop entries
└── awesome-tool.desktop               # (optional, user-created)
```

### Directory Purposes

| Directory | Purpose | Persistence |
|-----------|---------|-------------|
| `/var/sprout/pkgs/` | Final installation location for executables | Permanent until removed |
| `/var/sprout/build/` | Temporary build workspace | Kept for debugging/rebuild |
| `/etc/sprout/repos/` | Repository URL storage | Permanent configuration |
| `/etc/sprout/deps/` | User-defined dependency overrides | Permanent configuration |
| `/etc/sprout/bldit/` | Custom build scripts | Permanent configuration |
| `/usr/bin/` | Symlinks to make commands available | Managed by sprout |
| `/usr/lib/` | Shared libraries and package-specific lib dirs | Permanent (⚠️ not fully tracked) |
| `/usr/include/` | Header files and package-specific includes | Permanent (⚠️ not fully tracked) |

### Disk Space Considerations

**For a typical package:**

```
Package: awesome-tool (Rust binary)

Source code:        /var/sprout/build/awesome-tool/HEAD/
  Size: ~5 MB

Build artifacts:    /var/sprout/build/awesome-tool/HEAD/target/
  Size: ~500 MB     (Rust debug + release builds)

Installed binary:   /var/sprout/pkgs/awesome-tool/HEAD/
  Size: ~10 MB      (stripped release binary)

System files:       /usr/lib/, /usr/include/
  Size: ~1 MB       (libraries and headers)

Total: ~516 MB per version
```

**Optimization suggestion:** Remove build artifacts after successful install to save ~500 MB per package.

---

## File Formats

### Repository File (`/etc/sprout/repos/repos`)

**Format:** Plain text, one URL per line

```
https://github.com/user/awesome-tool
https://github.com/organization/cool-app
https://gitlab.com/group/neat-util
```

**Rules:**
- One git repository URL per line
- Comments not supported (entire line must be URL)
- Blank lines ignored
- URLs automatically normalized (`.git` suffix removed)
- Duplicates prevented during add operation

### Dependency File (`pkgdeps`)

**Format:** Plain text, URL and optional version per line

```
# Comments start with hash
https://github.com/user/dependency1
https://github.com/user/dependency2 v1.2.3
https://github.com/user/dependency3 HEAD

# Another dependency
https://github.com/org/library main
```

**Syntax:**
```
[#comment]
<url> [version]

Where:
  url     = Git repository URL (HTTPS only)
  version = Git tag, branch name, or "HEAD" (optional, default: HEAD)
```

**Priority:**
1. `/etc/sprout/deps/package.pkgdeps` (user-defined, highest priority)
2. `./pkgdeps` (in cloned repo, package-defined)

If both exist, user-defined takes precedence (allows overriding package dependencies).

### Custom Build Script (`bldit`)

**Format:** Shell script with `bldit()` function

```bash
#!/bin/bash

# Optional: Define environment variables
export CC=gcc
export CFLAGS="-O3 -march=native"

# Required: Define bldit function
bldit() {
  # Your build commands here
  ./autogen.sh
  ./configure --prefix=/usr --enable-feature
  make -j$(nproc)
  make install DESTDIR=$PWD/install
}
```

**Execution:**
```bash
source /path/to/bldit
cd /var/sprout/build/package/version
bldit
```

**Best practices:**
- Set `DESTDIR` for staged installs
- Use `$(nproc)` for parallel builds
- Check return codes: `|| exit 1`
- Clean previous builds if needed

### Cargo.toml (Rust)

```toml
[package]
name = "awesome-tool"
version = "1.0.0"
edition = "2021"

[dependencies]
serde = "1.0"
tokio = { version = "1.0", features = ["full"] }

[[bin]]
name = "awesome-tool"
path = "src/main.rs"
```

**Sprout usage:**
```bash
cargo install --git URL --root /var/sprout/pkgs/awesome-tool/v1.0.0 awesome-tool
```

### go.mod (Go)

```go
module github.com/user/awesome-tool

go 1.21

require (
    github.com/spf13/cobra v1.8.0
    github.com/stretchr/testify v1.8.4
)
```

**Sprout usage:**
```bash
export GOBIN=/var/sprout/pkgs/awesome-tool/v1.0.0
go install github.com/user/awesome-tool:v1.0.0
```

### pyproject.toml (Python)

```toml
[project]
name = "awesome-tool"
version = "1.0.0"
dependencies = [
    "requests>=2.31.0",
    "click>=8.1.0",
]

[project.scripts]
awesome-tool = "awesome_tool.cli:main"
```

**Sprout usage:**
```bash
export PIPX_BIN_DIR=/var/sprout/pkgs/awesome-tool/v1.0.0
pipx install awesome-tool
```

---

## Command Reference

### Repository Management

#### Add Repository

```bash
sprout add-repo <url>
sprout ar <url>
```

**Description:** Add a git repository to the package list.

**Examples:**
```bash
sprout ar https://github.com/user/awesome-tool
sprout ar https://gitlab.com/group/project
```

**Behavior:**
- Normalizes URL (removes `.git`)
- Checks if already exists (skips if duplicate)
- Verifies repository is accessible via git
- Fetches latest tag for reference
- Appends to `/etc/sprout/repos/repos`

#### Add Repository from File

```bash
sprout add-repo-pkg <path|url>
sprout arp <path|url>
```

**Description:** Batch add repositories from a file or URL.

**Examples:**
```bash
sprout arp ./my-repos.txt
sprout arp https://example.com/repos.txt
```

**File format:**
```
https://github.com/user/repo1
https://github.com/user/repo2
https://github.com/user/repo3
```

#### Remove Repository

```bash
sprout remove-repo <name...>
sprout rr <name...>
```

**Description:** Remove repositories by package name.

**Examples:**
```bash
sprout rr awesome-tool
sprout rr package1 package2 package3
```

**Behavior:**
- Searches for URLs matching package name
- If multiple matches, shows list (currently removes first)
- Removes from `/etc/sprout/repos/repos`

### Package Installation

#### Install Package

```bash
sprout install <package[:version]...>
sprout i <package[:version]...>
```

**Description:** Install one or more packages.

**Examples:**
```bash
# Install latest
sprout i awesome-tool

# Install specific version
sprout i awesome-tool:v1.0.0

# Install multiple packages
sprout i package1 package2:v2.0.0 package3
```

**Behavior:**
- Checks if already installed (skips if yes)
- Finds URL in repository list
- Clones source code
- Resolves and installs dependencies
- Builds package
- Installs files
- Creates symlinks

#### Install from URL

```bash
sprout install-repo <url> [version]
sprout ir <url> [version]
```

**Description:** Install directly from git URL without adding to repos.

**Examples:**
```bash
# Install latest
sprout ir https://github.com/user/awesome-tool

# Install specific version
sprout ir https://github.com/user/awesome-tool v1.0.0
```

**Use case:** One-off installations, testing, or packages not in your repo list.

### Package Removal

#### Remove Package

```bash
sprout remove <package[:version]...>
sprout r <package[:version]...>
```

**Description:** Remove installed packages.

**Examples:**
```bash
# Remove latest/only version
sprout r awesome-tool

# Remove specific version
sprout r awesome-tool:v1.0.0

# Remove multiple
sprout r package1 package2:v2.0.0
```

**Behavior:**
- Checks for dependent packages (aborts if found)
- Removes symlinks safely
- Removes package directory
- Removes build directory
- ⚠️ Does NOT remove system libraries/headers (see limitations)

**Future: Purge option**
```bash
sprout r --purge awesome-tool
```
Would remove system files and force removal even with dependents.

### Package Information

#### List Installed Packages

```bash
sprout list
sprout l
```

**Description:** Show all installed packages and versions.

**Output:**
```
Installed packages:
  awesome-tool:HEAD
  awesome-tool:v1.0.0
  another-package:v2.5.0
  cool-util:HEAD
```

#### Search Packages

```bash
sprout search <query...>
sprout s <query...>
```

**Description:** Search repository list for packages.

**Examples:**
```bash
sprout s tool
sprout s awesome
sprout s github.com/user
```

**Output:**
```
Found 3 packages:
  awesome-tool:     https://github.com/user/awesome-tool
  super-tool:       https://github.com/org/super-tool
  mega-tool:        https://github.com/dev/mega-tool
```

#### List Package Files

```bash
sprout files <package>
sprout f <package>
```

**Description:** Show all files installed by a package.

**Example:**
```bash
sprout f awesome-tool
```

**Output:**
```
Files for awesome-tool:HEAD:
  /var/sprout/pkgs/awesome-tool/HEAD/awesome-tool
  /usr/lib/libawesome.so
  /usr/include/awesome.h
  /usr/include/awesome-tool/core.h
```

### Package Updates

#### Update All Packages

```bash
sprout update
sprout u
```

**Description:** Update all installed packages to latest versions.

**Behavior:**
- Lists all installed packages
- For each package:
  - Finds repository URL
  - Reinstalls (pulls latest, rebuilds)
- ⚠️ Currently reinstalls, doesn't check if update needed

**Future enhancement:**
- Check current commit/tag vs remote
- Only update if newer version available
- Show changelog if available

### Version Management

#### Switch Package Version

```bash
sprout switch <package> <version>
sprout sw <package> <version>
```

**Description:** Switch the active version of a package.

**Examples:**
```bash
# Switch to specific version
sprout switch awesome-tool v1.0.0

# Switch to latest (HEAD)
sprout switch awesome-tool HEAD
```

**Behavior:**
- Updates the standard symlink to point to the specified version
- Version-specific symlinks remain unchanged
- Only affects the standard symlink (`/usr/bin/package`)

#### List Package Versions

```bash
sprout versions <package>
sprout v <package>
```

**Description:** List all available versions for a package.

**Examples:**
```bash
sprout versions awesome-tool
```

**Output:**
```
Available versions for awesome-tool:
  v1.0.0 (active)
  v2.0.0
  HEAD
```

**Behavior:**
- Shows all installed versions
- Indicates which version is currently active
- Includes both tagged versions and HEAD

---

## Known Limitations

### 1. Incomplete File Tracking

**Problem:**
- Libraries copied to `/usr/lib/` are not tracked
- Headers copied to `/usr/include/` are not tracked
- These files accumulate and are not removed on package removal

**Impact:**
- Disk space pollution over time
- Potential library conflicts
- System directories clutter

**Workaround:**
```bash
# Manual cleanup (dangerous!)
sudo find /usr/lib -name "libawesome*" -delete
sudo find /usr/include -name "awesome*" -delete
```

**Proposed fix:** Implement manifest tracking (see section above).

### 2. No Transitive Dependency Resolution

**Problem:**
If package A depends on B, and B depends on C, you must list C in A's pkgdeps.

**Example:**
```
awesome-tool → libfoo → libbar

Current: awesome-tool's pkgdeps must include BOTH libfoo AND libbar
Desired: awesome-tool's pkgdeps should only need libfoo
```

**Impact:**
- Package maintainers must manually track entire dependency tree
- Dependencies must be kept in sync
- Easy to miss transitive dependencies

**Proposed fix:** Recursive dependency resolution:
```typescript
async resolveDependenciesRecursive(packageName: string): Promise<Dependency[]> {
  const direct = await getDependencies(packageName);
  const all = [...direct];
  
  for (const dep of direct) {
    const transitive = await resolveDependenciesRecursive(dep.name);
    all.push(...transitive);
  }
  
  return deduplicateDependencies(all);
}
```

### 3. No Version Conflict Resolution

**Problem:**
If package A needs libfoo:v1.0.0 and package B needs libfoo:v2.0.0, both are installed but symlink conflict.

**Example:**
```
/usr/bin/libfoo → points to last installed version
```

**Impact:**
- Only one version is "active" via symlink
- Other packages may break if they need different version
- No clear indication of version conflicts

**Proposed fix:**
- Detect version conflicts during dependency resolution
- Allow multiple versions to coexist
- Use version-specific library paths: `/usr/lib/libfoo-v1.0.0/`

### 4. Build Artifacts Consume Disk Space

**Problem:**
Build directories remain after installation:

```
/var/sprout/build/awesome-tool/HEAD/
  Size: 500 MB (Rust debug + release builds)

/var/sprout/pkgs/awesome-tool/HEAD/
  Size: 10 MB (final binary)
```

**Impact:**
- 50x disk space overhead
- Minimal benefit for most users

**Workaround:**
```bash
sudo rm -rf /var/sprout/build/awesome-tool
```

**Proposed fix:**
- Add `--keep-build` flag (default: false)
- Automatically clean build artifacts after successful install
- Keep source code for debugging if needed

### 5. No Rollback Mechanism

**Problem:**
If an update breaks functionality, no easy way to rollback.

**Current workaround:**
```bash
# Remove broken version
sprout r awesome-tool:v2.0.0

# Reinstall old version
sprout i awesome-tool:v1.0.0

# Manually switch symlink
sudo rm /usr/bin/awesome-tool
sudo ln -s /var/sprout/pkgs/awesome-tool/v1.0.0/awesome-tool /usr/bin/awesome-tool
```

**Proposed fix:**
```bash
sprout rollback awesome-tool    # Switch to previous version
sprout switch awesome-tool v1.0.0    # Switch to specific version
```

### 6. No Binary Package Support

**Problem:**
Always compiling from source is slow for large projects.

**Example:**
```
LLVM/Clang: 2+ hours to compile
Rust compiler: 30+ minutes
Large C++ projects: 1+ hours
```

**Impact:**
- Poor user experience for large packages
- High CPU usage during installation
- May fail on low-memory systems

**Proposed fix:**
- Add binary package cache (user-hosted or community CDN)
- Check for pre-built binaries before building
- Fall back to source if binary unavailable or verification fails

### 7. No Parallel Operations

**Problem:**
Dependencies are installed sequentially.

**Example:**
```
awesome-tool depends on: [libfoo, libbar, libbaz]

Current: Install libfoo → Install libbar → Install libbaz
Desired: Install libfoo, libbar, libbaz in parallel
```

**Impact:**
- Slower installation for packages with many dependencies
- Wastes time when dependencies are independent

**Proposed fix:**
```typescript
await Promise.all(
  dependencies.map(dep => install(dep))
);
```

**Challenge:** Must respect dependency order graph.

### 8. Limited Error Recovery

**Problem:**
If build fails midway, partial files may remain.

**Impact:**
- Inconsistent state
- Manual cleanup required

**Proposed fix:**
- Atomic operations (staging directory)
- Rollback on failure
- Better error messages with recovery suggestions

---

## Future Enhancements

### Priority 1: Critical Improvements

#### 1.1 File Manifest Tracking

**Implementation:**
```typescript
interface Manifest {
  version: string;
  installed_at: string;
  files: {
    executables: string[];
    libraries: string[];
    headers: string[];
    directories: string[];
    symlinks: string[];
  };
  build_system: string;
  dependencies: string[];
  checksum: string;  // SHA256 of manifest
}
```

**Benefits:**
- Complete uninstallation
- File integrity verification
- Dependency tracking
- Conflict detection

#### 1.2 Transitive Dependency Resolution

**Algorithm:**
```
function resolveAllDependencies(package):
  visited = Set()
  queue = [package]
  resolved = []
  
  while queue not empty:
    current = queue.pop()
    if current in visited: continue
    visited.add(current)
    
    deps = getDependencies(current)
    resolved.push(...deps)
    queue.push(...deps.map(d => d.name))
  
  return topologicalSort(resolved)
```

#### 1.3 Build Artifact Cleanup

**Options:**
```bash
sprout config set keep-build-artifacts false  # Default
sprout config set keep-build-artifacts true   # For development
```

**Implementation:**
- Remove `/var/sprout/build/` after successful install
- Keep on failure for debugging
- Add `--keep-build` flag for per-package override

### Priority 2: User Experience

#### 2.1 Interactive Commands

```bash
# Select from multiple repo matches
sprout rr awesome
> 1. https://github.com/user/awesome-tool
> 2. https://github.com/org/awesome-app
Select (1-2): _

# Confirm removal
sprout r awesome-tool
> Remove awesome-tool:HEAD and 3 files? [y/N]: _
```

#### 2.2 Progress Indicators

```bash
sprout i large-package
[1/5] Cloning repository... ████████████████████ 100%
[2/5] Resolving dependencies (3 found)...
[3/5] Building package... ████████░░░░░░░░░░░░ 45% (compiling src/main.rs)
```

#### 2.3 Version Switching

```bash
sprout switch awesome-tool v1.0.0
# Updated symlink: /usr/bin/awesome-tool → /var/sprout/pkgs/awesome-tool/v1.0.0/awesome-tool

sprout list-versions awesome-tool
# Available versions:
#   * v1.0.0 (active)
#     v2.0.0
#     HEAD
```

### Priority 3: Advanced Features

#### 3.1 Lock Files

```toml
# sprout.lock
[[packages]]
name = "awesome-tool"
version = "v1.0.0"
url = "https://github.com/user/awesome-tool"
commit = "a1b2c3d4e5f6"
checksum = "sha256:1234567890abcdef"

[[packages.dependencies]]
name = "libfoo"
version = "v2.1.0"
```

**Benefits:**
- Reproducible builds
- Exact dependency versions locked
- Share consistent environments

#### 3.2 Binary Package Cache

```bash
sprout config set binary-cache https://cache.example.com/

# Installation flow:
1. Check binary cache for pre-built package
2. Verify signature
3. Download if available
4. Fall back to source build if not
```

#### 3.3 Hooks System

```bash
# /etc/sprout/hooks/awesome-tool/post-install
#!/bin/bash
echo "Awesome Tool installed!"
echo "Run 'awesome-tool --help' to get started"

# /etc/sprout/hooks/awesome-tool/pre-remove
#!/bin/bash
awesome-tool --cleanup
```

**Hook types:**
- `pre-install`: Before installation begins
- `post-install`: After successful installation
- `pre-remove`: Before removal
- `post-remove`: After removal
- `pre-build`: Before compilation
- `post-build`: After compilation

#### 3.4 Plugin System

```typescript
interface SproutPlugin {
  name: string;
  version: string;
  
  onInstall?(pkg: Package): Promise<void>;
  onRemove?(pkg: Package): Promise<void>;
  onUpdate?(pkg: Package): Promise<void>;
  
  addBuildStrategy?(): BuildStrategy;
  addCommand?(): Command;
}
```

**Example plugins:**
- Security scanner (check for vulnerabilities)
- Analytics (track package usage)
- Notification system (desktop notifications)
- Cloud sync (sync installed packages across machines)

#### 3.5 Configuration Management

```bash
sprout config list
sprout config get keep-build-artifacts
sprout config set keep-build-artifacts false
sprout config set binary-cache https://example.com
```

**Config file** (`/etc/sprout/config.toml`):
```toml
[general]
keep-build-artifacts = false
parallel-builds = 4
verbose = false

[cache]
binary-cache = "https://cache.example.com"
enable-cache = true
cache-ttl = 604800  # 1 week in seconds

[build]
default-jobs = 8  # make -j8
use-ccache = true
optimize = "native"  # -march=native
```

### Priority 4: Community Features

#### 4.1 Package Discovery

```bash
sprout discover
# Shows trending packages from known registries

sprout recommend
# AI-based recommendations based on installed packages
```

#### 4.2 Package Ratings & Reviews

```bash
sprout info awesome-tool
# Name: awesome-tool
# Rating: ★★★★☆ (4.2/5)
# Downloads: 10,234
# Last updated: 2 days ago
# Description: An awesome command-line tool
# Reviews: 45
```

#### 4.3 Community Registry

- Central index (opt-in)
- Package metadata (description, tags, keywords)
- Verified publishers
- Security advisories
- Automated CI/CD builds

---

## Glossary

| Term | Definition |
|------|------------|
| **Binary** | Compiled executable program (machine code) |
| **Source Code** | Human-readable programming code |
| **Compilation** | Process of translating source code to machine code |
| **Build System** | Tools that automate compilation (Make, Cargo, CMake, etc.) |
| **Symlink** | Symbolic link, a file that points to another file |
| **PATH** | Environment variable listing directories to search for commands |
| **Repository** | Git repository containing source code |
| **Dependency** | Package required by another package to function |
| **Transitive Dependency** | Dependency of a dependency |
| **Manifest** | File listing all files installed by a package |
| **HEAD** | Latest commit on default branch |
| **Tag** | Named reference to specific commit (usually version) |
| **Strategy Pattern** | Design pattern allowing runtime selection of algorithms |
| **Artifact** | File produced by build process (binary, library, etc.) |

---

## Appendix A: Comparison with Other Package Managers

| Feature | Sprout | apt/dnf | Cargo | Homebrew |
|---------|--------|---------|-------|----------|
| **Source** | Git repos | Central archive | crates.io | Git + bottles |
| **Build** | Always | Pre-compiled | Optional | Pre-compiled |
| **Multi-version** | ✅ Yes | ❌ No | ✅ Yes | ✅ Yes |
| **Dependencies** | Manual + auto | Automatic | Automatic | Automatic |
| **Speed** | Slow (build) | Fast (binary) | Slow (build) | Fast (bottles) |
| **Security** | Auditable source | Trust repo | Trust registry | Trust maintainers |
| **Flexibility** | High | Low | Medium | Medium |

---

## Appendix B: Build Time Estimates

| Package | Language | Size | Build Time | Final Size |
|---------|----------|------|------------|------------|
| **ripgrep** | Rust | ~100 files | 2-3 min | 5 MB |
| **fd** | Rust | ~50 files | 1-2 min | 3 MB |
| **exa** | Rust | ~80 files | 2-3 min | 4 MB |
| **bat** | Rust | ~150 files | 3-5 min | 6 MB |
| **tmux** | C | ~200 files | 1 min | 1 MB |
| **neovim** | C/Lua | ~500 files | 3-5 min | 10 MB |
| **git** | C | ~1000 files | 5-10 min | 20 MB |
| **LLVM** | C++ | ~10k files | 2+ hours | 500+ MB |

*Times on modern CPU (8 cores, 16 threads)*

---

## Appendix C: Security Considerations

### Code Execution Risks

**Threat:** Malicious code in repositories

**Mitigation:**
1. Always review source before installing
2. Prefer known, trusted repositories
3. Check commit history and maintainer activity
4. Use signed commits when available

### Build Script Security

**Threat:** Malicious bldit scripts

**Current:** Scripts run with user privileges (sudo)

**Future mitigation:**
- Sandbox build environment
- Security audits for popular packages
- Community review system

### Dependency Chain Attacks

**Threat:** Compromised transitive dependencies

**Mitigation:**
- Lock files with checksums
- Dependency pinning
- Security scanning tools
- Minimal dependency philosophy

### Symlink Attacks

**Threat:** Malicious symlinks to sensitive files

**Mitigation:**
- Verify symlink targets before creation
- Only create symlinks in designated directories
- Check for existing files before overwriting

---

## Contributing

Sprout is open source and welcomes contributions:

- **Bug reports:** File issues with detailed reproduction steps
- **Feature requests:** Propose enhancements with use cases
- **Build strategies:** Add support for new build systems
- **Documentation:** Improve this specification
- **Testing:** Help test on different systems