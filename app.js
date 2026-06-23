/* Yan's Foodhouz POS — app logic
   All data persisted in localStorage. Works fully offline once cached by the service worker. */

const STORE_KEY = 'yans_pos_v3';
const SESSION_KEY = 'yans_pos_session';

const DEFAULT_MENU = [
  { id: 'm1', name: 'Sisig (Solo)', price: 150, cat: 'Pulutan', recipeIng: 'i2', recipeQty: 0.2 },
  { id: 'm2', name: 'Sisig (Sharing)', price: 280, cat: 'Pulutan', recipeIng: 'i2', recipeQty: 0.4 },
  { id: 'm3', name: 'Crispy Pata', price: 380, cat: 'Ulam', recipeIng: 'i1', recipeQty: 0.5 },
  { id: 'm4', name: 'Sinigang na Baboy', price: 220, cat: 'Ulam', recipeIng: 'i1', recipeQty: 0.3 },
  { id: 'm5', name: 'Adobo', price: 180, cat: 'Ulam', recipeIng: 'i1', recipeQty: 0.25 },
  { id: 'm6', name: 'Bulalo', price: 320, cat: 'Ulam', recipeIng: '', recipeQty: 0 },
  { id: 'm7', name: 'Inihaw na Liempo', price: 200, cat: 'Pulutan', recipeIng: 'i1', recipeQty: 0.3 },
  { id: 'm8', name: 'Pinakbet', price: 160, cat: 'Ulam', recipeIng: '', recipeQty: 0 },
  { id: 'm9', name: 'Lechon Kawali', price: 240, cat: 'Pulutan', recipeIng: 'i1', recipeQty: 0.35 },
  { id: 'm10', name: 'Rice (cup)', price: 20, cat: 'Side', recipeIng: 'i3', recipeQty: 0.2 },
  { id: 'm11', name: 'Paluto Cooking Fee', price: 100, cat: 'Service', recipeIng: '', recipeQty: 0 },
  { id: 'm12', name: 'Soft drinks', price: 40, cat: 'Drinks', recipeIng: '', recipeQty: 0 },
];

const DEFAULT_INVENTORY = [
  { id: 'i1', name: 'Pork Belly', qty: 12, unit: 'kg', low: 3, actualQty: null, verifiedAt: null },
  { id: 'i2', name: 'Pig Ears/Face (Sisig mix)', qty: 8, unit: 'kg', low: 2, actualQty: null, verifiedAt: null },
  { id: 'i3', name: 'Rice', qty: 25, unit: 'kg', low: 5, actualQty: null, verifiedAt: null },
  { id: 'i4', name: 'Cooking Oil', qty: 6, unit: 'L', low: 2, actualQty: null, verifiedAt: null },
  { id: 'i5', name: 'LPG Tank', qty: 2, unit: 'tanks', low: 1, actualQty: null, verifiedAt: null },
];

const ORDER_TYPES = [
  { key: 'dinein', label: 'Dine-in' },
  { key: 'pickup', label: 'Pickup' },
  { key: 'delivery', label: 'Delivery' },
];
const PLATFORMS = [
  { key: 'grab', label: 'GrabFood' },
  { key: 'panda', label: 'FoodPanda' },
  { key: 'other', label: 'Other / Lalamove' },
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
  if (raw) { try { return JSON.parse(raw); } catch (e) {} }
  return {
    menu: DEFAULT_MENU,
    inventoryByDate: { [todayKey()]: DEFAULT_INVENTORY },
    orders: []
  };
}
function saveState() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }

let state = loadState();
let cart = [];
let selectedType = 'dinein';
let selectedPlatform = 'grab';
let selectedPay = 'cash';

let invCursorDate = todayKey();
let gcashCursorDate = todayKey();
let salesCursorDate = todayKey();
let histCursorDate = todayKey();

let invSearchTerm = '';
let menuSearchTerm = '';

const peso = n => '₱' + Number(n).toLocaleString('en-PH', { maximumFractionDigits: 0 });

/* ================= LOGIN / SESSION ================= */

let session = null;
function loadSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (raw) { try { return JSON.parse(raw); } catch (e) {} }
  return null;
}
function saveSession(s) { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); session = s; }
function clearSession() { localStorage.removeItem(SESSION_KEY); session = null; }

