/* Yan's Foodhouz POS — app logic
   All data persisted in localStorage. Works fully offline once cached by the service worker. */

const STORE_KEY = 'yans_pos_v2';

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

const SOURCES = [
  { key: 'walkin', label: 'Walk-in' },
  { key: 'grab', label: 'GrabFood' },
  { key: 'panda', label: 'FoodPanda' },
  { key: 'pickup', label: 'Pickup / Call-in' },
];
const PAY_METHODS = [
  { key: 'cash', label: 'Cash' },
  { key: 'gcash', label: 'GCash' },
];

function todayKey(d = new Date()) { return d.toISOString().slice(0, 10); }
function dateAdd(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return todayKey(d);
}
function formatDateLabel(dateStr) {
  const today = todayKey();
  if (dateStr === today) return 'Today';
  if (dateStr === dateAdd(today, -1)) return 'Yesterday';
  if (dateStr === dateAdd(today, 1)) return 'Tomorrow';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function loadState() {
  const raw = localStorage.getItem(STORE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch (e) { /* fall through */ }
  }
  return {
    menu: DEFAULT_MENU,
    inventoryByDate: { [todayKey()]: DEFAULT_INVENTORY },
    orders: []
  };
}
function saveState() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }

let state = loadState();
let cart = []; // { menuId, name, price, qty }
let selectedSource = 'walkin';
let selectedPay = 'cash';

let invCursorDate = todayKey();
let gcashCursorDate = todayKey();
let salesCursorDate = todayKey();

let invSearchTerm = '';
let menuSearchTerm = '';

const peso = n => '₱' + Number(n).toLocaleString('en-PH', { maximumFractionDigits: 0 });

/* ---------- Sidebar nav ---------- */
document.getElementById('tabs').addEventListener('click', e => {
  const btn = e.target.closest('button[data-view]');
  if (!btn) return;
  document.querySelectorAll('#tabs button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.view-section').forEach(v => v.style.display = 'none');
  document.getElementById('view-' + btn.dataset.view).style.display = 'block';
  renderAll();
});

/* ---------- Live clock ---------- */
function tickClock() {
  const now = new Date();
  document.getElementById('sidebarClock').textContent = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  document.getElementById('sidebarDate').textContent = now.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
}
tickClock();
setInterval(tickClock, 1000);

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

function renderSourceTiles() {
  document.getElementById('sourceTiles').innerHTML = SOURCES.map(s => `
    <button class="tile ${s.key === selectedSource ? 'selected' : ''}" data-key="${s.key}">
      <span class="nm">${s.label}</span>
    </button>`).join('');
  document.querySelectorAll('#sourceTiles .tile').forEach(btn => {
    btn.addEventListener('click', () => { selectedSource = btn.dataset.key; renderSourceTiles(); });
  });
}

function renderPayTiles() {
  document.getElementById('payTiles').innerHTML = PAY_METHODS.map(p => `
    <button class="tile ${p.key === selectedPay ? 'selected' : ''}" data-key="${p.key}">
      <span class="nm">${p.label}</span>
    </button>`).join('');
  document.querySelectorAll('#payTiles .tile').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedPay = btn.dataset.key;
      renderPayTiles();
      document.getElementById('gcashRefField').style.display = selectedPay === 'gcash' ? 'block' : 'none';
    });
  });
}

