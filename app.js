/* Yan's Foodhouz POS — app logic
   All data persisted in localStorage. Works fully offline once cached by the service worker. */

const STORE_KEY = 'yans_pos_v1';

const DEFAULT_MENU = [
  { id: 'm1', name: 'Sisig (Solo)', price: 150, cat: 'Pulutan' },
  { id: 'm2', name: 'Sisig (Sharing)', price: 280, cat: 'Pulutan' },
  { id: 'm3', name: 'Crispy Pata', price: 380, cat: 'Ulam' },
  { id: 'm4', name: 'Sinigang na Baboy', price: 220, cat: 'Ulam' },
  { id: 'm5', name: 'Adobo', price: 180, cat: 'Ulam' },
  { id: 'm6', name: 'Bulalo', price: 320, cat: 'Ulam' },
  { id: 'm7', name: 'Inihaw na Liempo', price: 200, cat: 'Pulutan' },
  { id: 'm8', name: 'Pinakbet', price: 160, cat: 'Ulam' },
  { id: 'm9', name: 'Lechon Kawali', price: 240, cat: 'Pulutan' },
  { id: 'm10', name: 'Rice (cup)', price: 20, cat: 'Side' },
  { id: 'm11', name: 'Paluto Cooking Fee', price: 100, cat: 'Service' },
  { id: 'm12', name: 'Soft drinks', price: 40, cat: 'Drinks' },
];

const DEFAULT_INVENTORY = [
  { id: 'i1', name: 'Pork Belly', qty: 12, unit: 'kg', low: 3 },
  { id: 'i2', name: 'Pig Ears/Face (Sisig mix)', qty: 8, unit: 'kg', low: 2 },
  { id: 'i3', name: 'Rice', qty: 25, unit: 'kg', low: 5 },
  { id: 'i4', name: 'Cooking Oil', qty: 6, unit: 'L', low: 2 },
  { id: 'i5', name: 'LPG Tank', qty: 2, unit: 'tanks', low: 1 },
];

function loadState() {
  const raw = localStorage.getItem(STORE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch (e) { /* fall through */ }
  }
  return {
    menu: DEFAULT_MENU,
    inventory: DEFAULT_INVENTORY,
    orders: []
  };
}

function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

let state = loadState();
let cart = []; // { menuId, name, price, qty }

const peso = n => '₱' + Number(n).toLocaleString('en-PH', { maximumFractionDigits: 0 });

function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

/* ---------- Tab navigation ---------- */
document.getElementById('tabs').addEventListener('click', e => {
  const btn = e.target.closest('button[data-view]');
  if (!btn) return;
  document.querySelectorAll('nav.tabs button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('main .view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + btn.dataset.view).classList.add('active');
  renderAll();
});

/* ---------- Sheet helpers ---------- */
function openSheet(id) { document.getElementById(id).classList.add('show'); }
function closeSheet(id) { document.getElementById(id).classList.remove('show'); }
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => closeSheet(btn.dataset.close));
});
document.querySelectorAll('.sheet-overlay').forEach(ov => {
  ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('show'); });
});

/* ================= ORDERS ================= */

function renderOrderMenuGrid() {
  const grid = document.getElementById('orderMenuGrid');
  grid.innerHTML = state.menu.map(m => `
    <button class="menu-item" data-id="${m.id}">
      <span class="nm">${m.name}</span>
      <span class="pr">${peso(m.price)}</span>
    </button>`).join('');
  grid.querySelectorAll('.menu-item').forEach(btn => {
    btn.addEventListener('click', () => addToCart(btn.dataset.id));
  });
}

function addToCart(menuId) {
  const item = state.menu.find(m => m.id === menuId);
  if (!item) return;
  const existing = cart.find(c => c.menuId === menuId);
  if (existing) existing.qty++;
  else cart.push({ menuId, name: item.name, price: item.price, qty: 1 });
  renderCart();
}

