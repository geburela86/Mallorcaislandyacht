import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { collectImagePathsFromDirectory } from "./site-media-collect.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const publicDir = path.join(rootDir, "public");
const distDir = path.join(rootDir, "dist");
const outPublic = path.join(publicDir, "site-media.json");
const outDist = path.join(distDir, "site-media.json");

function writeJson(file, paths) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(paths, null, 2) + "\n", "utf8");
}

function main() {
  const distMode = process.argv.includes("--dist");

  if (distMode) {
    if (!fs.existsSync(distDir)) {
      console.error("site-media: dist/ not found. Run vite build first.");
      process.exit(1);
    }
    const paths = [...new Set(collectImagePathsFromDirectory(distDir))].sort((a, b) =>
      a.localeCompare(b),
    );
    writeJson(outDist, paths);
    console.log(`site-media: wrote ${paths.length} paths (full hosting tree) → dist/site-media.json`);
    return;
  }

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const paths = [...new Set(collectImagePathsFromDirectory(publicDir))].sort((a, b) =>
    a.localeCompare(b),
  );
  writeJson(outPublic, paths);
  console.log(`site-media: wrote ${paths.length} paths → public/site-media.json`);
}

main();
