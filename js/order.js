// ============================================================
//  GENERACION DEL PEDIDO
// ============================================================
//  Excel del pedido, ZIP de fotos, datos del cliente y envio por
//  WhatsApp al vendedor.
// ============================================================

let currentCustomer = { name: '', phone: '' };

let lastOrderSummary = { name: '', phone: '', totalProducts: 0, totalUnits: 0 };

let pendingPhotosZip = null;

function openCustomerModal() {
  const ids = Object.keys(qtyMap);
  if (ids.length === 0) {
    setStatus('Selecciona al menos un producto.', true);
    return;
  }
  try {
    const saved = JSON.parse(localStorage.getItem('impohogar_customer') || '{}');
    document.getElementById('custName').value = saved.name || '';
    document.getElementById('custPhone').value = saved.phone || '';
  } catch (err) {}
  document.getElementById('custError').textContent = '';
  document.getElementById('customerModal').classList.add('open');
}

function closeCustomerModal() {
  document.getElementById('customerModal').classList.remove('open');
}

function confirmCustomerInfo() {
  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  if (!name || !phone) {
    document.getElementById('custError').textContent = 'Por favor completa tu nombre y teléfono.';
    return;
  }
  currentCustomer = { name, phone };
  try {
    localStorage.setItem('impohogar_customer', JSON.stringify(currentCustomer));
  } catch (err) {}
  closeCustomerModal();
  generateExcel();
}

async function generateExcel() {
  try {
    if (typeof ExcelJS === 'undefined') {
      setStatus('Error: librería Excel no disponible.', true);
      return;
    }
    const ids = Object.keys(qtyMap);
    if (ids.length === 0) {
      setStatus('Selecciona al menos un producto.', true);
      return;
    }
    setStatus('Generando tu pedido...', false);

    const customerName = (currentCustomer.name || '').trim();
    const customerPhone = (currentCustomer.phone || '').trim();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Pedido');

    sheet.getColumn(1).width = 20;
    sheet.getColumn(2).width = 50;
    sheet.getColumn(3).width = 20;

    const headerRow = sheet.addRow(['Codigo de barras', 'Descripcion', 'Cantidad']);
    headerRow.font = { bold: true };

    const historyItems = [];
    const photoItems = [];

    ids.forEach(id => {
      const p = PRODUCTS_BY_ID[id];
      historyItems.push({ code: p.code, name: p.name, brand: p.brand, qty: qtyMap[id] });
      sheet.addRow([p.code, p.name, qtyMap[id]]);
      if (p.img) {
        photoItems.push(p);
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);
    const fileTag = customerName ? `_${sanitizeFilename(customerName)}` : '';
    a.href = url;
    a.download = `Pedido${fileTag}_${today}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setStatus('✓ Excel descargado.', false);
    saveOrderToHistory(customerName, customerPhone, historyItems);
    lastOrderSummary = {
      name: customerName,
      phone: customerPhone,
      totalProducts: historyItems.length,
      totalUnits: historyItems.reduce((sum, it) => sum + it.qty, 0)
    };

    // Aviso a Google Analytics de que se genero un pedido, sin mandar
    // ningun dato personal del cliente (solo cantidades).
    if (typeof gtag === 'function') {
      gtag('event', 'generar_pedido', {
        cantidad_productos: lastOrderSummary.totalProducts,
        cantidad_unidades: lastOrderSummary.totalUnits
      });
    }

    clearCart();

    if (photoItems.length > 0) {
      await prepareOrderPhotosZip(photoItems, customerName, today, fileTag);
    } else {
      pendingPhotosZip = null;
    }

    showThankYouModal();
  } catch (err) {
    console.error(err);
    setStatus('Error al generar: ' + err.message, true);
  }
}

async function webpToJpegBlob(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('No se pudo descargar ' + url);
  const blob = await resp.blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);
  return await new Promise((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob fallo')), 'image/jpeg', 0.85);
  });
}

async function prepareOrderPhotosZip(photoItems, customerName, today, fileTag) {
  try {
    if (typeof JSZip === 'undefined') { pendingPhotosZip = null; return; }
    const zip = new JSZip();
    await Promise.all(photoItems.map(async p => {
      try {
        const jpegBlob = await webpToJpegBlob(`img/p${p.id}.webp?v=${IMG_VERSION}`);
        const safeName = sanitizeFilename(`${p.brand}_${p.name}`);
        zip.file(`${safeName}_${p.code}.jpg`, jpegBlob);
      } catch (e) {
        console.error('No se pudo incluir la foto de', p.code, e);
      }
    }));
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    pendingPhotosZip = { blob: zipBlob, filename: `Fotos_Pedido${fileTag}_${today}.zip` };
  } catch (err) {
    console.error('No se pudo generar el zip de fotos', err);
    pendingPhotosZip = null;
  }
}

function downloadPendingPhotosZip() {
  if (!pendingPhotosZip) return;
  const zipUrl = URL.createObjectURL(pendingPhotosZip.blob);
  const zipLink = document.createElement('a');
  zipLink.href = zipUrl;
  zipLink.download = pendingPhotosZip.filename;
  document.body.appendChild(zipLink);
  zipLink.click();
  document.body.removeChild(zipLink);
  URL.revokeObjectURL(zipUrl);
}

function showPhotosNoticeModal() {
  document.getElementById('photosNoticeModal').classList.add('open');
}

function hidePhotosNoticeModal() {
  document.getElementById('photosNoticeModal').classList.remove('open');
  openSellerModal();
}

function showThankYouModal() {
  closeOrderReview();
  document.getElementById('thanksModal').classList.add('open');
}

function hideThankYouModal() {
  document.getElementById('thanksModal').classList.remove('open');
  if (pendingPhotosZip) {
    showPhotosNoticeModal();
  } else {
    openSellerModal();
  }
}

function openSellerModal() {
  document.getElementById('sellerModal').classList.add('open');
}

function closeSellerModal() {
  document.getElementById('sellerModal').classList.remove('open');
}

function sendToSeller(key) {
  const seller = SELLERS[key];
  if (!seller) return;
  const s = lastOrderSummary;
  const message = `Buenas, mi nombre es ${s.name || ''}, este es mi pedido.`;
  const url = `https://wa.me/${seller.phone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
  closeSellerModal();
}