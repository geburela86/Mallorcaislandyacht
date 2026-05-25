/**
 * Verifies FIREBASE_SERVICE_ACCOUNT_JSON in .env parses like api/lib/firebase-admin.js (one or two JSON.parse).
 * Usage: node scripts/verify-firebase-service-account-env.mjs
 */
import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");
const envPath = path.join(root, ".env");
const text = fs.readFileSync(envPath, "utf8");
const line = text.split(/\r?\n/).find((l) => l.startsWith("FIREBASE_SERVICE_ACCOUNT_JSON="));
if (!line) {
  console.error("Missing FIREBASE_SERVICE_ACCOUNT_JSON in .env");
  process.exit(1);
}
const rest = line.slice("FIREBASE_SERVICE_ACCOUNT_JSON=".length).trim();
let raw = rest;
if (raw.startsWith("'") && raw.endsWith("'")) raw = raw.slice(1, -1);
else if (raw.startsWith('"') && raw.endsWith('"')) {
  try {
    raw = JSON.parse(raw);
  } catch {
    console.error("Could not unquote FIREBASE_SERVICE_ACCOUNT_JSON value");
    process.exit(1);
  }
}
let v = JSON.parse(raw);
if (typeof v === "string") v = JSON.parse(v);
if (!v || typeof v !== "object" || v.type !== "service_account") {
  console.error("Parsed value is not a service account object");
  process.exit(1);
}
if (!v.private_key || !v.client_email) {
  console.error("Missing private_key or client_email");
  process.exit(1);
}
process.env.FIREBASE_SERVICE_ACCOUNT_JSON = raw;
let v2 = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim());
if (typeof v2 === "string") v2 = JSON.parse(v2);
if (v2.project_id !== v.project_id) process.exit(1);
console.log("OK: FIREBASE_SERVICE_ACCOUNT_JSON parses; project_id=" + v.project_id);
