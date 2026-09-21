// ============================================================
//  MODO OSCURO / CLARO
// ============================================================

const THEME_ICON_SUN = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></svg>';
const THEME_ICON_MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg>';

function applyTheme(theme) {
  const btn = document.getElementById('themeToggle');
  if (theme === 'dark') {
    document.body.classList.add('dark');
    if (btn) { btn.innerHTML = THEME_ICON_SUN; btn.title = 'Cambiar a tema claro'; }
  } else {
    document.body.classList.remove('dark');
    if (btn) { btn.innerHTML = THEME_ICON_MOON; btn.title = 'Cambiar a tema oscuro'; }
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0C1016' : '#F6F4EF');
}

function toggleTheme() {
  const isDark = document.body.classList.contains('dark');
  const next = isDark ? 'light' : 'dark';
  applyTheme(next);
  try { localStorage.setItem('impohogar_theme', next); } catch (err) {}
}

function initTheme() {
  // Por defecto el catalogo abre en modo oscuro. Si el cliente ya eligio
  // un tema antes (guardado en su navegador), se respeta esa eleccion.
  let saved = 'dark';
  try { saved = localStorage.getItem('impohogar_theme') || 'dark'; } catch (err) {}
  applyTheme(saved);
}