let loginRole = 'cashier';
document.getElementById('roleTiles').addEventListener('click', e => {
  const btn = e.target.closest('.role-tile');
  if (!btn) return;
  loginRole = btn.dataset.role;
  document.querySelectorAll('.role-tile').forEach(t => t.classList.toggle('selected', t === btn));
});
document.querySelector('.role-tile[data-role="cashier"]').classList.add('selected');

document.getElementById('loginBtn').addEventListener('click', () => {
  const name = document.getElementById('loginName').value.trim() || (loginRole === 'rider' ? 'Rider' : 'Cashier');
  saveSession({ role: loginRole, name });
  applySession();
});
document.getElementById('logoutBtn').addEventListener('click', () => {
  clearSession();
  showLogin();
});

function showLogin() {
  document.getElementById('loginScreen').classList.remove('hide');
}

function applySession() {
  document.getElementById('loginScreen').classList.add('hide');
  document.getElementById('ubName').textContent = session.name;
  document.getElementById('ubRole').textContent = session.role === 'rider' ? 'Delivery Rider' : 'Cashier';

  // Gate nav by role
  document.querySelectorAll('#tabs button[data-view]').forEach(btn => {
    const roles = (btn.dataset.roles || '').split(',');
    btn.style.display = roles.includes(session.role) ? '' : 'none';
  });
  // If current active view isn't allowed, jump to Orders
  const activeBtn = document.querySelector('#tabs button.active');
  const activeRoles = (activeBtn.dataset.roles || '').split(',');
  if (!activeRoles.includes(session.role)) {
    document.querySelectorAll('#tabs button').forEach(b => b.classList.remove('active'));
    document.querySelector('#tabs button[data-view="orders"]').classList.add('active');
    document.querySelectorAll('.view-section').forEach(v => v.style.display = 'none');
    document.getElementById('view-orders').style.display = 'block';
  }
  // Riders default to the Queue sub-tab (most relevant) and skip the order-builder
  if (session.role === 'rider') {
    switchOrderSubtab('queue');
  }
  renderAll();
}

(function initSession() {
  session = loadSession();
  if (session) applySession();
  else showLogin();
})();

/* ---------- Sidebar nav ---------- */
document.getElementById('tabs').addEventListener('click', e => {
  const btn = e.target.closest('button[data-view]');
  if (!btn || btn.style.display === 'none') return;
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
setInterval(() => { tickClock(); if (session) renderLiveBits(); }, 1000);

function renderLiveBits() {
  // lightweight periodic refresh for "real time" panels without rebuilding everything
  if (document.getElementById('view-orders').style.display !== 'none') renderQueue();
  if (document.getElementById('view-sales').style.display !== 'none') renderDeliveries();
}

/* ---------- Sheet helpers ---------- */
function openSheet(id) { document.getElementById(id).classList.add('show'); }
function closeSheet(id) { document.getElementById(id).classList.remove('show'); }
document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => closeSheet(btn.dataset.close)));
document.querySelectorAll('.sheet-overlay').forEach(ov => ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('show'); }));

/* ================= ORDERS: sub-tabs ================= */

function switchOrderSubtab(name) {
  document.querySelectorAll('#orderSubtabs button').forEach(b => b.classList.toggle('active', b.dataset.sub === name));
  document.querySelectorAll('.subpanel').forEach(p => p.classList.toggle('active', p.id === 'sub-' + name));
  if (name === 'queue') renderQueue();
  if (name === 'history') renderHistory();
}
document.getElementById('orderSubtabs').addEventListener('click', e => {
  const btn = e.target.closest('button[data-sub]');
  if (!btn) return;
  switchOrderSubtab(btn.dataset.sub);
});

