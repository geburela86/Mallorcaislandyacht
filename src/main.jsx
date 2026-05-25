import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './site-shell.css'

try {
  const raw = sessionStorage.getItem('miy_site_public_boot_v1')
  if (raw) {
    const o = JSON.parse(raw)
    if (Array.isArray(o?.boats) && o.boats.length) {
      document.documentElement.classList.add('site-boot-ready')
    }
  }
} catch { /* private mode / quota */ }

import App from './App.jsx'
import { ErrorBoundary } from './ErrorBoundary.jsx'
import { installSafariReaderShortcutBlock } from './lib/block-safari-reader-shortcut.js'

installSafariReaderShortcutBlock()

/** Quitar HTML SEO estático antes de pintar (Safari Vista lector lo detecta al instante). */
document.getElementById('seo-prerender')?.remove()

const rootEl = document.getElementById('root')
if (!rootEl) {
  document.body.innerHTML = '<p style="font-family:sans-serif;padding:24px">Missing #root element.</p>'
} else {
  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </StrictMode>,
  )
}
