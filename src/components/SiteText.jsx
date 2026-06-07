import { splitReaderSafeChunks } from "../lib/reader-safe-text.js";

/** Bloques de texto público: <div> en lugar de <p> para reducir heurística “artículo” de Safari Reader. */
export function SiteText({ className = "", style, children, readerSafe = false }) {
  const cls = className ? `site-text ${className}` : "site-text";
  if (readerSafe && typeof children === "string") {
    const chunks = splitReaderSafeChunks(children);
    return (
      <div className={cls} style={style}>
        {chunks.map((chunk, i) => (
          <span key={i} className="site-text__chunk">
            {i > 0 ? " " : null}
            {chunk}
          </span>
        ))}
      </div>
    );
  }
  return (
    <div className={cls} style={style}>
      {children}
    </div>
  );
}