/* ---- New Order builder ---- */
function renderTypeTiles() {
  document.getElementById('typeTiles').innerHTML = ORDER_TYPES.map(t => `
    <button class="tile ${t.key === selectedType ? 'selected' : ''}" data-key="${t.key}"><span class="nm">${t.label}</span></button>`).join('');
  document.querySelectorAll('#typeTiles .tile').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedType = btn.dataset.key;
      renderTypeTiles();
      document.getElementById('platformField').style.display = selectedType === 'delivery' ? 'block' : 'none';
    });
  });
}
function renderPlatformTiles() {
  document.getElementById('platformTiles').innerHTML = PLATFORMS.map(p => `
    <button class="tile ${p.key === selectedPlatform ? 'selected' : ''}" data-key="${p.key}"><span class="nm">${p.label}</span></button>`).join('');
  document.querySelectorAll('#platformTiles .tile').forEach(btn => {
    btn.addEventListener('click', () => { selectedPlatform = btn.dataset.key; renderPlatformTiles(); });
  });
}
function renderPayTiles() {
  document.getElementById('payTiles').innerHTML = PAY_METHODS.map(p => `
    <button class="tile ${p.key === selectedPay ? 'selected' : ''}" data-key="${p.key}"><span class="nm">${p.label}</span></button>`).join('');
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
    <button class="tile" data-id="${m.id}"><span class="nm">${m.name}</span><span class="pr">${peso(m.price)}</span></button>`).join('');
  grid.querySelectorAll('.tile').forEach(btn => btn.addEventListener('click', () => addToCart(btn.dataset.id)));
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
        <button class="qty-btn" data-act="dec">−</button><span>${c.qty}</span><button class="qty-btn" data-act="inc">+</button>
        <span style="width:64px;text-align:right;">${peso(c.price * c.qty)}</span>
      </div>`).join('');
    rows.querySelectorAll('.cart-row').forEach(row => {
      const id = row.dataset.id;
      row.querySelector('[data-act="inc"]').addEventListener('click', () => { cart.find(c => c.menuId === id).qty++; renderCart(); });
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

function resetOrderBuilder() {
  cart = []; selectedType = 'dinein'; selectedPlatform = 'grab'; selectedPay = 'cash';
  document.getElementById('platformField').style.display = 'none';
  document.getElementById('gcashRefField').style.display = 'none';
  document.getElementById('gcashRefInput').value = '';
  renderTypeTiles(); renderPlatformTiles(); renderPayTiles(); renderOrderMenuGrid(); renderCart();
}

document.getElementById('newOrderFab').addEventListener('click', () => {
  document.querySelectorAll('#tabs button').forEach(b => b.classList.remove('active'));
  document.querySelector('#tabs button[data-view="orders"]').classList.add('active');
  document.querySelectorAll('.view-section').forEach(v => v.style.display = 'none');
  document.getElementById('view-orders').style.display = 'block';
  switchOrderSubtab('new');
  resetOrderBuilder();
});

document.getElementById('confirmOrderBtn').addEventListener('click', () => {
  if (cart.length === 0) { alert('Add at least one item to the order.'); return; }
  const gcashRef = document.getElementById('gcashRefInput').value.trim();
  if (selectedPay === 'gcash' && !gcashRef) { alert('Enter the GCash reference number to confirm payment.'); return; }

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const order = {
    id: 'o' + Date.now(),
    timestamp: new Date().toISOString(),
    type: selectedType,
    platform: selectedType === 'delivery' ? selectedPlatform : '',
    items: cart.map(c => ({ ...c })),
    total,
    status: 'queued',
    paymentMethod: selectedPay,
    gcashRef: selectedPay === 'gcash' ? gcashRef : '',
    paymentStatus: selectedPay === 'gcash' ? 'pending' : 'paid',
    takenBy: session ? session.name : ''
  };
  state.orders.unshift(order);
  deductStockForOrder(order);
  saveState();
  resetOrderBuilder();
  switchOrderSubtab('queue');
  renderAll();
});

function typeBadge(type, platform) {
  if (type === 'delivery') {
    const plat = PLATFORMS.find(p => p.key === platform);
    return `<span class="badge b-delivery">Delivery${plat ? ' · ' + plat.label : ''}</span>`;
  }
  if (type === 'pickup') return '<span class="badge b-pickup">Pickup</span>';
  return '<span class="badge b-dinein">Dine-in</span>';
}

/* ---- Queue: two-column status ---- */
function orderCardHtml(o, showServedLabel) {
  return `
    <div class="card order-card" data-id="${o.id}">
      <div class="top">${typeBadge(o.type, o.platform)}<span class="total">${peso(o.total)}</span></div>
      <div class="items">${o.items.map(i => `${i.qty}× ${i.name}`).join(', ')}</div>
      <div class="meta">${new Date(o.timestamp).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })} ·
        ${o.paymentMethod === 'gcash' ? `GCash ${o.paymentStatus === 'paid' ? '<span class="badge b-paid">Confirmed</span>' : '<span class="badge b-pending">Pending</span>'}` : 'Cash'}
      </div>
      <div class="actions">
        <button class="btn btn-sm ${showServedLabel ? 'btn-primary' : 'btn-ghost'}" data-act="toggleStatus" style="flex:1;">
          ${showServedLabel ? (o.type === 'delivery' ? 'Mark as Delivered' : 'Mark as Served') : 'Move back to Queue'}
        </button>
        <button class="btn btn-sm btn-ghost" data-act="receipt" style="flex:1;">Receipt</button>
      </div>
    </div>`;
}

function renderQueue() {
  const todays = state.orders.filter(o => o.timestamp.slice(0, 10) === todayKey());
  let queued = todays.filter(o => o.status === 'queued');
  let served = todays.filter(o => o.status === 'served');
  if (session && session.role === 'rider') {
    queued = queued.filter(o => o.type === 'delivery');
    served = served.filter(o => o.type === 'delivery');
  }
  document.getElementById('queuedCount').textContent = queued.length;
  document.getElementById('servedCount').textContent = served.length;
  document.getElementById('queuedList').innerHTML = queued.length
    ? queued.map(o => orderCardHtml(o, true)).join('')
    : '<div class="empty">Nothing queued.</div>';
  document.getElementById('servedList').innerHTML = served.length
    ? served.map(o => orderCardHtml(o, false)).join('')
    : '<div class="empty">Nothing served yet.</div>';

  document.querySelectorAll('#sub-queue [data-act="toggleStatus"]').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = e.target.closest('.order-card').dataset.id;
      const o = state.orders.find(x => x.id === id);
      o.status = o.status === 'served' ? 'queued' : 'served';
      saveState();
      renderQueue();
    });
  });
  document.querySelectorAll('#sub-queue [data-act="receipt"]').forEach(btn => {
    btn.addEventListener('click', e => showReceipt(e.target.closest('.order-card').dataset.id));
  });
}

