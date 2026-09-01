// ============================================================
//  ARRANQUE
// ============================================================
//  Se ejecuta cuando la pagina termina de cargar y conecta todo.
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  try {
    initTheme();
    renderBrandFilter();
    renderTipoGeneroFilter();
    if (DIA_DEL_NINO_ACTIVE) { document.getElementById('diaNinoBtn').style.display = 'inline-block'; }
    restoreCartFromStorage();
    filteredProducts = VISIBLE_PRODUCTS;
    renderPage(true);
    document.getElementById('genBtn').textContent = 'Generar pedido (Excel + fotos)';
    const totalCount = VISIBLE_PRODUCTS.length;
    const missingPhotos = VISIBLE_PRODUCTS.filter(p => !p.img).length;
    const agotados = VISIBLE_PRODUCTS.filter(p => (parseInt(p.stock) || 0) <= 0).length;
    const noticeEl = document.getElementById('photoNotice');
    if (missingPhotos > 0 || agotados > 0) {
      noticeEl.textContent = `Fotos cargadas: ${totalCount - missingPhotos} de ${totalCount} productos. Los productos sin foto muestran un ícono de referencia (nombre de marca) hasta que se agregue su foto real. ${agotados} productos están sin stock y aparecen marcados como AGOTADO.`;
      noticeEl.style.display = 'block';
    } else {
      noticeEl.style.display = 'none';
    }
    document.getElementById('search').addEventListener('input', applyFilters);
    document.getElementById('brandFilter').addEventListener('change', () => { diaNinoMode = false; document.getElementById('diaNinoBanner').style.display = 'none'; applyFilters(); });
    document.getElementById('loadMoreBtn').addEventListener('click', () => renderPage(false));
    document.getElementById('genBtn').addEventListener('click', openCustomerModal);
    if (typeof ExcelJS === 'undefined') {
      setStatus('Aviso: librería Excel no cargó.', true);
    }
    const lbImg = document.getElementById('lightboxImg');
    lbImg.addEventListener('click', toggleZoom);
    lbImg.addEventListener('wheel', wheelZoom, { passive: false });
    lbImg.addEventListener('touchstart', touchZoomStart, { passive: false });
    lbImg.addEventListener('touchmove', touchZoomMove, { passive: false });
    lbImg.addEventListener('touchend', touchZoomEnd);
  } catch (err) {
    console.error(err);
    document.getElementById('count').textContent = 'Error cargando catálogo: ' + err.message;
  }
});
