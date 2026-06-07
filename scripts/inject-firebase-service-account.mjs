/**
 * One-off: merge Firebase service account JSON into .env as FIREBASE_SERVICE_ACCOUNT_JSON.
 * Usage: node scripts/inject-firebase-service-account.mjs <path-to-service-account.json>
 */
import fs from "fs";
import path from "path";

const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error("Usage: node scripts/inject-firebase-service-account.mjs <service-account.json>");
  process.exit(1);
}

const root = path.resolve(import.meta.dirname, "..");
const envPath = path.join(root, ".env");

const sa = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const oneLine = JSON.stringify(sa);
/** Comillas simples: dotenv/Vercel dejan el JSON literal; un solo JSON.parse en runtime. */
if (oneLine.includes("'")) {
  console.error("Service account JSON contains single quotes; use BASE64 env instead.");
  process.exit(1);
}
const envLine = `FIREBASE_SERVICE_ACCOUNT_JSON='${oneLine}'\n`;

let lines = [];
if (fs.existsSync(envPath)) {
  lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
}

const out = [];
let replaced = false;
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    out.push(line);
    continue;
  }
  const key = line.split("=")[0];
  if (key === "FIREBASE_SERVICE_ACCOUNT_JSON") {
    if (!replaced) {
      out.push(envLine.trimEnd());
      replaced = true;
    }
    continue;
  }
  out.push(line);
}

if (!replaced) {
  if (out.length && out[out.length - 1].trim() !== "") out.push("");
  out.push(envLine.trimEnd());
}

while (out.length && out[out.length - 1] === "") out.pop();
fs.writeFileSync(envPath, `${out.join("\n")}\n`, "utf8");
console.log("Updated .env: FIREBASE_SERVICE_ACCOUNT_JSON set.");
