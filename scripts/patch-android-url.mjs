#!/usr/bin/env node
/**
 * Rewrites android/gradle.properties pwaUrl / pwaHost from a live HTTPS origin.
 * Used by .github/workflows/android-apk.yml
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const raw = (process.argv[2] || "").trim().replace(/\/$/, "");
if (!raw) {
  console.error("Usage: node scripts/patch-android-url.mjs <https://your-app.example>");
  process.exit(1);
}

let url;
try {
  url = new URL(raw);
} catch {
  console.error("Invalid URL:", raw);
  process.exit(1);
}
if (url.protocol !== "https:") {
  console.error("PWA URL must be https:// (Trusted Web Activity requirement)");
  process.exit(1);
}

const file = resolve("android/gradle.properties");
let text = readFileSync(file, "utf8");
text = text.replace(/^pwaUrl=.*$/m, `pwaUrl=${url.origin}`);
text = text.replace(/^pwaHost=.*$/m, `pwaHost=${url.hostname}`);
writeFileSync(file, text);
console.log(`Patched TWA origin → ${url.origin}`);
