// ============================================================
//  PANTALLA DE CLAVE
// ============================================================
//  ATENCION: esto NO es seguridad real. La clave viaja en el codigo y
//  el catalogo completo ya esta en la pagina antes de escribirla.
//  Solo sirve para que no entre cualquiera de casualidad.
// ============================================================

const CATALOG_PASSWORD = "impoHogar2026";

document.getElementById('gateBtn').addEventListener('click', checkPassword);
document.getElementById('gatePass').addEventListener('keydown', e => { if (e.key === 'Enter') checkPassword(); });

function checkPassword() {
  const val = document.getElementById('gatePass').value;
  if (val === CATALOG_PASSWORD) {
    document.getElementById('gate').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
  } else {
    document.getElementById('gateError').textContent = 'Clave incorrecta';
  }
}
