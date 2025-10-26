#!/usr/bin/env bun

import { $ } from "bun";
import { mkdir } from "fs/promises";

// Read version from package.json
const packageJson = JSON.parse(await Bun.file("package.json").text());
const VERSION = `v${packageJson.version}`;
const BUILD_DIR = "dist/bin";
const RELEASE_DIR = `dist/release-${VERSION}`;

// Create build directories
await mkdir(BUILD_DIR, { recursive: true });
await mkdir(RELEASE_DIR, { recursive: true });

console.log(`🚀 Building sprout ${VERSION} binaries...\n`);

// Build configurations
const targets = [
  {
    name: "linux-x64",
    target: "bun-linux-x64",
    outfile: `${BUILD_DIR}/sprout-${VERSION}-linux-x64`,
    description: "Linux x64 (glibc)"
  },
  {
    name: "linux-arm64", 
    target: "bun-linux-arm64",
    outfile: `${BUILD_DIR}/sprout-${VERSION}-linux-arm64`,
    description: "Linux ARM64 (glibc)"
  },
  {
    name: "windows-x64",
    target: "bun-windows-x64",
    outfile: `${BUILD_DIR}/sprout-${VERSION}-windows-x64.exe`,
    description: "Windows x64"
  },
  {
    name: "darwin-x64",
    target: "bun-darwin-x64", 
    outfile: `${BUILD_DIR}/sprout-${VERSION}-darwin-x64`,
    description: "macOS x64"
  },
  {
    name: "darwin-arm64",
    target: "bun-darwin-arm64",
    outfile: `${BUILD_DIR}/sprout-${VERSION}-darwin-arm64`,
    description: "macOS ARM64 (Apple Silicon)"
  }
];

// Build each target
for (const target of targets) {
  console.log(`📦 Building ${target.description}...`);
  
  try {
    await $`bun build src/cli.ts \
      --compile \
      --target ${target.target} \
      --outfile ${target.outfile} \
      --minify \
      --sourcemap`;
    
    // Make Linux/macOS binaries executable
    if (!target.name.includes("windows")) {
      await $`chmod +x ${target.outfile}`;
    }
    
    console.log(`✅ Built: ${target.outfile}\n`);
  } catch (error) {
    console.error(`❌ Failed to build ${target.description}:`, error.message);
  }
}

// Copy binaries to release directory
console.log("📁 Preparing release files...");
await $`cp ${BUILD_DIR}/* ${RELEASE_DIR}/`;

// Create checksums
console.log("🔢 Generating checksums...");
const checksums = [];

for (const target of targets) {
  const filename = target.outfile.split("/").pop();
  const checksum = await $`sha256sum ${target.outfile}`.text();
  checksums.push(`${checksum.trim()}  ${filename}`);
}

// Write checksums file
await Bun.write(`${RELEASE_DIR}/checksums.txt`, checksums.join("\n"));

// Create README for release
const readme = `# sprout ${VERSION} - Standalone Binaries

## Available Binaries

- **sprout-${VERSION}-linux-x64** - Linux x64 (glibc)
- **sprout-${VERSION}-linux-arm64** - Linux ARM64 (glibc)  
- **sprout-${VERSION}-windows-x64.exe** - Windows x64
- **sprout-${VERSION}-darwin-x64** - macOS x64
- **sprout-${VERSION}-darwin-arm64** - macOS ARM64 (Apple Silicon)

## Installation

### Linux/macOS
\`\`\`bash
# Download the appropriate binary
chmod +x sprout-${VERSION}-<platform>
sudo mv sprout-${VERSION}-<platform> /usr/local/bin/sprout
\`\`\`

### Windows
1. Download \`sprout-${VERSION}-windows-x64.exe\`
2. Rename to \`sprout.exe\`
3. Add to your PATH

## Usage

\`\`\`bash
sprout --help
\`\`\`

## Verification

Verify the integrity of your download using the checksums:

\`\`\`bash
sha256sum sprout-${VERSION}-<platform>  # Should match checksums.txt
\`\`\`

## Requirements

- No additional dependencies required
- Binaries include the Bun runtime
- Root/sudo access required for system-wide installation

## License

MIT License - see LICENSE file in source repository
`;

await Bun.write(`${RELEASE_DIR}/README.md`, readme);

console.log(`\n🎉 Release binaries built successfully!`);
console.log(`📁 Release files are in: ${RELEASE_DIR}/`);
console.log(`\n📋 Summary of built binaries:`);

for (const target of targets) {
  const stats = await Bun.file(target.outfile).exists();
  if (stats) {
    const size = (await Bun.file(target.outfile).arrayBuffer()).byteLength;
    console.log(`  - ${target.description}: ${(size / 1024 / 1024).toFixed(1)} MB`);
  }
}

console.log(`\n🚀 Ready for ${VERSION} release!`);