/* ---- History panel ---- */
document.getElementById('histDateNav').addEventListener('click', e => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  histCursorDate = dateAdd(histCursorDate, btn.dataset.act === 'next' ? 1 : -1);
  renderHistory();
});
function renderHistory() {
  document.getElementById('histDateLbl').textContent = formatDateLabel(histCursorDate);
  const list = document.getElementById('historyList');
  const dayOrders = state.orders.filter(o => o.timestamp.slice(0, 10) === histCursorDate);
  if (dayOrders.length === 0) {
    list.innerHTML = '<div class="empty"><span class="ico">🧾</span>No orders on this date.</div>';
    return;
  }
  list.innerHTML = dayOrders.map(o => `
    <div class="card order-card" data-id="${o.id}">
      <div class="top">${typeBadge(o.type, o.platform)}<span class="total">${peso(o.total)}</span></div>
      <div class="items">${o.items.map(i => `${i.qty}× ${i.name}`).join(', ')}</div>
      <div class="meta">${new Date(o.timestamp).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })} · <span class="badge ${o.status === 'served' ? 'b-served' : 'b-queued'}">${o.status === 'served' ? 'Served' : 'Queued'}</span></div>
      <div class="actions"><button class="btn btn-sm btn-ghost" data-act="receipt" style="flex:1;">View Receipt</button></div>
    </div>`).join('');
  list.querySelectorAll('[data-act="receipt"]').forEach(btn => {
    btn.addEventListener('click', e => showReceipt(e.target.closest('.order-card').dataset.id));
  });
}

/* ---- Receipt sheet ---- */
function showReceipt(orderId) {
  const o = state.orders.find(x => x.id === orderId);
  if (!o) return;
  const lines = o.items.map(i => `
    <div class="rline"><span>${i.qty}× ${i.name}</span><span>${peso(i.price * i.qty)}</span></div>`).join('');
  document.getElementById('receiptBody').innerHTML = `
    <div class="rhead">
      <b>YAN'S FOODHOUZ</b><br>Quiricada-Almeda St.<br>
      ${new Date(o.timestamp).toLocaleString('en-PH')}
    </div>
    <hr>
    <div class="rline"><span>Order #</span><span>${o.id.slice(1)}</span></div>
    <div class="rline"><span>Type</span><span>${o.type}${o.platform ? ' (' + o.platform + ')' : ''}</span></div>
    <div class="rline"><span>Served by</span><span>${o.takenBy || '—'}</span></div>
    <hr>
    ${lines}
    <hr>
    <div class="rtotal"><span>TOTAL</span><span>${peso(o.total)}</span></div>
    <div class="rline"><span>Payment</span><span>${o.paymentMethod}${o.gcashRef ? ' #' + o.gcashRef : ''}</span></div>
    <div class="rline"><span>Status</span><span>${o.status}</span></div>
  `;
  openSheet('receiptSheetOverlay');
}

