// ============================================================
//  PANTALLA DE CLAVE
// ============================================================
//  ATENCION: esto NO es seguridad real. La clave viaja en el codigo y
//  el catalogo completo ya esta en la pagina antes de escribirla.
//  Solo sirve para que no entre cualquiera de casualidad.
//
//  "Recordar este dispositivo": si el cliente marca la casilla al
//  entrar, se guarda una marca en este navegador (localStorage) y las
//  proximas veces el catalogo abre directo, sin pedir la clave, hasta
//  que pase RECORDAR_DIAS o hasta que se cambie la clave (la marca
//  guarda una huella de la clave con la que se entro; si la clave
//  cambia, vuelve a pedirla).
// ============================================================

const CATALOG_PASSWORD = "impoHogar2026";
const RECORDAR_DIAS = 90;                 // cuanto dura la marca (dias)
const RECORDAR_KEY = 'impohogar_acceso';  // nombre en localStorage

document.getElementById('gateBtn').addEventListener('click', checkPassword);
document.getElementById('gatePass').addEventListener('keydown', e => { if (e.key === 'Enter') checkPassword(); });

// Muestra la animacion de bienvenida por un momento y despues la
// esconde para revelar la pantalla de la clave que estaba debajo.
setTimeout(() => {
  const welcome = document.getElementById('welcomeScreen');
  if (!welcome) return;
  welcome.classList.add('fade-out');
  setTimeout(() => { welcome.style.display = 'none'; }, 500);
}, 2300);

// Huella simple de la clave (no es la clave en texto plano).
function claveHuella(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function dispositivoRecordado() {
  try {
    const raw = localStorage.getItem(RECORDAR_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    return d && d.h === claveHuella(CATALOG_PASSWORD) && Date.now() < d.hasta;
  } catch (e) { return false; }
}

function recordarDispositivo() {
  try {
    localStorage.setItem(RECORDAR_KEY, JSON.stringify({
      h: claveHuella(CATALOG_PASSWORD),
      hasta: Date.now() + RECORDAR_DIAS * 86400000
    }));
  } catch (e) {}
}

// Por si algun dia hace falta "cerrar sesion" desde la consola o un boton.
function olvidarDispositivo() {
  try { localStorage.removeItem(RECORDAR_KEY); } catch (e) {}
}

function abrirCatalogo() {
  document.getElementById('gate').style.display = 'none';
  document.getElementById('mainContent').style.display = 'block';
}

function checkPassword() {
  const val = document.getElementById('gatePass').value;
  if (val === CATALOG_PASSWORD) {
    const chk = document.getElementById('gateRemember');
    if (chk && chk.checked) recordarDispositivo();
    abrirCatalogo();
  } else {
    document.getElementById('gateError').textContent = 'Clave incorrecta';
  }
}

// Dispositivo ya recordado: la pantalla de clave no se muestra. La
// vitrina de entrada (showcase.js) sigue igual; al tocar "Ingresar"
// ya aparece el catalogo directamente.
if (dispositivoRecordado()) abrirCatalogo();