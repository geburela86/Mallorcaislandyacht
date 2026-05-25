const RASTER_EXT = /\.(png|jpe?g)$/i;

/**
 * Same path with .webp — for display only. Keeps stored URLs (.PNG in Firestore) unchanged.
 */
export function preferWebpUrl(url) {
  if (typeof url !== "string" || !url.trim()) return url;
  const t = url.trim();
  if (/\.webp$/i.test(t)) return t;
  if (!RASTER_EXT.test(t)) return t;
  return t.replace(RASTER_EXT, ".webp");
}