/* ================= INVENTORY (per date, live deduction) ================= */

function getInvForDate(dateStr) {
  if (!state.inventoryByDate[dateStr]) state.inventoryByDate[dateStr] = [];
  return state.inventoryByDate[dateStr];
}

function deductStockForOrder(order) {
  const inv = getInvForDate(todayKey());
  order.items.forEach(line => {
    const menuItem = state.menu.find(m => m.id === line.menuId);
    if (!menuItem || !menuItem.recipeIng || !menuItem.recipeQty) return;
    const ing = inv.find(i => i.id === menuItem.recipeIng);
    if (ing) ing.qty = Math.max(0, +(ing.qty - menuItem.recipeQty * line.qty).toFixed(2));
  });
}

function renderInvDateNav() { document.getElementById('invDateLbl').textContent = formatDateLabel(invCursorDate); }
document.getElementById('invDateNav').addEventListener('click', e => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  invCursorDate = dateAdd(invCursorDate, btn.dataset.act === 'next' ? 1 : -1);
  renderInvDateNav(); renderInventory();
});

document.getElementById('endDayBtn').addEventListener('click', () => {
  const current = getInvForDate(invCursorDate);
  const nextDate = dateAdd(invCursorDate, 1);
  state.inventoryByDate[nextDate] = current.map(i => ({
    ...i,
    qty: i.actualQty !== null && i.actualQty !== undefined ? i.actualQty : i.qty,
    actualQty: null, verifiedAt: null
  }));
  saveState();
  invCursorDate = nextDate;
  renderInvDateNav(); renderInventory();
  alert('Verified stock carried over to ' + formatDateLabel(nextDate) + '.');
});

document.getElementById('invSearch').addEventListener('input', e => { invSearchTerm = e.target.value.trim().toLowerCase(); renderInventory(); });

function renderInventory() {
  const list = document.getElementById('invList');
  const items = getInvForDate(invCursorDate).filter(i => i.name.toLowerCase().includes(invSearchTerm));
  if (items.length === 0) { list.innerHTML = '<div class="empty">No ingredients found for this date.</div>'; return; }
  list.innerHTML = items.map(i => {
    const isLow = i.qty <= i.low;
    const hasActual = i.actualQty !== null && i.actualQty !== undefined;
    const diff = hasActual ? +(i.actualQty - i.qty).toFixed(2) : null;
    return `<div class="card" data-id="${i.id}" style="margin-bottom:0;">
      <div class="nm" style="font-weight:700;font-size:13.5px;">${i.name}${isLow ? ' <span class="low">⚠ low</span>' : ''}</div>
      <div style="color:#9a8868;font-size:12.5px;margin-top:2px;">Estimated: ${i.qty} ${i.unit}</div>
      ${hasActual
        ? `<div class="${Math.abs(diff) < 0.001 ? 'ok-variance' : 'variance'}" style="margin-top:2px;">Verified: ${i.actualQty} ${i.unit} ${Math.abs(diff) < 0.001 ? '(matches)' : (diff > 0 ? '(+' + diff + ')' : '(' + diff + ')')}</div>`
        : `<div style="margin-top:2px;font-size:11.5px;color:#c79b59;">Not yet verified</div>`}
      <div style="display:flex;gap:6px;margin-top:8px;">
        <button class="btn btn-sm btn-ghost" data-act="verify" style="flex:1;">Verify count</button>
        <button class="btn btn-sm btn-ghost" data-act="edit" style="flex:1;">Edit</button>
      </div>
    </div>`;
  }).join('');
  list.querySelectorAll('[data-act="verify"]').forEach(btn => {
    btn.addEventListener('click', e => openVerify(e.target.closest('[data-id]').dataset.id));
  });
  list.querySelectorAll('[data-act="edit"]').forEach(btn => {
    btn.addEventListener('click', e => openInvEdit(e.target.closest('[data-id]').dataset.id));
  });
}

