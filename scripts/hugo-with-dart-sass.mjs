import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { delimiter } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const platformPackages = {
  "linux-x64": "sass-embedded-linux-x64",
  "linux-arm64": "sass-embedded-linux-arm64",
  "darwin-x64": "sass-embedded-darwin-x64",
  "darwin-arm64": "sass-embedded-darwin-arm64",
  "win32-x64": "sass-embedded-win32-x64",
  "win32-arm64": "sass-embedded-win32-arm64",
};

const platform = `${process.platform}-${process.arch}`;
const packageName = platformPackages[platform];
if (!packageName) {
  throw new Error(`Unsupported platform for Dart Sass: ${platform}`);
}

const packageDir = join(projectDir, "node_modules", packageName);
const compilerDir = join(packageDir, "dart-sass");
const compilerCandidates = process.platform === "win32"
  ? ["sass.bat", "sass.exe", "sass"]
  : ["sass"];
const compiler = compilerCandidates
  .map((name) => join(compilerDir, name))
  .find((path) => existsSync(path));

if (!compiler) {
  throw new Error(`Dart Sass binary was not installed for ${platform}`);
}

const hugoCandidates = process.platform === "win32"
  ? ["hugo.exe", "hugo"]
  : ["hugo"];
const hugo = hugoCandidates
  .map((name) => join(projectDir, "node_modules", "hugo-extended", "bin", name))
  .find((path) => existsSync(path));

if (!hugo) {
  throw new Error(`Hugo binary was not installed for ${platform}`);
}

const result = spawnSync(hugo, process.argv.slice(2), {
  env: {
    ...process.env,
    PATH: `${compilerDir}${delimiter}${process.env.PATH ?? ""}`,
  },
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);