function renderCart() {
  const rows = document.getElementById('cartRows');
  if (cart.length === 0) {
    rows.innerHTML = '<div class="empty">Tap a menu item to add it</div>';
  } else {
    rows.innerHTML = cart.map(c => `
      <div class="cart-row" data-id="${c.menuId}">
        <span class="nm">${c.name}</span>
        <button class="qty-btn" data-act="dec">−</button>
        <span>${c.qty}</span>
        <button class="qty-btn" data-act="inc">+</button>
        <span style="width:64px;text-align:right;">${peso(c.price * c.qty)}</span>
      </div>`).join('');
    rows.querySelectorAll('.cart-row').forEach(row => {
      const id = row.dataset.id;
      row.querySelector('[data-act="inc"]').addEventListener('click', () => {
        cart.find(c => c.menuId === id).qty++;
        renderCart();
      });
      row.querySelector('[data-act="dec"]').addEventListener('click', () => {
        const item = cart.find(c => c.menuId === id);
        item.qty--;
        if (item.qty <= 0) cart = cart.filter(c => c.menuId !== id);
        renderCart();
      });
    });
  }
  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  document.getElementById('cartTotal').textContent = peso(total);
  document.getElementById('confirmTotal').textContent = peso(total);
}

document.getElementById('payMethod').addEventListener('change', e => {
  document.getElementById('gcashRefField').style.display = e.target.value === 'gcash' ? 'block' : 'none';
});

document.getElementById('newOrderFab').addEventListener('click', () => {
  cart = [];
  document.getElementById('orderSource').value = 'walkin';
  document.getElementById('payMethod').value = 'cash';
  document.getElementById('gcashRefField').style.display = 'none';
  document.getElementById('gcashRefInput').value = '';
  document.getElementById('customerSupplied').checked = false;
  renderOrderMenuGrid();
  renderCart();
  openSheet('orderSheetOverlay');
});

document.getElementById('confirmOrderBtn').addEventListener('click', () => {
  if (cart.length === 0) { alert('Add at least one item to the order.'); return; }
  const payMethod = document.getElementById('payMethod').value;
  const gcashRef = document.getElementById('gcashRefInput').value.trim();
  if (payMethod === 'gcash' && !gcashRef) {
    alert('Enter the GCash reference number to confirm payment.');
    return;
  }
  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const order = {
    id: 'o' + Date.now(),
    timestamp: new Date().toISOString(),
    source: document.getElementById('orderSource').value,
    items: cart.map(c => ({ ...c })),
    total,
    customerSupplied: document.getElementById('customerSupplied').checked,
    paymentMethod: payMethod,
    gcashRef: payMethod === 'gcash' ? gcashRef : '',
    paymentStatus: payMethod === 'gcash' ? 'pending' : 'paid'
  };
  state.orders.unshift(order);
  saveState();
  closeSheet('orderSheetOverlay');
  renderAll();
});

function sourceBadge(src) {
  const map = { walkin: ['Walk-in', 'b-walkin'], grab: ['GrabFood', 'b-grab'], panda: ['FoodPanda', 'b-panda'], pickup: ['Pickup', 'b-pickup'] };
  const [label, cls] = map[src] || [src, 'b-walkin'];
  return `<span class="badge ${cls}">${label}</span>`;
}

function renderOrderList() {
  const list = document.getElementById('orderList');
  const todays = state.orders.filter(o => o.timestamp.slice(0, 10) === todayKey());
  if (todays.length === 0) {
    list.innerHTML = '<div class="empty"><span class="ico">🍽️</span>No orders yet today. Tap + to start one.</div>';
    return;
  }
  list.innerHTML = todays.map(o => `
    <div class="card order-card" data-id="${o.id}">
      <div class="top">
        ${sourceBadge(o.source)}
        <span class="total">${peso(o.total)}</span>
      </div>
      <div class="items">${o.items.map(i => `${i.qty}× ${i.name}`).join(', ')}${o.customerSupplied ? ' • <em>paluto (own ingredients)</em>' : ''}</div>
      <div class="meta">${new Date(o.timestamp).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })} ·
        ${o.paymentMethod === 'gcash' ? `GCash ${o.paymentStatus === 'paid' ? '<span class="badge b-paid">Confirmed</span>' : '<span class="badge b-pending">Pending</span>'}` : 'Cash'}
      </div>
    </div>`).join('');
}