function openVerify(id) {
  const items = getInvForDate(invCursorDate);
  const i = items.find(x => x.id === id);
  if (!i) return;
  document.getElementById('verifyId').value = id;
  document.getElementById('verifyEstLine').textContent = `System estimate: ${i.qty} ${i.unit} on hand.`;
  document.getElementById('verifyActual').value = i.actualQty !== null && i.actualQty !== undefined ? i.actualQty : i.qty;
  openSheet('verifySheetOverlay');
}
document.getElementById('saveVerifyBtn').addEventListener('click', () => {
  const id = document.getElementById('verifyId').value;
  const actual = Number(document.getElementById('verifyActual').value);
  const i = getInvForDate(invCursorDate).find(x => x.id === id);
  if (i) { i.actualQty = actual; i.verifiedAt = new Date().toISOString(); }
  saveState();
  closeSheet('verifySheetOverlay');
  renderInventory();
});

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
    items.push({ id: 'i' + Date.now(), name, qty, unit, low, actualQty: null, verifiedAt: null });
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

function renderGcashDateNav() { document.getElementById('gcashDateLbl').textContent = formatDateLabel(gcashCursorDate); }
document.getElementById('gcashDateNav').addEventListener('click', e => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  gcashCursorDate = dateAdd(gcashCursorDate, btn.dataset.act === 'next' ? 1 : -1);
  renderGcashDateNav(); renderGcash();
});

function renderGcash() {
  const list = document.getElementById('gcashList');
  const gcashOrders = state.orders.filter(o => o.paymentMethod === 'gcash' && o.timestamp.slice(0, 10) === gcashCursorDate);
  if (gcashOrders.length === 0) { list.innerHTML = '<div class="empty"><span class="ico">💳</span>No GCash orders for this date.</div>'; return; }
  list.innerHTML = gcashOrders.map(o => `
    <div class="card order-card" data-id="${o.id}">
      <div class="top">${typeBadge(o.type, o.platform)}<span class="total">${peso(o.total)}</span></div>
      <div class="items">Ref #: ${o.gcashRef || '—'}</div>
      <div class="meta">${new Date(o.timestamp).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}</div>
      <div class="actions">
        ${o.paymentStatus === 'paid' ? '<span class="badge b-paid">Confirmed</span>' : `<button class="btn btn-primary btn-sm" style="flex:1;" data-act="confirm">Mark as confirmed</button>`}
      </div>
    </div>`).join('');
  list.querySelectorAll('[data-act="confirm"]').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = e.target.closest('.order-card').dataset.id;
      state.orders.find(o => o.id === id).paymentStatus = 'paid';
      saveState(); renderGcash(); renderQueue();
    });
  });
}

/* ================= SALES SUMMARY (per date + charts + deliveries) ================= */

let revChart = null, bestChart = null;

function renderSalesDateNav() { document.getElementById('salesDateLbl').textContent = formatDateLabel(salesCursorDate); }
document.getElementById('salesDateNav').addEventListener('click', e => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  salesCursorDate = dateAdd(salesCursorDate, btn.dataset.act === 'next' ? 1 : -1);
  renderSalesDateNav(); renderSales();
});

function ordersForDate(dateStr) { return state.orders.filter(o => o.timestamp.slice(0, 10) === dateStr); }

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

  const prevDate = dateAdd(salesCursorDate, -1);
  const prevTotal = ordersForDate(prevDate).reduce((s, o) => s + o.total, 0);

  const revCtx = document.getElementById('revChart');
  if (revChart) revChart.destroy();
  revChart = new Chart(revCtx, {
    type: 'bar',
    data: { labels: [formatDateLabel(prevDate), formatDateLabel(salesCursorDate)], datasets: [{ data: [prevTotal, total], backgroundColor: ['#d49a3a', '#c4502b'], borderRadius: 6 }] },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: v => '₱' + v } } } }
  });

  const counts = {};
  dayOrders.forEach(o => o.items.forEach(i => { counts[i.name] = (counts[i.name] || 0) + i.qty; }));
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const bestCtx = document.getElementById('bestChart');
  if (bestChart) bestChart.destroy();
  bestChart = new Chart(bestCtx, {
    type: 'bar',
    data: { labels: sorted.map(s => s[0]), datasets: [{ data: sorted.map(s => s[1]), backgroundColor: '#7a2e1d', borderRadius: 6 }] },
    options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } } }
  });

  renderDeliveries();
}

