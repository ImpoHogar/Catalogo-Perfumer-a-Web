// ============================================================
//  MODO OSCURO / CLARO
// ============================================================

function applyTheme(theme) {
  const btn = document.getElementById('themeToggle');
  if (theme === 'dark') {
    document.body.classList.add('dark');
    if (btn) btn.textContent = '☀️';
  } else {
    document.body.classList.remove('dark');
    if (btn) btn.textContent = '🌙';
  }
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