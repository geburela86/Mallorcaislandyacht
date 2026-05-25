import fs from "fs";
import path from "path";

const IMG = /\.(png|jpe?g|webp|gif|svg|avif|bmp)$/i;

/**
 * Lists image URL paths as served from site root (e.g. /imagenes/a.jpg, /assets/foo-abc.png).
 * @param {string} rootAbs - Absolute path to document root (e.g. public/ or dist/)
 */
export function collectImagePathsFromDirectory(rootAbs) {
  const out = [];
  if (!fs.existsSync(rootAbs)) return out;

  function walk(absDir) {
    let names;
    try {
      names = fs.readdirSync(absDir);
    } catch {
      return;
    }
    for (const name of names) {
      if (name === ".DS_Store" || name === "site-media.json") continue;
      const full = path.join(absDir, name);
      let st;
      try {
        st = fs.statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        walk(full);
      } else if (IMG.test(name)) {
        out.push("/" + path.relative(rootAbs, full).split(path.sep).join("/"));
      }
    }
  }

  walk(rootAbs);
  return dedupePreferWebpOnDisk(out, rootAbs);
}

/** If `photo.PNG` and `photo.webp` both exist, list only WebP (smaller; same visual). */
function dedupePreferWebpOnDisk(paths, rootAbs) {
  const skip = new Set();
  for (const p of paths) {
    if (!/\.(png|jpe?g)$/i.test(p)) continue;
    const webpRel = p.replace(/\.(png|jpe?g)$/i, ".webp");
    try {
      if (fs.existsSync(path.join(rootAbs, webpRel.slice(1)))) skip.add(p);
    } catch {
      /* ignore */
    }
  }
  return paths.filter((p) => !skip.has(p));
}
