<div align="center">

<img alt="image-removebg-preview" src="https://github.com/user-attachments/assets/4d0039a0-fdb6-446e-9c71-ac5307044c31" />

*(🌱 plant and grow your packages efficiently!)*

</div>



sprout is a minimalist, source-based package manager built with Bun. It automatically detects build systems, resolves dependencies, compiles from source, and manages installations all from Git repositories.

## Features

- **Git-Native**: Install packages directly from any Git repository
- **Auto-Detection**: Automatically detects and uses the appropriate build system
- **Multi-Version Support**: Install multiple versions of the same package side-by-side
- **Dependency Resolution**: Automatically installs dependencies from `pkgdeps` files
- **Build System Support**: Cargo, CMake, Make, Meson, Go, Python (pipx), Zig, Nimble, and more
- **Custom Build Scripts**: Support for custom `bldit` build scripts
- **Source-Based**: Always compiles from source for your specific system
- **Decentralized**: No central registry required—any Git repo can be a package

## Requirements

- Git
- Root/sudo access (for system-wide installation)
- Build tools for your target packages (gcc, make, cmake, cargo, etc.)

## Installation

### Download Pre-built Binaries

Download the latest release from [GitHub Releases](https://github.com/phukon/sprout/releases):

```bash
# Download the binary for your platform
# Make it executable
chmod +x sprout-linux-x64

# Install system-wide (requires sudo)
sudo mv sprout-linux-x64 /usr/local/bin/sprout
```

### Build from Source

If you prefer to build from source using Bun.js:

```bash
# Clone the repository
git clone https://github.com/phukon/sprout.git
cd sprout

# Install dependencies
bun install

# Build sprout
bun run build:binaries

# Make it available system-wide (requires sudo)
sudo ln -s $(pwd)/dist/cli.js /usr/local/bin/sprout
```

## Quick Start

```bash
# Add a package repository
sprout ar https://github.com/aristocratos/btop

# Install a package
sprout i btop

# Install a specific version
sprout i btop:v1.2.13

# Install directly from a Git URL
sprout ir https://github.com/aristocratos/btop v1.2.13

# List installed packages
sprout l

# Search for packages
sprout s keyword

# Update all packages
sprout u

# Remove a package
sprout r btop

# Switch between versions
sprout switch btop v1.2.13

# List available versions
sprout versions btop
```

## How It Works

### Architecture Overview

sprout follows a pipeline architecture:

```
Repository → Clone → Dependencies → Build → Install → Symlink
```

#### 1. Repository Management

Repositories are stored as plain text URLs in `/etc/sprout/repos/repos`:

```
https://github.com/aristocratos/btop
https://github.com/sharkdp/fd
https://github.com/BurntSushi/ripgrep
```

When you install a package, sprout searches through registered repositories to find a matching package name.

#### 2. Git Clone

Packages are cloned into `/var/sprout/build/[package]/[version]/`:

```bash
# Example structure
/var/sprout/build/
  ├── btop/
  │   ├── HEAD/          # Latest from main/master
  │   └── v1.2.13/       # Specific version
  └── ripgrep/
      └── HEAD/
```

sprout uses shallow clones (`--depth 1`) for faster downloads.

#### 3. Dependency Resolution

Dependencies are declared in `pkgdeps` files:

**Project-level** (`/path/to/repo/pkgdeps`):
```
https://github.com/user/dependency1
https://github.com/user/dependency2 v1.0.0
```

**User-defined** (`/etc/sprout/deps/[package].pkgdeps`):
```
https://github.com/user/custom-dep
```

Dependencies are installed recursively before building the main package.

#### 4. Build System Detection

sprout automatically detects the build system by looking for specific files:

| Build System | Detection File       | Install Command                    |
|--------------|---------------------|------------------------------------|
| Cargo        | `Cargo.toml`        | `cargo install --git`              |
| CMake        | `CMakeLists.txt`    | `cmake .. && make`                 |
| Make         | `Makefile`          | `make`                             |
| Meson        | `meson.build`       | `meson setup build && meson compile` |
| Go           | `go.mod`            | `go install`                       |
| Python       | `pyproject.toml`    | `pipx install`                     |
| Zig          | `build.zig`         | `zig build`                        |
| Nimble       | `*.nimble`          | `nimble install`                   |
| Autotools    | `configure`         | `./configure && make`              |
| pnpm         | `pnpm-lock.yaml`    | `pnpm install && pnpm run build`   |

**Detection Order**:
1. Custom bldit script in `/etc/sprout/bldit/[package]`
2. Project bldit script in repository root
3. Registered build strategies (tried in order)

#### 5. Custom Build Scripts

For packages with complex build processes, you can create custom `bldit` scripts:

**System-wide**: `/etc/sprout/bldit/[package]`
```bash
#!/bin/bash

bldit() {
    cd "$1"  # Build directory passed as first argument
    
    # Custom build commands
    ./autogen.sh
    ./configure --prefix=/usr
    make -j$(nproc)
}
```

**Project-level**: Repository root `bldit` file (shipped with the package)

#### 6. File Installation

After building, sprout scans the build directory for:

- **Executables**: Files with execute permissions
- **Libraries**: `.so`, `.a`, `.o` files
- **Headers**: `.h`, `.hpp` files
- **Special directories**: `include/`, `lib/`, `bin/`

Files are copied to:

```
/var/sprout/pkgs/[package]/[version]/    # Executables
/usr/lib/                                # Libraries
/usr/include/                            # Headers
```

#### 7. Symlink Creation

Executables are symlinked to `/usr/bin/` for easy access:

```bash
# Standard symlink (points to active version)
/usr/bin/btop -> /var/sprout/pkgs/btop/v1.2.13/btop

# Version-specific symlinks (always point to specific versions)
/usr/bin/btop:v1.2.13 -> /var/sprout/pkgs/btop/v1.2.13/btop
/usr/bin/btop:v1.3.0 -> /var/sprout/pkgs/btop/v1.3.0/btop
/usr/bin/btop:HEAD -> /var/sprout/pkgs/btop/HEAD/btop
```

This allows:
- Multiple versions to coexist
- Easy version switching (change standard symlink target)
- Run specific versions directly: `btop:v1.2.13`
- Clean uninstallation

### Directory Structure

```
/var/sprout/
  ├── pkgs/              # Installed packages
  │   └── [package]/
  │       ├── HEAD/      # Latest version
  │       ├── v1.0.0/    # Specific versions
  │       └── v2.0.0/
  └── build/             # Build directories (temporary)
      └── [package]/
          └── [version]/

/etc/sprout/
  ├── repos/
  │   └── repos          # List of package repositories
  ├── deps/
  │   └── [package].pkgdeps  # Custom dependencies
  └── bldit/
      └── [package]      # Custom build scripts

/usr/bin/                # Symlinks to executables
  ├── package            # Standard symlink (points to active version)
  ├── package:v1.0.0     # Version-specific symlink
  └── package:v2.0.0     # Version-specific symlink
/usr/lib/                # Shared libraries
/usr/include/            # Header files
```

## Advanced Usage

### Adding Multiple Repositories

From a file:
```bash
sprout arp repos.txt
```

From a URL:
```bash
sprout arp https://example.com/repos.txt
```

### Managing Dependencies

Create a custom dependency file:
```bash
sudo nano /etc/sprout/deps/mypackage.pkgdeps
```

Add dependencies:
```
https://github.com/user/dep1
https://github.com/user/dep2 v1.0.0
```

### Custom Build Scripts

Create a custom build script:
```bash
sudo nano /etc/sprout/bldit/mypackage
```

```bash
#!/bin/bash

bldit() {
    local build_dir="$1"
    cd "$build_dir"
    
    # Your custom build commands
    ./configure --with-custom-flags
    make -j$(nproc)
    make install DESTDIR="$2"  # $2 is the install directory
}
```

Make it executable:
```bash
sudo chmod +x /etc/sprout/bldit/mypackage
```

### Version Management

```bash
# Install specific version
sprout i package:v1.2.3

# Install latest (HEAD)
sprout i package

# Install multiple versions
sprout i package:v1.0.0
sprout i package:v2.0.0
sprout i package:HEAD

# Switch active version
sprout switch package v1.0.0

# List available versions
sprout versions package

# Remove specific version (keeps other versions)
sprout r package:v1.2.3

# Remove all versions
sprout r package

# List all versions of a package
sprout l | grep package
```

### Listing Package Files

```bash
# See all files installed by a package
sprout f btop
```

## Package Repository Format

To make your project installable with sprout, ensure:

1. **It's a Git repository** (obviously!)
2. **It has a supported build system** (Cargo.toml, Makefile, CMakeLists.txt, etc.)
3. **(Optional) Include a `pkgdeps` file** in the root for dependencies
4. **(Optional) Include a `bldit` script** for custom build logic

### Example `pkgdeps`

```
# Dependencies for my project
https://github.com/dependency/one
https://github.com/dependency/two v2.1.0
```

### Example `bldit`

```bash
#!/bin/bash

bldit() {
    local build_dir="$1"
    local install_dir="$2"
    
    cd "$build_dir"
    
    # Custom build process
    ./autogen.sh
    ./configure --prefix="$install_dir"
    make -j$(nproc)
    make install
}
```

## Troubleshooting

### Package not found
```bash
# Make sure the repository is added
sprout ar https://github.com/user/package

# Or install directly
sprout ir https://github.com/user/package
```

### Build fails
```bash
# Check if required build tools are installed
which make cmake cargo go

# View build directory for manual inspection
ls -la /var/sprout/build/[package]/[version]/
```

### Permission denied
```bash
# sprout needs root access for system-wide installation
sudo sprout i package
```

### Locale errors (like btop)
```bash
# Install locales in your system/container
sudo apt-get install locales
sudo locale-gen en_US.UTF-8

# Or run with UTF-8 forced
btop --force-utf
```

## Roadmap

- [ ] Parallel dependency installation
- [ ] Build caching
- [ ] Binary package support (optional)
- [ ] Dependency graph visualization
- [ ] Version pinning and lock files
- [ ] Plugin system for custom build strategies
- [ ] Package metadata and descriptions
- [ ] Rollback mechanism

## Why sprout?

**Advantages:**
- No central registry bottleneck
- Always get the latest code
- Optimized for your specific system
- Full source transparency
- Easy to package your own projects
- Multiple versions coexist peacefully

Inspired by [pkgit](https://github.com/dacctal/pkgit)