function renderDeliveries() {
  const list = document.getElementById('deliveryList');
  if (!list) return;
  const deliveries = state.orders.filter(o => o.type === 'delivery' && o.timestamp.slice(0, 10) === todayKey());
  if (deliveries.length === 0) { list.innerHTML = '<div class="empty"><span class="ico">🛵</span>No deliveries today yet.</div>'; return; }
  list.innerHTML = deliveries.map(o => `
    <div class="card order-card" data-id="${o.id}">
      <div class="top">${typeBadge(o.type, o.platform)}<span class="badge ${o.status === 'served' ? 'b-served' : 'b-queued'}">${o.status === 'served' ? 'Delivered' : 'Out / Preparing'}</span></div>
      <div class="items">${o.items.map(i => `${i.qty}× ${i.name}`).join(', ')}</div>
      <div class="meta">${new Date(o.timestamp).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })} · <span class="total">${peso(o.total)}</span></div>
      <div class="actions"><button class="btn btn-sm btn-ghost" data-act="receipt" style="flex:1;">Delivery Receipt</button></div>
    </div>`).join('');
  list.querySelectorAll('[data-act="receipt"]').forEach(btn => {
    btn.addEventListener('click', e => showReceipt(e.target.closest('.order-card').dataset.id));
  });
}

/* ================= MENU MANAGEMENT ================= */

document.getElementById('menuSearch').addEventListener('input', e => { menuSearchTerm = e.target.value.trim().toLowerCase(); renderMenuMgmt(); });

function populateRecipeSelect(selectedIng) {
  const sel = document.getElementById('menuRecipeIng');
  const ingredients = getInvForDate(todayKey());
  sel.innerHTML = '<option value="">— none —</option>' + ingredients.map(i => `<option value="${i.id}">${i.name}</option>`).join('');
  sel.value = selectedIng || '';
}

function renderMenuMgmt() {
  const list = document.getElementById('menuMgmtList');
  const items = state.menu.filter(m => m.name.toLowerCase().includes(menuSearchTerm));
  if (items.length === 0) { list.innerHTML = '<div class="empty">No menu items found.</div>'; return; }
  list.innerHTML = items.map(m => `
    <div class="card" data-id="${m.id}" style="cursor:pointer;margin-bottom:0;">
      <div style="font-weight:700;font-size:13.5px;">${m.name}</div>
      <div style="color:#9a8868;font-size:12px;margin:2px 0 4px;">${m.cat}</div>
      <div style="color:var(--ember);font-weight:700;">${peso(m.price)}</div>
    </div>`).join('');
  list.querySelectorAll('[data-id]').forEach(card => card.addEventListener('click', () => openMenuEdit(card.dataset.id)));
}

function openMenuEdit(id) {
  const m = state.menu.find(x => x.id === id);
  document.getElementById('menuEditId').value = id || '';
  document.getElementById('menuName').value = m ? m.name : '';
  document.getElementById('menuPrice').value = m ? m.price : '';
  document.getElementById('menuCat').value = m ? m.cat : '';
  populateRecipeSelect(m ? m.recipeIng : '');
  document.getElementById('menuRecipeQty').value = m ? (m.recipeQty || '') : '';
  document.getElementById('deleteMenuBtn').style.display = m ? 'block' : 'none';
  openSheet('menuSheetOverlay');
}
document.getElementById('addMenuBtn').addEventListener('click', () => openMenuEdit(null));

document.getElementById('saveMenuBtn').addEventListener('click', () => {
  const id = document.getElementById('menuEditId').value;
  const name = document.getElementById('menuName').value.trim();
  const price = Number(document.getElementById('menuPrice').value) || 0;
  const cat = document.getElementById('menuCat').value.trim() || 'Ulam';
  const recipeIng = document.getElementById('menuRecipeIng').value;
  const recipeQty = Number(document.getElementById('menuRecipeQty').value) || 0;
  if (!name) { alert('Enter an item name.'); return; }
  if (id) {
    Object.assign(state.menu.find(x => x.id === id), { name, price, cat, recipeIng, recipeQty });
  } else {
    state.menu.push({ id: 'm' + Date.now(), name, price, cat, recipeIng, recipeQty });
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
  renderTypeTiles(); renderPlatformTiles(); renderPayTiles(); renderOrderMenuGrid(); renderCart();
  renderQueue();
  renderHistory();
  renderInvDateNav(); renderInventory();
  renderGcashDateNav(); renderGcash();
  renderSalesDateNav(); renderSales();
  renderMenuMgmt();
}

/* ================= PWA: service worker ================= */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('service-worker.js').catch(() => {}); });
}