/* ================= INVENTORY ================= */

function renderInventory() {
  const list = document.getElementById('invList');
  if (state.inventory.length === 0) {
    list.innerHTML = '<div class="empty">No ingredients tracked yet.</div>';
    return;
  }
  list.innerHTML = state.inventory.map(i => {
    const isLow = i.qty <= i.low;
    return `<div class="cart-row" data-id="${i.id}" style="cursor:pointer;">
      <span class="nm">${i.name}${isLow ? ' <span class="low">⚠ low</span>' : ''}</span>
      <span>${i.qty} ${i.unit}</span>
    </div>`;
  }).join('');
  list.querySelectorAll('.cart-row').forEach(row => {
    row.addEventListener('click', () => openInvEdit(row.dataset.id));
  });
}

function openInvEdit(id) {
  const i = state.inventory.find(x => x.id === id);
  document.getElementById('invEditId').value = id || '';
  document.getElementById('invName').value = i ? i.name : '';
  document.getElementById('invQty').value = i ? i.qty : '';
  document.getElementById('invUnit').value = i ? i.unit : '';
  document.getElementById('invLow').value = i ? i.low : '';
  document.getElementById('deleteInvBtn').style.display = i ? 'block' : 'none';
  openSheet('invSheetOverlay');
}

document.getElementById('addInvBtn').addEventListener('click', () => openInvEdit(null));

document.getElementById('saveInvBtn').addEventListener('click', () => {
  const id = document.getElementById('invEditId').value;
  const name = document.getElementById('invName').value.trim();
  const qty = Number(document.getElementById('invQty').value) || 0;
  const unit = document.getElementById('invUnit').value.trim() || 'pcs';
  const low = Number(document.getElementById('invLow').value) || 0;
  if (!name) { alert('Enter an ingredient name.'); return; }
  if (id) {
    const item = state.inventory.find(x => x.id === id);
    Object.assign(item, { name, qty, unit, low });
  } else {
    state.inventory.push({ id: 'i' + Date.now(), name, qty, unit, low });
  }
  saveState();
  closeSheet('invSheetOverlay');
  renderInventory();
});

document.getElementById('deleteInvBtn').addEventListener('click', () => {
  const id = document.getElementById('invEditId').value;
  state.inventory = state.inventory.filter(x => x.id !== id);
  saveState();
  closeSheet('invSheetOverlay');
  renderInventory();
});

/* ================= GCASH / PAYMENTS ================= */

function renderGcash() {
  const list = document.getElementById('gcashList');
  const gcashOrders = state.orders.filter(o => o.paymentMethod === 'gcash');
  if (gcashOrders.length === 0) {
    list.innerHTML = '<div class="empty"><span class="ico">💳</span>No GCash orders yet.</div>';
    return;
  }
  list.innerHTML = gcashOrders.map(o => `
    <div class="card order-card" data-id="${o.id}">
      <div class="top">
        ${sourceBadge(o.source)}
        <span class="total">${peso(o.total)}</span>
      </div>
      <div class="items">Ref #: ${o.gcashRef || '—'}</div>
      <div class="meta">${new Date(o.timestamp).toLocaleString('en-PH')}</div>
      <div style="margin-top:8px;">
        ${o.paymentStatus === 'paid'
          ? '<span class="badge b-paid">Confirmed</span>'
          : `<button class="btn btn-primary" style="padding:8px;" data-act="confirm">Mark as confirmed</button>`}
      </div>
    </div>`).join('');
  list.querySelectorAll('[data-act="confirm"]').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = e.target.closest('.order-card').dataset.id;
      state.orders.find(o => o.id === id).paymentStatus = 'paid';
      saveState();
      renderGcash();
      renderOrderList();
    });
  });
}

/* ================= SALES SUMMARY ================= */

