/** Bloques de texto público: <div> en lugar de <p> para reducir heurística “artículo” de Safari Reader. */
export function SiteText({ className = "", style, children }) {
  return (
    <div className={className ? `site-text ${className}` : "site-text"} style={style}>
      {children}
    </div>
  );
}
