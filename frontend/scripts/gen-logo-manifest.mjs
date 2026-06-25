/**
 * Generate public/logos/manifest.json — a map of { TICKER: "ext" } built from
 * the logo files actually present in public/logos/.
 *
 * Runs automatically before `npm run dev` and `npm run build` (see the
 * predev/prebuild scripts in package.json), so it works identically in local
 * dev and in the Docker production build. The logo image files are committed;
 * this generated manifest is not (it stays gitignored and is rebuilt each time),
 * which keeps it in sync as logos are added or removed.
 *
 * Consumed by src/lib/logos.js and src/components/landing/Landing.jsx via a
 * static `import ... from ".../manifest.json"`, so it must exist before Vite
 * resolves the module graph.
 */
import { readdirSync, writeFileSync } from "node:fs";
import { join, dirname, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const logosDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "logos");
const IMG_EXT = new Set([".png", ".jpg", ".jpeg", ".ico", ".svg", ".webp", ".gif"]);

const manifest = {};
for (const file of readdirSync(logosDir)) {
  const ext = extname(file).toLowerCase();
  if (!IMG_EXT.has(ext)) continue;
  // Filename is TICKER.ext (e.g. ABG.ico); key is the bare ticker.
  manifest[basename(file, extname(file))] = ext.slice(1);
}

const outPath = join(logosDir, "manifest.json");
// Sort keys for stable, diff-friendly output.
const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(outPath, JSON.stringify(sorted, null, 2) + "\n");
console.log(`gen-logo-manifest: wrote ${Object.keys(sorted).length} entries → ${outPath}`);