function renderOrderMenuGrid() {
  const grid = document.getElementById('orderMenuGrid');
  grid.innerHTML = state.menu.map(m => `
    <button class="tile" data-id="${m.id}">
      <span class="nm">${m.name}</span>
      <span class="pr">${peso(m.price)}</span>
    </button>`).join('');
  grid.querySelectorAll('.tile').forEach(btn => {
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

document.getElementById('newOrderFab').addEventListener('click', () => {
  cart = [];
  selectedSource = 'walkin';
  selectedPay = 'cash';
  document.getElementById('gcashRefField').style.display = 'none';
  document.getElementById('gcashRefInput').value = '';
  renderSourceTiles();
  renderPayTiles();
  renderOrderMenuGrid();
  renderCart();
  openSheet('orderSheetOverlay');
});

document.getElementById('confirmOrderBtn').addEventListener('click', () => {
  if (cart.length === 0) { alert('Add at least one item to the order.'); return; }
  const gcashRef = document.getElementById('gcashRefInput').value.trim();
  if (selectedPay === 'gcash' && !gcashRef) {
    alert('Enter the GCash reference number to confirm payment.');
    return;
  }
  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const order = {
    id: 'o' + Date.now(),
    timestamp: new Date().toISOString(),
    source: selectedSource,
    items: cart.map(c => ({ ...c })),
    total,
    status: 'queued',
    paymentMethod: selectedPay,
    gcashRef: selectedPay === 'gcash' ? gcashRef : '',
    paymentStatus: selectedPay === 'gcash' ? 'pending' : 'paid'
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
      <div class="items">${o.items.map(i => `${i.qty}× ${i.name}`).join(', ')}</div>
      <div class="meta">${new Date(o.timestamp).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })} ·
        ${o.paymentMethod === 'gcash' ? `GCash ${o.paymentStatus === 'paid' ? '<span class="badge b-paid">Confirmed</span>' : '<span class="badge b-pending">Pending</span>'}` : 'Cash'}
        · <span class="badge ${o.status === 'served' ? 'b-served' : 'b-queued'}">${o.status === 'served' ? 'Served' : 'Queued'}</span>
      </div>
      <div class="actions">
        <button class="btn btn-sm ${o.status === 'served' ? 'btn-ghost' : 'btn-primary'}" data-act="toggleStatus" style="flex:1;">
          ${o.status === 'served' ? 'Mark as Queued' : 'Mark as Served'}
        </button>
      </div>
    </div>`).join('');
  list.querySelectorAll('[data-act="toggleStatus"]').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = e.target.closest('.order-card').dataset.id;
      const o = state.orders.find(x => x.id === id);
      o.status = o.status === 'served' ? 'queued' : 'served';
      saveState();
      renderOrderList();
    });
  });
}

/* ================= INVENTORY (per date) ================= */

function getInvForDate(dateStr) {
  if (!state.inventoryByDate[dateStr]) state.inventoryByDate[dateStr] = [];
  return state.inventoryByDate[dateStr];
}

function renderInvDateNav() {
  document.getElementById('invDateLbl').textContent = formatDateLabel(invCursorDate);
}
document.getElementById('invDateNav').addEventListener('click', e => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  invCursorDate = dateAdd(invCursorDate, btn.dataset.act === 'next' ? 1 : -1);
  renderInvDateNav();
  renderInventory();
});

document.getElementById('endDayBtn').addEventListener('click', () => {
  const current = getInvForDate(invCursorDate);
  const nextDate = dateAdd(invCursorDate, 1);
  state.inventoryByDate[nextDate] = current.map(i => ({ ...i }));
  saveState();
  invCursorDate = nextDate;
  renderInvDateNav();
  renderInventory();
  alert('Stock carried over to ' + formatDateLabel(nextDate) + '.');
});

document.getElementById('invSearch').addEventListener('input', e => {
  invSearchTerm = e.target.value.trim().toLowerCase();
  renderInventory();
});

function renderInventory() {
  const list = document.getElementById('invList');
  const items = getInvForDate(invCursorDate).filter(i => i.name.toLowerCase().includes(invSearchTerm));
  if (items.length === 0) {
    list.innerHTML = '<div class="empty">No ingredients found for this date.</div>';
    return;
  }
  list.innerHTML = items.map(i => {
    const isLow = i.qty <= i.low;
    return `<div class="card" data-id="${i.id}" style="cursor:pointer;margin-bottom:0;">
      <div class="nm" style="font-weight:700;font-size:13.5px;">${i.name}${isLow ? ' <span class="low">⚠ low</span>' : ''}</div>
      <div style="color:#9a8868;font-size:12.5px;margin-top:2px;">${i.qty} ${i.unit} on hand</div>
    </div>`;
  }).join('');
  list.querySelectorAll('[data-id]').forEach(card => {
    card.addEventListener('click', () => openInvEdit(card.dataset.id));
  });
}

function openInvEdit(id) {
  const items = getInvForDate(invCursorDate);
  const i = items.find(x => x.id === id);
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
  const items = getInvForDate(invCursorDate);
  if (id) {
    Object.assign(items.find(x => x.id === id), { name, qty, unit, low });
  } else {
    items.push({ id: 'i' + Date.now(), name, qty, unit, low });
  }
  saveState();
  closeSheet('invSheetOverlay');
  renderInventory();
});

document.getElementById('deleteInvBtn').addEventListener('click', () => {
  const id = document.getElementById('invEditId').value;
  state.inventoryByDate[invCursorDate] = getInvForDate(invCursorDate).filter(x => x.id !== id);
  saveState();
  closeSheet('invSheetOverlay');
  renderInventory();
});

/* ================= GCASH / PAYMENTS (per date) ================= */

function renderGcashDateNav() {
  document.getElementById('gcashDateLbl').textContent = formatDateLabel(gcashCursorDate);
}
document.getElementById('gcashDateNav').addEventListener('click', e => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  gcashCursorDate = dateAdd(gcashCursorDate, btn.dataset.act === 'next' ? 1 : -1);
  renderGcashDateNav();
  renderGcash();
});

function renderGcash() {
  const list = document.getElementById('gcashList');
  const gcashOrders = state.orders.filter(o => o.paymentMethod === 'gcash' && o.timestamp.slice(0, 10) === gcashCursorDate);
  if (gcashOrders.length === 0) {
    list.innerHTML = '<div class="empty"><span class="ico">💳</span>No GCash orders for this date.</div>';
    return;
  }
  list.innerHTML = gcashOrders.map(o => `
    <div class="card order-card" data-id="${o.id}">
      <div class="top">
        ${sourceBadge(o.source)}
        <span class="total">${peso(o.total)}</span>
      </div>
      <div class="items">Ref #: ${o.gcashRef || '—'}</div>
      <div class="meta">${new Date(o.timestamp).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}</div>
      <div class="actions">
        ${o.paymentStatus === 'paid'
          ? '<span class="badge b-paid">Confirmed</span>'
          : `<button class="btn btn-primary btn-sm" style="flex:1;" data-act="confirm">Mark as confirmed</button>`}
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

/* ================= SALES SUMMARY (per date + charts) ================= */

let revChart = null, bestChart = null;

function renderSalesDateNav() {
  document.getElementById('salesDateLbl').textContent = formatDateLabel(salesCursorDate);
}
document.getElementById('salesDateNav').addEventListener('click', e => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  salesCursorDate = dateAdd(salesCursorDate, btn.dataset.act === 'next' ? 1 : -1);
  renderSalesDateNav();
  renderSales();
});

function ordersForDate(dateStr) {
  return state.orders.filter(o => o.timestamp.slice(0, 10) === dateStr);
}

function renderSales() {
  const dayOrders = ordersForDate(salesCursorDate);
  const total = dayOrders.reduce((s, o) => s + o.total, 0);
  const pendingGcash = state.orders.filter(o => o.paymentMethod === 'gcash' && o.paymentStatus === 'pending').length;
  const invToday = getInvForDate(invCursorDate);

  document.getElementById('statGrid').innerHTML = `
    <div class="stat"><div class="n">${peso(total)}</div><div class="l">Sales (${formatDateLabel(salesCursorDate)})</div></div>
    <div class="stat"><div class="n">${dayOrders.length}</div><div class="l">Orders</div></div>
    <div class="stat"><div class="n">${invToday.filter(i => i.qty <= i.low).length}</div><div class="l">Low stock items</div></div>
    <div class="stat"><div class="n">${pendingGcash}</div><div class="l">Pending GCash</div></div>
  `;

  // Revenue: selected day vs the day before it
  const prevDate = dateAdd(salesCursorDate, -1);
  const prevTotal = ordersForDate(prevDate).reduce((s, o) => s + o.total, 0);

  const revCtx = document.getElementById('revChart');
  if (revChart) revChart.destroy();
  revChart = new Chart(revCtx, {
    type: 'bar',
    data: {
      labels: [formatDateLabel(prevDate), formatDateLabel(salesCursorDate)],
      datasets: [{
        data: [prevTotal, total],
        backgroundColor: ['#d49a3a', '#c4502b'],
        borderRadius: 6
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { callback: v => '₱' + v } } }
    }
  });

  // Best sellers for selected day
  const counts = {};
  dayOrders.forEach(o => o.items.forEach(i => { counts[i.name] = (counts[i.name] || 0) + i.qty; }));
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const bestCtx = document.getElementById('bestChart');
  if (bestChart) bestChart.destroy();
  bestChart = new Chart(bestCtx, {
    type: 'bar',
    data: {
      labels: sorted.map(s => s[0]),
      datasets: [{
        data: sorted.map(s => s[1]),
        backgroundColor: '#7a2e1d',
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } }
    }
  });
}

/* ================= MENU MANAGEMENT ================= */

document.getElementById('menuSearch').addEventListener('input', e => {
  menuSearchTerm = e.target.value.trim().toLowerCase();
  renderMenuMgmt();
});

function renderMenuMgmt() {
  const list = document.getElementById('menuMgmtList');
  const items = state.menu.filter(m => m.name.toLowerCase().includes(menuSearchTerm));
  if (items.length === 0) {
    list.innerHTML = '<div class="empty">No menu items found.</div>';
    return;
  }
  list.innerHTML = items.map(m => `
    <div class="card" data-id="${m.id}" style="cursor:pointer;margin-bottom:0;">
      <div style="font-weight:700;font-size:13.5px;">${m.name}</div>
      <div style="color:#9a8868;font-size:12px;margin:2px 0 4px;">${m.cat}</div>
      <div style="color:var(--ember);font-weight:700;">${peso(m.price)}</div>
    </div>`).join('');
  list.querySelectorAll('[data-id]').forEach(card => {
    card.addEventListener('click', () => openMenuEdit(card.dataset.id));
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
  renderInvDateNav();
  renderInventory();
  renderGcashDateNav();
  renderGcash();
  renderSalesDateNav();
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