function renderSales() {
  const todays = state.orders.filter(o => o.timestamp.slice(0, 10) === todayKey());
  const total = todays.reduce((s, o) => s + o.total, 0);
  const pendingGcash = state.orders.filter(o => o.paymentMethod === 'gcash' && o.paymentStatus === 'pending').length;

  document.getElementById('statGrid').innerHTML = `
    <div class="stat"><div class="n">${peso(total)}</div><div class="l">Sales today</div></div>
    <div class="stat"><div class="n">${todays.length}</div><div class="l">Orders today</div></div>
    <div class="stat"><div class="n">${state.inventory.filter(i => i.qty <= i.low).length}</div><div class="l">Low stock items</div></div>
    <div class="stat"><div class="n">${pendingGcash}</div><div class="l">Pending GCash</div></div>
  `;

  const counts = {};
  todays.forEach(o => o.items.forEach(i => { counts[i.name] = (counts[i.name] || 0) + i.qty; }));
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  document.getElementById('bestSellers').innerHTML = sorted.length
    ? sorted.map(([name, qty]) => `<div class="cart-row"><span class="nm">${name}</span><span>${qty} sold</span></div>`).join('')
    : '<div class="empty">No sales yet today.</div>';

  const bySrc = {};
  todays.forEach(o => { bySrc[o.source] = (bySrc[o.source] || 0) + o.total; });
  document.getElementById('bySource').innerHTML = Object.keys(bySrc).length
    ? Object.entries(bySrc).map(([src, amt]) => `<div class="cart-row">${sourceBadge(src)}<span style="flex:1;"></span><span>${peso(amt)}</span></div>`).join('')
    : '<div class="empty">No sales yet today.</div>';
}

/* ================= MENU MANAGEMENT ================= */

function renderMenuMgmt() {
  const list = document.getElementById('menuMgmtList');
  list.innerHTML = state.menu.map(m => `
    <div class="cart-row" data-id="${m.id}" style="cursor:pointer;">
      <span class="nm">${m.name} <span style="color:#9a8868;font-size:11px;">(${m.cat})</span></span>
      <span>${peso(m.price)}</span>
    </div>`).join('');
  list.querySelectorAll('.cart-row').forEach(row => {
    row.addEventListener('click', () => openMenuEdit(row.dataset.id));
  });
}

function openMenuEdit(id) {
  const m = state.menu.find(x => x.id === id);
  document.getElementById('menuEditId').value = id || '';
  document.getElementById('menuName').value = m ? m.name : '';
  document.getElementById('menuPrice').value = m ? m.price : '';
  document.getElementById('menuCat').value = m ? m.cat : '';
  document.getElementById('deleteMenuBtn').style.display = m ? 'block' : 'none';
  openSheet('menuSheetOverlay');
}

document.getElementById('addMenuBtn').addEventListener('click', () => openMenuEdit(null));

document.getElementById('saveMenuBtn').addEventListener('click', () => {
  const id = document.getElementById('menuEditId').value;
  const name = document.getElementById('menuName').value.trim();
  const price = Number(document.getElementById('menuPrice').value) || 0;
  const cat = document.getElementById('menuCat').value.trim() || 'Ulam';
  if (!name) { alert('Enter an item name.'); return; }
  if (id) {
    Object.assign(state.menu.find(x => x.id === id), { name, price, cat });
  } else {
    state.menu.push({ id: 'm' + Date.now(), name, price, cat });
  }
  saveState();
  closeSheet('menuSheetOverlay');
  renderMenuMgmt();
});

document.getElementById('deleteMenuBtn').addEventListener('click', () => {
  const id = document.getElementById('menuEditId').value;
  state.menu = state.menu.filter(x => x.id !== id);
  saveState();
  closeSheet('menuSheetOverlay');
  renderMenuMgmt();
});

/* ================= RENDER ALL ================= */

function renderAll() {
  renderOrderList();
  renderInventory();
  renderGcash();
  renderSales();
  renderMenuMgmt();
}

renderAll();

/* ================= PWA: service worker ================= */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}
