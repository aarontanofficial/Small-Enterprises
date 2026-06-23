// ============================================================
// YAN'S FOODHOUZ POS - app.js
// ============================================================

// ── INITIAL DATA ────────────────────────────────────────────
const DEFAULT_MENU = [
  // Ulam
  { id: 1, name: 'Adobo', price: 80, category: 'Ulam', icon: '🍲', recipe: { 'pork': 0.2 } },
  { id: 2, name: 'Sinigang', price: 95, category: 'Ulam', icon: '🍜', recipe: { 'pork': 0.25 } },
  { id: 3, name: 'Kare-Kare', price: 110, category: 'Ulam', icon: '🥘', recipe: { 'oxtail': 0.3 } },
  { id: 4, name: 'Dinuguan', price: 75, category: 'Ulam', icon: '🫕', recipe: { 'pork': 0.2 } },
  { id: 5, name: 'Pakbet', price: 70, category: 'Ulam', icon: '🥗', recipe: { 'veggies': 0.3 } },
  { id: 6, name: 'Caldereta', price: 100, category: 'Ulam', icon: '🍖', recipe: { 'beef': 0.25 } },
  // Pulutan
  { id: 7, name: 'Sisig', price: 120, category: 'Pulutan', icon: '🥓', recipe: { 'pig-ears': 0.2 } },
  { id: 8, name: 'Crispy Pata', price: 180, category: 'Pulutan', icon: '🍗', recipe: { 'pork-pata': 0.5 } },
  { id: 9, name: 'Chicharon', price: 60, category: 'Pulutan', icon: '🫙', recipe: { 'pork-skin': 0.1 } },
  { id: 10, name: 'Isaw', price: 40, category: 'Pulutan', icon: '🍡', recipe: { 'chicken-intestine': 0.15 } },
  { id: 11, name: 'Inihaw na Liempo', price: 130, category: 'Pulutan', icon: '🥩', recipe: { 'pork-belly': 0.3 } },
  // Rice/Side
  { id: 12, name: 'Kanin', price: 15, category: 'Rice/Side', icon: '🍚', recipe: { 'rice': 0.2 } },
  { id: 13, name: 'Garlic Rice', price: 25, category: 'Rice/Side', icon: '🍙', recipe: { 'rice': 0.2 } },
  { id: 14, name: 'Sawsawan', price: 10, category: 'Rice/Side', icon: '🫙', recipe: {} },
  // Drinks
  { id: 15, name: 'Sago't Gulaman', price: 25, category: 'Drinks', icon: '🧃', recipe: { 'sago': 0.05 } },
  { id: 16, name: 'Softdrinks', price: 35, category: 'Drinks', icon: '🥤', recipe: {} },
  { id: 17, name: 'Buko Juice', price: 40, category: 'Drinks', icon: '🥥', recipe: {} },
  { id: 18, name: 'Iced Tea', price: 30, category: 'Drinks', icon: '🍹', recipe: {} },
];

const DEFAULT_INGREDIENTS = [
  { id: 'pork', name: 'Pork', unit: 'kg', lowAt: 1 },
  { id: 'beef', name: 'Beef', unit: 'kg', lowAt: 1 },
  { id: 'pig-ears', name: 'Pig Ears', unit: 'kg', lowAt: 0.5 },
  { id: 'pork-pata', name: 'Pork Pata', unit: 'kg', lowAt: 1 },
  { id: 'pork-skin', name: 'Pork Skin', unit: 'kg', lowAt: 0.5 },
  { id: 'pork-belly', name: 'Pork Belly', unit: 'kg', lowAt: 1 },
  { id: 'oxtail', name: 'Oxtail', unit: 'kg', lowAt: 0.5 },
  { id: 'chicken-intestine', name: 'Chicken Intestine', unit: 'kg', lowAt: 0.5 },
  { id: 'veggies', name: 'Mixed Vegetables', unit: 'kg', lowAt: 1 },
  { id: 'rice', name: 'Rice', unit: 'kg', lowAt: 3 },
  { id: 'sago', name: 'Sago', unit: 'kg', lowAt: 0.3 },
];

const DEFAULT_STOCK = { pork:5, beef:3, 'pig-ears':2, 'pork-pata':4, 'pork-skin':1.5, 'pork-belly':3, oxtail:2, 'chicken-intestine':1.5, veggies:3, rice:10, sago:0.5 };

const DEFAULT_RIDERS = [
  { id: 'r1', name: 'Kuya Jun', phone: '09171234567' },
  { id: 'r2', name: 'Ate Maria', phone: '09189876543' },
];

// ── STATE ────────────────────────────────────────────────────
let state = {
  user: null, // { name, role }
  currentPage: 'dashboard',
  cart: [],
  orderType: 'dine-in',
  paymentMethod: 'cash',
  gcashRef: '',
  deliveryRider: '',
  deliveryAddress: '',
  menuCategory: 'All',
  menuSearch: '',
  invDate: todayStr(),
  gcashDate: todayStr(),
  txDate: todayStr(),
  txType: 'all',
  riderTab: 'queue',
  orderSubTab: 'new',
  historyType: 'all',
  sidebarCollapsed: false,
  riders: load('riders') || DEFAULT_RIDERS,
  menu: load('menu') || DEFAULT_MENU,
  ingredients: load('ingredients') || DEFAULT_INGREDIENTS,
  stock: load('stock') || {}, // { date: { ingredientId: qty } }
  orders: load('orders') || [],
  gcashLog: load('gcashLog') || [],
  orderCounter: load('orderCounter') || 1,
  riderProofs: load('riderProofs') || [],
};

// ── UTILITIES ────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function fmtDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
}
function fmtPeso(n) { return '₱' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function save(key, val) { try { localStorage.setItem('yans_' + key, JSON.stringify(val)); } catch(e){} }
function load(key) { try { const v = localStorage.getItem('yans_' + key); return v ? JSON.parse(v) : null; } catch(e){ return null; } }
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function toast(msg, type='') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast ' + type; t.style.display = 'block';
  setTimeout(() => t.style.display = 'none', 2800);
}
function showModal(html) {
  document.getElementById('modalBox').innerHTML = html;
  document.getElementById('modalOverlay').style.display = 'flex';
}
function closeModal(e) {
  if (e && e.target !== document.getElementById('modalOverlay')) return;
  document.getElementById('modalOverlay').style.display = 'none';
}
function closeModalDirect() {
  document.getElementById('modalOverlay').style.display = 'none';
}

// ── STOCK HELPERS ────────────────────────────────────────────
function getStock(date) {
  return state.stock[date] || Object.assign({}, DEFAULT_STOCK);
}
function setStock(date, data) {
  state.stock[date] = data;
  save('stock', state.stock);
}
function deductStock(orderItems) {
  const date = todayStr();
  const s = getStock(date);
  state.menu.forEach(m => {
    const item = orderItems.find(i => i.id === m.id);
    if (!item) return;
    Object.entries(m.recipe).forEach(([ing, qty]) => {
      s[ing] = (s[ing] || 0) - qty * item.qty;
      if (s[ing] < 0) s[ing] = 0;
    });
  });
  setStock(date, s);
}
function carryStock() {
  const today = todayStr();
  const d = new Date(state.invDate);
  d.setDate(d.getDate() + 1);
  const next = d.toISOString().slice(0, 10);
  const current = getStock(state.invDate);
  if (!state.stock[next]) {
    setStock(next, Object.assign({}, current));
    toast('Stock carried to ' + fmtDate(next), 'success');
    state.invDate = next;
    renderPage();
  } else {
    toast('Next day stock already exists', 'error');
  }
}
function orderCost(items) {
  return items.reduce((s, i) => s + i.price * i.qty, 0);
}

// ── LOGIN ────────────────────────────────────────────────────
let selectedRole = 'cashier';
function selectRole(role, el) {
  selectedRole = role;
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
}
function doLogin() {
  const name = document.getElementById('loginName').value.trim();
  if (!name) { toast('Please enter your name', 'error'); return; }
  state.user = { name, role: selectedRole };
  document.getElementById('loginScreen').style.display = 'none';
  initApp();
}
function doLogout() {
  if (!confirm('Sign out?')) return;
  state.user = null;
  state.cart = [];
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginName').value = '';
}

// ── SIDEBAR / NAV ────────────────────────────────────────────
const CASHIER_PAGES = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-line' },
  { id: 'orders', label: 'Orders', icon: 'fa-utensils' },
  { id: 'inventory', label: 'Inventory', icon: 'fa-boxes-stacked' },
  { id: 'gcash', label: 'GCash', icon: 'fa-mobile-screen' },
  { id: 'transactions', label: 'Transactions', icon: 'fa-receipt' },
  { id: 'settings', label: 'Settings', icon: 'fa-gear' },
];
const RIDER_PAGES = [
  { id: 'rider-queue', label: 'Queue / Accepting', icon: 'fa-list-check' },
  { id: 'rider-proof', label: 'Proof of Delivery', icon: 'fa-camera' },
  { id: 'rider-history', label: 'My Deliveries', icon: 'fa-clock-rotate-left' },
];

function buildNav() {
  const pages = state.user?.role === 'rider' ? RIDER_PAGES : CASHIER_PAGES;
  const first = pages[0].id;
  if (state.currentPage !== first && !pages.find(p => p.id === state.currentPage)) {
    state.currentPage = first;
  }
  const nav = document.getElementById('sidebarNav');
  nav.innerHTML = pages.map(p => `
    <button class="nav-item ${state.currentPage === p.id ? 'active' : ''}" onclick="navigate('${p.id}')">
      <i class="fa ${p.icon}"></i>
      <span class="nav-label">${p.label}</span>
    </button>
  `).join('');

  const bn = document.getElementById('bottomNav');
  bn.innerHTML = pages.map(p => `
    <button class="bottom-nav-item ${state.currentPage === p.id ? 'active' : ''}" onclick="navigate('${p.id}')">
      <i class="fa ${p.icon}"></i>${p.label.split(' ')[0]}
    </button>
  `).join('');

  // user info
  document.getElementById('userAvatar').textContent = (state.user?.name || '?')[0].toUpperCase();
  document.getElementById('userName').textContent = state.user?.name || 'Guest';
  document.getElementById('userRoleLabel').textContent = (state.user?.role === 'rider' ? 'Delivery Rider' : 'Cashier') + ' · Sign out';
}

function toggleSidebar() {
  state.sidebarCollapsed = !state.sidebarCollapsed;
  document.getElementById('sidebar').classList.toggle('collapsed', state.sidebarCollapsed);
}

function navigate(page) {
  state.currentPage = page;
  buildNav();
  renderPage();
  updateTopbar();
}

function updateTopbar() {
  const pages = [...CASHIER_PAGES, ...RIDER_PAGES];
  const p = pages.find(x => x.id === state.currentPage);
  document.getElementById('topbarTitle').textContent = p ? p.label : '';
  const queuedOrders = state.orders.filter(o => o.status === 'queued').length;
  const badge = document.getElementById('queueBadge');
  if (state.currentPage === 'orders' && queuedOrders > 0) {
    badge.textContent = queuedOrders; badge.style.display = '';
  } else { badge.style.display = 'none'; }
  const now = new Date();
  document.getElementById('topbarDate').textContent = now.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ── CLOCK ────────────────────────────────────────────────────
function startClock() {
  function tick() {
    const now = new Date();
    document.getElementById('clockTime').textContent = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    document.getElementById('clockDate').textContent = now.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }
  tick(); setInterval(tick, 1000);
}

// ── RENDER PAGE ──────────────────────────────────────────────
function renderPage() {
  const mc = document.getElementById('mainContent');
  switch (state.currentPage) {
    case 'dashboard': mc.innerHTML = renderDashboard(); initCharts(); break;
    case 'orders': mc.innerHTML = renderOrders(); break;
    case 'inventory': mc.innerHTML = renderInventory(); break;
    case 'gcash': mc.innerHTML = renderGcash(); break;
    case 'transactions': mc.innerHTML = renderTransactions(); break;
    case 'settings': mc.innerHTML = renderSettings(); break;
    case 'rider-queue': mc.innerHTML = renderRiderQueue(); break;
    case 'rider-proof': mc.innerHTML = renderRiderProof(); break;
    case 'rider-history': mc.innerHTML = renderRiderHistory(); break;
  }
}

// ── INIT ────────────────────────────────────────────────────
function initApp() {
  buildNav();
  startClock();
  renderPage();
  updateTopbar();
  setInterval(updateTopbar, 30000);
}

// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard() {
  const today = todayStr();
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
  const yest = yesterday.toISOString().slice(0,10);
  const todayOrders = state.orders.filter(o => o.date === today);
  const yestOrders = state.orders.filter(o => o.date === yest);
  const todaySales = todayOrders.reduce((s,o) => s + o.total, 0);
  const yestSales = yestOrders.reduce((s,o) => s + o.total, 0);
  const todayCount = todayOrders.length;
  const liveDeliveries = state.orders.filter(o => o.date === today && o.orderType === 'delivery' && o.status !== 'served');

  // best sellers
  const tally = {};
  todayOrders.forEach(o => o.items.forEach(i => { tally[i.name] = (tally[i.name]||0) + i.qty; }));
  const best = Object.entries(tally).sort((a,b)=>b[1]-a[1]).slice(0,5);

  return `
  <div class="dashboard-grid">
    <div class="stat-card">
      <div class="stat-label"><i class="fa fa-peso-sign"></i> Today's Sales</div>
      <div class="stat-value">${fmtPeso(todaySales)}</div>
      <div class="stat-sub">${todayCount} orders</div>
    </div>
    <div class="stat-card">
      <div class="stat-label"><i class="fa fa-calendar-day"></i> Yesterday</div>
      <div class="stat-value">${fmtPeso(yestSales)}</div>
      <div class="stat-sub">${yestOrders.length} orders</div>
    </div>
    <div class="stat-card">
      <div class="stat-label"><i class="fa fa-motorcycle"></i> Live Deliveries</div>
      <div class="stat-value">${liveDeliveries.length}</div>
      <div class="stat-sub">active now</div>
    </div>
    <div class="stat-card">
      <div class="stat-label"><i class="fa fa-list-check"></i> Queue</div>
      <div class="stat-value">${state.orders.filter(o=>o.status==='queued').length}</div>
      <div class="stat-sub">pending orders</div>
    </div>
  </div>
  <div class="chart-grid">
    <div class="chart-card">
      <div class="chart-title">Revenue: Yesterday vs Today</div>
      <canvas id="revenueChart" height="180"></canvas>
    </div>
    <div class="chart-card">
      <div class="chart-title">Best Sellers Today</div>
      ${best.length ? `<canvas id="bestChart" height="180"></canvas>` : '<div class="empty-state"><i class="fa fa-chart-bar"></i>No orders yet today</div>'}
    </div>
  </div>
  <div class="card">
    <div class="card-header"><div class="card-title"><i class="fa fa-motorcycle"></i> Live Deliveries</div></div>
    ${liveDeliveries.length === 0 ? '<div class="empty-state"><i class="fa fa-check-circle"></i>No active deliveries</div>' :
      liveDeliveries.map(o => `
        <div class="rider-queue-card ${o.riderStatus||''}">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <strong>#${o.orderNo}</strong>
            <span class="badge badge-delivery">${o.riderName||'Unassigned'}</span>
          </div>
          <div style="font-size:12px;color:var(--gray-600);margin:4px 0">${o.deliveryAddress||'No address'}</div>
          <div style="font-size:12px;font-weight:700;color:var(--red)">${fmtPeso(o.total)}</div>
        </div>
      `).join('')
    }
  </div>
  `;
}

function initCharts() {
  const today = todayStr();
  const yest = new Date(); yest.setDate(yest.getDate()-1);
  const yestStr = yest.toISOString().slice(0,10);
  const todaySales = state.orders.filter(o=>o.date===today).reduce((s,o)=>s+o.total,0);
  const yestSales = state.orders.filter(o=>o.date===yestStr).reduce((s,o)=>s+o.total,0);

  const rc = document.getElementById('revenueChart');
  if (rc) {
    new Chart(rc, {
      type: 'bar',
      data: {
        labels: ['Yesterday', 'Today'],
        datasets: [{ data: [yestSales, todaySales], backgroundColor: ['#adb5bd','#c0392b'], borderRadius: 6 }]
      },
      options: { plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => '₱'+v.toLocaleString() } } } }
    });
  }

  const tally = {};
  state.orders.filter(o=>o.date===today).forEach(o => o.items.forEach(i => { tally[i.name]=(tally[i.name]||0)+i.qty; }));
  const best = Object.entries(tally).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const bc = document.getElementById('bestChart');
  if (bc && best.length) {
    new Chart(bc, {
      type: 'bar',
      data: {
        labels: best.map(b=>b[0]),
        datasets: [{ data: best.map(b=>b[1]), backgroundColor: '#c0392b', borderRadius: 6 }]
      },
      options: { indexAxis: 'y', plugins: { legend: { display: false } } }
    });
  }
}

// ============================================================
// ORDERS
// ============================================================
function renderOrders() {
  return `
  <div class="tab-bar">
    <button class="tab-btn ${state.orderSubTab==='new'?'active':''}" onclick="setOrderTab('new')"><i class="fa fa-plus"></i> New Order</button>
    <button class="tab-btn ${state.orderSubTab==='queue'?'active':''}" onclick="setOrderTab('queue')"><i class="fa fa-list"></i> Queue</button>
    <button class="tab-btn ${state.orderSubTab==='history'?'active':''}" onclick="setOrderTab('history')"><i class="fa fa-clock-rotate-left"></i> History</button>
  </div>
  <div id="orderTabContent">${renderOrderSubTab()}</div>
  `;
}
function setOrderTab(tab) {
  state.orderSubTab = tab;
  document.getElementById('orderTabContent').innerHTML = renderOrderSubTab();
}
function renderOrderSubTab() {
  switch (state.orderSubTab) {
    case 'new': return renderNewOrder();
    case 'queue': return renderQueue();
    case 'history': return renderHistory();
  }
}

// ── NEW ORDER ────────────────────────────────────────────────
function renderNewOrder() {
  const cats = ['All', ...new Set(state.menu.map(m => m.category))];
  const filtered = state.menu.filter(m =>
    (state.menuCategory === 'All' || m.category === state.menuCategory) &&
    (!state.menuSearch || m.name.toLowerCase().includes(state.menuSearch.toLowerCase()))
  );
  const stock = getStock(todayStr());
  const cartTotal = state.cart.reduce((s,i) => s+i.price*i.qty, 0);

  const deliveryOptions = state.orderType === 'delivery' ? `
    <div class="rider-select-row">
      <label style="font-size:11px;font-weight:600;color:var(--gray-600);display:block;margin-bottom:4px;">Assign Rider</label>
      <select class="rider-select" id="riderSelect" onchange="state.deliveryRider=this.value">
        <option value="">-- Select Rider --</option>
        ${state.riders.map(r=>`<option value="${r.id}" ${state.deliveryRider===r.id?'selected':''}>${r.name}</option>`).join('')}
        <option value="lalamove">Lalamove</option>
      </select>
      <div class="delivery-address" style="margin-top:8px">
        <label style="font-size:11px;font-weight:600;color:var(--gray-600);display:block;margin-bottom:4px;">Delivery Address</label>
        <input type="text" placeholder="Customer address (within 10km of Quiricada)" value="${state.deliveryAddress}" oninput="state.deliveryAddress=this.value" style="width:100%;padding:7px;border:1px solid var(--gray-300);border-radius:4px;font-size:12px;">
        <button class="btn btn-outline btn-sm" style="margin-top:4px;width:100%" onclick="useMyLocation()"><i class="fa fa-location-dot"></i> Use Current Location</button>
        <div id="locationStatus" style="font-size:10px;color:var(--gray-500);margin-top:4px;"></div>
      </div>
    </div>
  ` : '';

  const gcashInput = state.paymentMethod === 'gcash' ? `
    <input class="gcash-ref-input" id="gcashRefInput" placeholder="GCash Reference #" value="${state.gcashRef}" oninput="state.gcashRef=this.value">
  ` : '';

  return `
  <div class="order-layout">
    <div class="menu-section">
      <div class="search-row">
        <input class="search-input" type="text" placeholder="Search menu..." value="${state.menuSearch}" oninput="state.menuSearch=this.value;document.getElementById('orderTabContent').innerHTML=renderOrderSubTab()">
      </div>
      <div class="menu-categories">
        ${cats.map(c=>`<button class="cat-btn ${state.menuCategory===c?'active':''}" onclick="state.menuCategory='${c}';document.getElementById('orderTabContent').innerHTML=renderOrderSubTab()">${c}</button>`).join('')}
      </div>
      <div class="menu-grid">
        ${filtered.map(m => {
          const estStock = Object.entries(m.recipe).every(([ing,qty]) => (stock[ing]||0) >= qty);
          return `
          <div class="menu-tile ${!estStock?'out-of-stock':''}" onclick="${estStock?`addToCart(${m.id})`:'toast(\"Low stock!\",\"error\")'}">
            <div class="tile-icon">${m.icon}</div>
            <div class="tile-name">${m.name}</div>
            <div class="tile-price">${fmtPeso(m.price)}</div>
            <div class="tile-stock">${Object.entries(m.recipe).map(([ing,q])=>`${state.ingredients.find(i=>i.id===ing)?.name||ing}: ${((stock[ing]||0)/q).toFixed(0)} svgs`).join(', ')||'In stock'}</div>
          </div>`;
        }).join('')}
      </div>
    </div>
    <div class="cart-panel">
      <div class="cart-header">
        <div class="cart-header-title"><i class="fa fa-shopping-basket"></i> Cart</div>
        <div class="order-type-row">
          ${['dine-in','pickup','delivery'].map(t=>`
            <button class="type-btn ${state.orderType===t?'active':''}" onclick="state.orderType='${t}';document.getElementById('orderTabContent').innerHTML=renderOrderSubTab()">
              <i class="fa ${t==='dine-in'?'fa-utensils':t==='pickup'?'fa-bag-shopping':'fa-motorcycle'}"></i> ${t.charAt(0).toUpperCase()+t.slice(1).replace('-',' ')}
            </button>
          `).join('')}
        </div>
        ${deliveryOptions}
      </div>
      <div class="cart-body">
        ${state.cart.length === 0 ? `<div class="cart-empty"><i class="fa fa-basket-shopping"></i>Add items from the menu</div>` :
          state.cart.map(i => `
          <div class="cart-item">
            <div class="cart-item-name">${i.name}</div>
            <div class="cart-qty">
              <button class="qty-btn" onclick="changeQty(${i.id},-1)">−</button>
              <span style="font-size:13px;font-weight:600;min-width:20px;text-align:center">${i.qty}</span>
              <button class="qty-btn" onclick="changeQty(${i.id},1)">+</button>
            </div>
            <div class="cart-item-price">${fmtPeso(i.price*i.qty)}</div>
          </div>
          `).join('')
        }
      </div>
      <div class="cart-footer">
        <div class="cart-total-row">
          <div class="cart-total-label">Total</div>
          <div class="cart-total-amount">${fmtPeso(cartTotal)}</div>
        </div>
        <div class="section-label" style="margin-bottom:6px">Payment Method</div>
        <div class="payment-methods">
          ${['cash','gcash','card','utang'].map(pm=>`
            <button class="pay-btn ${state.paymentMethod===pm?'active':''}" onclick="state.paymentMethod='${pm}';document.getElementById('orderTabContent').innerHTML=renderOrderSubTab()">
              <i class="fa ${pm==='cash'?'fa-money-bill-wave':pm==='gcash'?'fa-mobile-screen':pm==='card'?'fa-credit-card':'fa-handshake'}"></i> ${pm.charAt(0).toUpperCase()+pm.slice(1)}
            </button>
          `).join('')}
        </div>
        ${gcashInput}
        <button class="btn btn-primary" style="width:100%;margin-top:10px;justify-content:center;padding:12px" onclick="placeOrder()" ${state.cart.length===0?'disabled':''}>
          <i class="fa fa-check"></i> Place Order
        </button>
        <button class="btn btn-outline btn-sm" style="width:100%;margin-top:6px;justify-content:center" onclick="state.cart=[];document.getElementById('orderTabContent').innerHTML=renderOrderSubTab()">
          <i class="fa fa-trash"></i> Clear Cart
        </button>
      </div>
    </div>
  </div>
  `;
}

function addToCart(menuId) {
  const item = state.menu.find(m => m.id === menuId);
  const existing = state.cart.find(c => c.id === menuId);
  if (existing) { existing.qty++; }
  else { state.cart.push({ ...item, qty: 1 }); }
  document.getElementById('orderTabContent').innerHTML = renderOrderSubTab();
}

function changeQty(id, delta) {
  const i = state.cart.find(c => c.id === id);
  if (!i) return;
  i.qty += delta;
  if (i.qty <= 0) state.cart = state.cart.filter(c => c.id !== id);
  document.getElementById('orderTabContent').innerHTML = renderOrderSubTab();
}

function useMyLocation() {
  if (!navigator.geolocation) { toast('Geolocation not supported', 'error'); return; }
  document.getElementById('locationStatus').textContent = 'Getting location...';
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude: lat, longitude: lng } = pos.coords;
    // Store Quiricada Almeda approx coords: 14.6073, 121.0093
    const storeLat = 14.6073, storeLng = 121.0093;
    const R = 6371;
    const dLat = (lat - storeLat) * Math.PI / 180;
    const dLng = (lng - storeLng) * Math.PI / 180;
    const a = Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(storeLat*Math.PI/180)*Math.cos(lat*Math.PI/180)*Math.sin(dLng/2)*Math.sin(dLng/2);
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    if (dist > 10) {
      document.getElementById('locationStatus').textContent = `⚠ ${dist.toFixed(1)}km away — outside 10km range`;
    } else {
      state.deliveryAddress = `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)} (${dist.toFixed(1)}km from store)`;
      document.getElementById('locationStatus').textContent = `✓ ${dist.toFixed(1)}km from store`;
      document.querySelector('input[oninput*="deliveryAddress"]').value = state.deliveryAddress;
    }
  }, () => { document.getElementById('locationStatus').textContent = 'Location access denied'; });
}

function placeOrder() {
  if (state.cart.length === 0) { toast('Cart is empty', 'error'); return; }
  if (state.orderType === 'delivery' && !state.deliveryRider) { toast('Please assign a rider', 'error'); return; }
  if (state.paymentMethod === 'gcash' && !state.gcashRef) { toast('Enter GCash reference number', 'error'); return; }

  const total = state.cart.reduce((s,i) => s + i.price*i.qty, 0);
  const orderId = genId();
  const orderNo = 'ORD-' + String(state.orderCounter).padStart(4, '0');
  state.orderCounter++;
  save('orderCounter', state.orderCounter);

  const rider = state.riders.find(r => r.id === state.deliveryRider);
  const order = {
    id: orderId,
    orderNo,
    date: todayStr(),
    time: Date.now(),
    items: state.cart.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
    total,
    orderType: state.orderType,
    paymentMethod: state.paymentMethod,
    gcashRef: state.gcashRef,
    deliveryRider: state.deliveryRider,
    riderName: state.deliveryRider === 'lalamove' ? 'Lalamove' : rider?.name || '',
    deliveryAddress: state.deliveryAddress,
    status: 'queued',
    riderStatus: state.orderType === 'delivery' ? 'pending' : null,
    cashierName: state.user?.name,
  };

  state.orders.push(order);
  save('orders', state.orders);

  // Add GCash log if paid by GCash
  if (state.paymentMethod === 'gcash') {
    state.gcashLog.push({ id: genId(), orderId, orderNo, ref: state.gcashRef, amount: total, date: todayStr(), time: Date.now(), status: 'confirmed' });
    save('gcashLog', state.gcashLog);
  }

  // Deduct stock
  deductStock(state.cart);

  toast(`Order ${orderNo} placed!`, 'success');
  state.cart = [];
  state.gcashRef = '';
  state.deliveryRider = '';
  state.deliveryAddress = '';
  updateTopbar();
  setOrderTab('queue');
}

// ── QUEUE ────────────────────────────────────────────────────
function renderQueue() {
  const queued = state.orders.filter(o => o.status === 'queued');
  const served = state.orders.filter(o => o.status === 'served' && o.date === todayStr());
  return `
  <div class="queue-grid">
    <div>
      <div class="queue-col-header"><i class="fa fa-clock" style="color:var(--orange)"></i> Queued (${queued.length})</div>
      ${queued.length === 0 ? '<div class="empty-state"><i class="fa fa-check-circle"></i>All orders served!</div>' :
        queued.map(o => queueCard(o)).join('')}
    </div>
    <div>
      <div class="queue-col-header"><i class="fa fa-check-circle" style="color:var(--green)"></i> Served Today (${served.length})</div>
      ${served.length === 0 ? '<div class="empty-state"><i class="fa fa-utensils"></i>None yet</div>' :
        served.map(o => queueCard(o)).join('')}
    </div>
  </div>
  `;
}
function queueCard(o) {
  return `
  <div class="queue-card ${o.status}">
    <div class="queue-card-header">
      <div class="queue-order-no">${o.orderNo}</div>
      <span class="badge ${o.orderType==='dine-in'?'badge-dinein':o.orderType==='pickup'?'badge-pickup':'badge-delivery'}">${o.orderType}</span>
    </div>
    <div class="queue-items">${o.items.map(i=>`${i.qty}x ${i.name}`).join(' · ')}</div>
    ${o.orderType==='delivery'?`<div style="font-size:11px;color:var(--gray-500);margin-bottom:4px"><i class="fa fa-motorcycle"></i> ${o.riderName||'Unassigned'} — ${o.deliveryAddress||'No address'}</div>`:''}
    <div class="queue-footer">
      <div class="queue-total">${fmtPeso(o.total)} · ${o.paymentMethod}</div>
      <div style="display:flex;gap:4px;align-items:center">
        <div class="queue-time">${fmtTime(o.time)}</div>
        ${o.status==='queued'?`<button class="btn btn-success btn-sm" onclick="markServed('${o.id}')"><i class="fa fa-check"></i> Served</button>`:''}
        <button class="btn btn-outline btn-sm" onclick="showReceipt('${o.id}')"><i class="fa fa-receipt"></i></button>
      </div>
    </div>
  </div>
  `;
}
function markServed(id) {
  const o = state.orders.find(o => o.id === id);
  if (o) { o.status = 'served'; save('orders', state.orders); updateTopbar(); setOrderTab('queue'); }
}

// ── HISTORY ────────────────────────────────────────────────────
function renderHistory() {
  const filtered = state.orders.filter(o => {
    const dateMatch = !state.txDate || o.date === state.txDate;
    const typeMatch = state.historyType === 'all' || o.orderType === state.historyType;
    return dateMatch && typeMatch;
  }).sort((a,b) => b.time - a.time);

  return `
  <div class="history-filter-row">
    <input type="date" value="${state.txDate}" onchange="state.txDate=this.value;setOrderTab('history')">
    <div class="tab-bar" style="flex:1;margin-bottom:0">
      ${['all','dine-in','pickup','delivery'].map(t=>`
        <button class="tab-btn ${state.historyType===t?'active':''}" onclick="state.historyType='${t}';setOrderTab('history')">${t.charAt(0).toUpperCase()+t.slice(1).replace('-',' ')}</button>
      `).join('')}
    </div>
  </div>
  <div class="card">
    ${filtered.length === 0 ? '<div class="empty-state"><i class="fa fa-receipt"></i>No orders found</div>' : `
    <div class="history-table-wrap">
    <table>
      <thead><tr><th>Order #</th><th>Items</th><th>Type</th><th>Payment</th><th>Total</th><th>Status</th><th>Time</th><th></th></tr></thead>
      <tbody>
      ${filtered.map(o=>`
        <tr>
          <td><strong>${o.orderNo}</strong></td>
          <td>${o.items.map(i=>`${i.qty}x ${i.name}`).join(', ')}</td>
          <td><span class="badge badge-${o.orderType==='dine-in'?'dinein':o.orderType}">${o.orderType}</span></td>
          <td>${o.paymentMethod}${o.gcashRef?` <small>(${o.gcashRef})</small>`:''}</td>
          <td><strong>${fmtPeso(o.total)}</strong></td>
          <td><span class="badge ${o.status==='queued'?'badge-queued':'badge-served'}">${o.status}</span></td>
          <td>${fmtTime(o.time)}</td>
          <td><button class="btn btn-outline btn-sm" onclick="showReceipt('${o.id}')"><i class="fa fa-receipt"></i></button></td>
        </tr>
      `).join('')}
      </tbody>
    </table>
    </div>`}
  </div>
  `;
}

// ── RECEIPT ────────────────────────────────────────────────────
function showReceipt(orderId) {
  const o = state.orders.find(o => o.id === orderId);
  if (!o) return;
  showModal(`
    <button class="modal-close" onclick="closeModalDirect()">×</button>
    <div class="modal-title"><i class="fa fa-receipt"></i> Receipt</div>
    <div class="receipt">
      <div class="receipt-center"><strong>YAN'S FOODHOUZ</strong></div>
      <div class="receipt-center">Quiricada Almeda Street</div>
      <div class="receipt-divider"></div>
      <div>Order: <strong>${o.orderNo}</strong></div>
      <div>Date: ${fmtDate(o.date)} ${fmtTime(o.time)}</div>
      <div>Type: ${o.orderType.toUpperCase()}</div>
      ${o.riderName?`<div>Rider: ${o.riderName}</div>`:''}
      ${o.deliveryAddress?`<div>Address: ${o.deliveryAddress}</div>`:''}
      <div class="receipt-divider"></div>
      ${o.items.map(i=>`<div>${i.qty}x ${i.name}<span style="float:right">${fmtPeso(i.price*i.qty)}</span></div>`).join('')}
      <div class="receipt-divider"></div>
      <div><strong>TOTAL<span style="float:right">${fmtPeso(o.total)}</span></strong></div>
      <div>Payment: ${o.paymentMethod.toUpperCase()}</div>
      ${o.gcashRef?`<div>Ref: ${o.gcashRef}</div>`:''}
      <div class="receipt-divider"></div>
      <div class="receipt-center">Thank you! Salamat po!</div>
    </div>
    <button class="btn btn-primary" style="width:100%;margin-top:12px;justify-content:center" onclick="printReceipt()"><i class="fa fa-print"></i> Print</button>
  `);
}
function printReceipt() { window.print(); }

// ============================================================
// INVENTORY
// ============================================================
function renderInventory() {
  const stock = getStock(state.invDate);
  const search = document.querySelector('#invSearch')?.value || '';
  const filtered = state.ingredients.filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()));

  return `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
    <div class="inventory-date-nav">
      <button class="date-nav-btn" onclick="shiftInvDate(-1)"><i class="fa fa-chevron-left"></i></button>
      <div class="date-nav-label">${state.invDate === todayStr() ? 'Today' : fmtDate(state.invDate)}</div>
      <button class="date-nav-btn" onclick="shiftInvDate(1)"><i class="fa fa-chevron-right"></i></button>
    </div>
    <div style="display:flex;gap:8px;align-items:center">
      <div class="search-row" style="margin:0">
        <input class="search-input" id="invSearch" type="text" placeholder="Search ingredients..." oninput="rerenderInventory()" style="width:180px">
        <button class="btn btn-primary btn-sm" onclick="showAddIngredient()"><i class="fa fa-plus"></i></button>
      </div>
      <button class="btn btn-outline btn-sm" onclick="carryStock()"><i class="fa fa-arrow-right"></i> End Shift</button>
    </div>
  </div>
  <div class="inventory-grid" id="invGrid">
    ${filtered.map(ing => {
      const qty = stock[ing.id] || 0;
      const isLow = qty <= ing.lowAt;
      const verified = stock['_verified_' + ing.id];
      return `
      <div class="inv-card ${verified && Math.abs(verified - qty) > 0.1 ? 'mismatch' : ''}">
        <div class="inv-name">${ing.name}</div>
        <div class="inv-unit">${ing.unit}</div>
        <div class="inv-row"><span class="inv-label">Estimated</span><span class="inv-value ${isLow?'low':'ok'}">${qty.toFixed(2)} ${ing.unit} ${isLow?'⚠ Low':''}</span></div>
        ${verified !== undefined ? `<div class="inv-row"><span class="inv-label">Verified</span><span class="inv-value">${verified.toFixed(2)} ${ing.unit}${Math.abs(verified-qty)>0.1?' ⚠ Mismatch':' ✓'}</span></div>` : ''}
        <input class="inv-verify" type="number" placeholder="Verify actual count" id="v_${ing.id}" step="0.1" min="0">
        <button class="inv-verify-btn" onclick="verifyStock('${ing.id}')"><i class="fa fa-check"></i> Verify Count</button>
      </div>`;
    }).join('')}
  </div>
  `;
}
function rerenderInventory() {
  document.getElementById('mainContent').innerHTML = renderInventory();
}
function shiftInvDate(delta) {
  const d = new Date(state.invDate);
  d.setDate(d.getDate() + delta);
  state.invDate = d.toISOString().slice(0, 10);
  document.getElementById('mainContent').innerHTML = renderInventory();
}
function verifyStock(ingId) {
  const val = parseFloat(document.getElementById('v_' + ingId)?.value);
  if (isNaN(val)) { toast('Enter a valid number', 'error'); return; }
  const s = getStock(state.invDate);
  s['_verified_' + ingId] = val;
  setStock(state.invDate, s);
  toast('Count verified!', 'success');
  document.getElementById('mainContent').innerHTML = renderInventory();
}
function showAddIngredient() {
  showModal(`
    <button class="modal-close" onclick="closeModalDirect()">×</button>
    <div class="modal-title">Add Ingredient</div>
    <div class="form-group"><label>Name</label><input id="newIngName" type="text" placeholder="e.g. Bangus"></div>
    <div class="form-group"><label>Unit</label><select id="newIngUnit"><option>kg</option><option>pcs</option><option>L</option><option>g</option></select></div>
    <div class="form-group"><label>Low Stock Alert At</label><input id="newIngLow" type="number" value="1" min="0" step="0.1"></div>
    <div class="form-group"><label>Initial Stock</label><input id="newIngQty" type="number" value="0" min="0" step="0.1"></div>
    <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="addIngredient()"><i class="fa fa-plus"></i> Add</button>
  `);
}
function addIngredient() {
  const name = document.getElementById('newIngName').value.trim();
  if (!name) { toast('Enter ingredient name', 'error'); return; }
  const id = name.toLowerCase().replace(/\s+/g,'-');
  const unit = document.getElementById('newIngUnit').value;
  const lowAt = parseFloat(document.getElementById('newIngLow').value) || 1;
  const qty = parseFloat(document.getElementById('newIngQty').value) || 0;
  if (state.ingredients.find(i => i.id === id)) { toast('Ingredient already exists', 'error'); return; }
  state.ingredients.push({ id, name, unit, lowAt });
  save('ingredients', state.ingredients);
  const s = getStock(state.invDate);
  s[id] = qty;
  setStock(state.invDate, s);
  closeModalDirect();
  toast('Ingredient added!', 'success');
  document.getElementById('mainContent').innerHTML = renderInventory();
}

// ============================================================
// GCASH
// ============================================================
function renderGcash() {
  const logs = state.gcashLog.filter(g => g.date === state.gcashDate);
  const total = logs.reduce((s,g) => s + g.amount, 0);
  return `
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap">
    <div class="date-nav">
      <button onclick="shiftGcashDate(-1)"><i class="fa fa-chevron-left"></i></button>
      <span>${state.gcashDate === todayStr() ? 'Today' : fmtDate(state.gcashDate)}</span>
      <button onclick="shiftGcashDate(1)"><i class="fa fa-chevron-right"></i></button>
    </div>
    <div style="margin-left:auto;font-size:14px;font-weight:700;color:var(--green)">${fmtPeso(total)} total</div>
    <button class="btn btn-primary btn-sm" onclick="showManualGcash()"><i class="fa fa-plus"></i> Add Manual</button>
  </div>
  <div class="gcash-list">
    ${logs.length === 0 ? '<div class="empty-state"><i class="fa fa-mobile-screen"></i>No GCash payments for this date</div>' :
      logs.map(g => `
      <div class="gcash-card">
        <div class="gcash-icon"><i class="fa fa-mobile-screen"></i></div>
        <div class="gcash-info">
          <div class="gcash-ref">Ref: ${g.ref}</div>
          <div class="gcash-meta">${g.orderNo} · ${fmtTime(g.time)}</div>
        </div>
        <div>
          <div class="gcash-amount">${fmtPeso(g.amount)}</div>
          <span class="badge ${g.status==='confirmed'?'badge-confirmed':'badge-pending'}">${g.status}</span>
        </div>
        ${g.status==='pending'?`<button class="btn btn-success btn-sm" onclick="confirmGcash('${g.id}')"><i class="fa fa-check"></i> Confirm</button>`:''}
      </div>
      `).join('')
    }
  </div>
  `;
}
function shiftGcashDate(d) {
  const dt = new Date(state.gcashDate);
  dt.setDate(dt.getDate() + d);
  state.gcashDate = dt.toISOString().slice(0,10);
  document.getElementById('mainContent').innerHTML = renderGcash();
}
function confirmGcash(id) {
  const g = state.gcashLog.find(g => g.id === id);
  if (g) { g.status = 'confirmed'; save('gcashLog', state.gcashLog); document.getElementById('mainContent').innerHTML = renderGcash(); }
}
function showManualGcash() {
  showModal(`
    <button class="modal-close" onclick="closeModalDirect()">×</button>
    <div class="modal-title">Manual GCash Entry</div>
    <div class="form-group"><label>Reference #</label><input id="mgRef" type="text" placeholder="GCash reference number"></div>
    <div class="form-group"><label>Amount (₱)</label><input id="mgAmt" type="number" min="1" placeholder="0.00"></div>
    <div class="form-group"><label>Note</label><input id="mgNote" type="text" placeholder="Optional note"></div>
    <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="addManualGcash()"><i class="fa fa-save"></i> Save</button>
  `);
}
function addManualGcash() {
  const ref = document.getElementById('mgRef').value.trim();
  const amt = parseFloat(document.getElementById('mgAmt').value);
  if (!ref || isNaN(amt)) { toast('Fill all fields', 'error'); return; }
  state.gcashLog.push({ id: genId(), orderId: null, orderNo: 'MANUAL', ref, amount: amt, date: state.gcashDate, time: Date.now(), status: 'confirmed' });
  save('gcashLog', state.gcashLog);
  closeModalDirect();
  toast('GCash entry saved!', 'success');
  document.getElementById('mainContent').innerHTML = renderGcash();
}

// ============================================================
// TRANSACTIONS
// ============================================================
function renderTransactions() {
  const filtered = state.orders.filter(o => {
    const dm = !state.txDate || o.date === state.txDate;
    const tm = state.txType === 'all' || o.orderType === state.txType;
    return dm && tm;
  }).sort((a,b) => b.time - a.time);
  const total = filtered.reduce((s,o) => s+o.total, 0);

  return `
  <div class="tx-header-row">
    <input type="date" value="${state.txDate}" onchange="state.txDate=this.value;document.getElementById('mainContent').innerHTML=renderTransactions()">
    <select onchange="state.txType=this.value;document.getElementById('mainContent').innerHTML=renderTransactions()">
      <option value="all" ${state.txType==='all'?'selected':''}>All Types</option>
      <option value="dine-in" ${state.txType==='dine-in'?'selected':''}>Dine-in</option>
      <option value="pickup" ${state.txType==='pickup'?'selected':''}>Pickup</option>
      <option value="delivery" ${state.txType==='delivery'?'selected':''}>Delivery</option>
    </select>
    <div style="margin-left:auto;font-size:14px;font-weight:700;color:var(--red)">${fmtPeso(total)} (${filtered.length} orders)</div>
    <button class="btn btn-success btn-sm" onclick="exportExcel()"><i class="fa fa-file-excel"></i> Export Excel</button>
  </div>
  <div class="card">
    <div class="history-table-wrap">
    ${filtered.length === 0 ? '<div class="empty-state"><i class="fa fa-receipt"></i>No transactions found</div>' : `
    <table>
      <thead><tr><th>Order #</th><th>Date</th><th>Items</th><th>Type</th><th>Payment</th><th>Cashier</th><th>Total</th><th>Status</th></tr></thead>
      <tbody>
      ${filtered.map(o=>`
        <tr>
          <td><strong>${o.orderNo}</strong></td>
          <td>${fmtDate(o.date)}</td>
          <td style="max-width:160px;white-space:normal">${o.items.map(i=>`${i.qty}x ${i.name}`).join(', ')}</td>
          <td><span class="badge badge-${o.orderType==='dine-in'?'dinein':o.orderType}">${o.orderType}</span></td>
          <td>${o.paymentMethod}${o.gcashRef?` (${o.gcashRef})`:''}</td>
          <td>${o.cashierName||'-'}</td>
          <td><strong>${fmtPeso(o.total)}</strong></td>
          <td><span class="badge ${o.status==='queued'?'badge-queued':'badge-served'}">${o.status}</span></td>
        </tr>
      `).join('')}
      </tbody>
    </table>`}
    </div>
  </div>
  `;
}
function exportExcel() {
  const filtered = state.orders.filter(o => {
    const dm = !state.txDate || o.date === state.txDate;
    const tm = state.txType === 'all' || o.orderType === state.txType;
    return dm && tm;
  });
  const data = [['Order #','Date','Items','Type','Payment','GCash Ref','Rider','Cashier','Total','Status']];
  filtered.forEach(o => data.push([
    o.orderNo, o.date, o.items.map(i=>`${i.qty}x ${i.name}`).join(', '),
    o.orderType, o.paymentMethod, o.gcashRef||'', o.riderName||'', o.cashierName||'',
    o.total, o.status
  ]));
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
  XLSX.writeFile(wb, `YansFoodhouz_Transactions_${state.txDate||'All'}.xlsx`);
}

// ============================================================
// SETTINGS
// ============================================================
function renderSettings() {
  return `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:800px">
    <div class="card">
      <div class="card-header"><div class="card-title"><i class="fa fa-motorcycle"></i> Delivery Riders</div><button class="btn btn-primary btn-sm" onclick="showAddRider()"><i class="fa fa-plus"></i> Add</button></div>
      ${state.riders.map(r=>`
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--gray-100)">
          <div style="flex:1"><div style="font-size:13px;font-weight:600">${r.name}</div><div style="font-size:11px;color:var(--gray-500)">${r.phone}</div></div>
          <button class="btn btn-danger btn-sm" onclick="removeRider('${r.id}')"><i class="fa fa-trash"></i></button>
        </div>
      `).join('')}
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title"><i class="fa fa-utensils"></i> Menu Items</div><button class="btn btn-primary btn-sm" onclick="showAddMenu()"><i class="fa fa-plus"></i> Add</button></div>
      <div style="max-height:300px;overflow-y:auto">
      ${state.menu.map(m=>`
        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--gray-100);font-size:12px">
          <span>${m.icon}</span>
          <div style="flex:1"><strong>${m.name}</strong> <span style="color:var(--gray-500)">${m.category}</span></div>
          <span style="font-weight:700;color:var(--red)">${fmtPeso(m.price)}</span>
          <button class="btn btn-danger btn-sm" onclick="removeMenu(${m.id})"><i class="fa fa-trash"></i></button>
        </div>
      `).join('')}
      </div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title"><i class="fa fa-database"></i> Data Management</div></div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="btn btn-outline" onclick="if(confirm('Reset all orders?')){state.orders=[];save('orders',state.orders);toast('Orders cleared')}"><i class="fa fa-trash"></i> Clear All Orders</button>
        <button class="btn btn-outline" onclick="if(confirm('Reset stock?')){state.stock={};save('stock',state.stock);toast('Stock reset')}"><i class="fa fa-rotate"></i> Reset Stock</button>
      </div>
    </div>
  </div>
  `;
}
function showAddRider() {
  showModal(`
    <button class="modal-close" onclick="closeModalDirect()">×</button>
    <div class="modal-title">Add Rider</div>
    <div class="form-group"><label>Name</label><input id="rName" type="text" placeholder="Full name"></div>
    <div class="form-group"><label>Phone</label><input id="rPhone" type="tel" placeholder="09XXXXXXXXX"></div>
    <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="addRider()"><i class="fa fa-plus"></i> Add Rider</button>
  `);
}
function addRider() {
  const name = document.getElementById('rName').value.trim();
  const phone = document.getElementById('rPhone').value.trim();
  if (!name || !phone) { toast('Fill all fields', 'error'); return; }
  state.riders.push({ id: genId(), name, phone });
  save('riders', state.riders);
  closeModalDirect();
  toast('Rider added!', 'success');
  document.getElementById('mainContent').innerHTML = renderSettings();
}
function removeRider(id) {
  if (!confirm('Remove rider?')) return;
  state.riders = state.riders.filter(r => r.id !== id);
  save('riders', state.riders);
  document.getElementById('mainContent').innerHTML = renderSettings();
}
function showAddMenu() {
  const cats = [...new Set(state.menu.map(m=>m.category))];
  showModal(`
    <button class="modal-close" onclick="closeModalDirect()">×</button>
    <div class="modal-title">Add Menu Item</div>
    <div class="form-group"><label>Name</label><input id="mName" type="text" placeholder="Dish name"></div>
    <div class="form-group"><label>Price (₱)</label><input id="mPrice" type="number" min="1" placeholder="0"></div>
    <div class="form-group"><label>Category</label><input id="mCat" type="text" placeholder="Ulam, Pulutan, etc" list="catList"><datalist id="catList">${cats.map(c=>`<option value="${c}">`).join('')}</datalist></div>
    <div class="form-group"><label>Icon (emoji)</label><input id="mIcon" type="text" placeholder="🍲" maxlength="2"></div>
    <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="addMenuItem()"><i class="fa fa-plus"></i> Add Item</button>
  `);
}
function addMenuItem() {
  const name = document.getElementById('mName').value.trim();
  const price = parseFloat(document.getElementById('mPrice').value);
  const cat = document.getElementById('mCat').value.trim();
  const icon = document.getElementById('mIcon').value || '🍽';
  if (!name || isNaN(price) || !cat) { toast('Fill all fields', 'error'); return; }
  const id = Math.max(...state.menu.map(m=>m.id), 0) + 1;
  state.menu.push({ id, name, price, category: cat, icon, recipe: {} });
  save('menu', state.menu);
  closeModalDirect();
  toast('Menu item added!', 'success');
  document.getElementById('mainContent').innerHTML = renderSettings();
}
function removeMenu(id) {
  if (!confirm('Remove menu item?')) return;
  state.menu = state.menu.filter(m => m.id !== id);
  save('menu', state.menu);
  document.getElementById('mainContent').innerHTML = renderSettings();
}

// ============================================================
// RIDER VIEWS
// ============================================================
function renderRiderQueue() {
  const myDeliveries = state.orders.filter(o =>
    o.orderType === 'delivery' &&
    (o.deliveryRider === '' || state.riders.find(r=>r.name===state.user?.name)?.id === o.deliveryRider || o.riderName === state.user?.name)
  ).sort((a,b)=>b.time-a.time);
  const pending = myDeliveries.filter(o => o.riderStatus === 'pending' || !o.riderStatus);
  const accepted = myDeliveries.filter(o => o.riderStatus === 'accepted');
  const onway = myDeliveries.filter(o => o.riderStatus === 'on-way');

  return `
  <div style="margin-bottom:12px"><strong style="font-size:14px">Delivery Queue</strong> <span style="font-size:12px;color:var(--gray-500)">Accept orders assigned to you</span></div>
  ${pending.length > 0 ? '<div class="section-label">Pending — Needs Acceptance</div>' : ''}
  ${pending.map(o => `
    <div class="rider-queue-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <strong>${o.orderNo}</strong>
        <span class="badge badge-queued">Pending</span>
      </div>
      <div style="font-size:12px;margin-bottom:4px">${o.items.map(i=>`${i.qty}x ${i.name}`).join(', ')}</div>
      <div style="font-size:12px;color:var(--gray-600);margin-bottom:8px"><i class="fa fa-location-dot"></i> ${o.deliveryAddress||'No address'}</div>
      <div style="font-weight:700;color:var(--red);margin-bottom:8px">${fmtPeso(o.total)}</div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-success btn-sm" onclick="acceptOrder('${o.id}')"><i class="fa fa-check"></i> Accept</button>
        <button class="btn btn-outline btn-sm" onclick="showReceipt('${o.id}')"><i class="fa fa-receipt"></i></button>
      </div>
    </div>
  `).join('')}
  ${accepted.length > 0 ? '<div class="section-label" style="margin-top:12px">Accepted — Ready to Pick Up</div>' : ''}
  ${accepted.map(o => `
    <div class="rider-queue-card accepted">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <strong>${o.orderNo}</strong>
        <span class="badge badge-delivery">Accepted</span>
      </div>
      <div style="font-size:12px;margin-bottom:4px">${o.items.map(i=>`${i.qty}x ${i.name}`).join(', ')}</div>
      <div style="font-size:12px;color:var(--gray-600);margin-bottom:8px"><i class="fa fa-location-dot"></i> ${o.deliveryAddress||'No address'}</div>
      <button class="btn btn-warning btn-sm" onclick="setRiderStatus('${o.id}','on-way')"><i class="fa fa-motorcycle"></i> On the Way</button>
    </div>
  `).join('')}
  ${onway.length > 0 ? '<div class="section-label" style="margin-top:12px">On the Way</div>' : ''}
  ${onway.map(o => `
    <div class="rider-queue-card on-way">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <strong>${o.orderNo}</strong>
        <span class="badge" style="background:#fff3cd;color:#856404"><i class="fa fa-motorcycle"></i> On the Way</span>
      </div>
      <div style="font-size:12px;color:var(--gray-600);margin-bottom:8px"><i class="fa fa-location-dot"></i> ${o.deliveryAddress||'No address'}</div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-success btn-sm" onclick="setRiderStatus('${o.id}','delivered');markServed('${o.id}')"><i class="fa fa-check-double"></i> Delivered</button>
        <button class="btn btn-blue btn-sm" onclick="navigate('rider-proof')"><i class="fa fa-camera"></i> Add Proof</button>
      </div>
    </div>
  `).join('')}
  ${pending.length+accepted.length+onway.length===0?'<div class="empty-state"><i class="fa fa-motorcycle"></i>No delivery orders assigned to you</div>':''}
  `;
}
function acceptOrder(id) {
  const o = state.orders.find(o => o.id === id);
  if (o) { o.riderStatus = 'accepted'; save('orders', state.orders); renderPage(); }
}
function setRiderStatus(id, status) {
  const o = state.orders.find(o => o.id === id);
  if (o) { o.riderStatus = status; save('orders', state.orders); renderPage(); }
}

function renderRiderProof() {
  const onway = state.orders.filter(o => o.riderStatus === 'on-way' || o.riderStatus === 'delivered');
  return `
  <div class="proof-section">
    <div class="card-title" style="margin-bottom:12px"><i class="fa fa-camera"></i> Proof of Delivery</div>
    <div class="form-group">
      <label>Select Order</label>
      <select id="proofOrder" style="width:100%">
        <option value="">-- Select Order --</option>
        ${onway.map(o=>`<option value="${o.id}">${o.orderNo} — ${o.deliveryAddress||'No address'}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Notes</label>
      <input id="proofNote" type="text" placeholder="e.g. Left at gate, customer received">
    </div>
    <div class="section-label">Photos</div>
    <div class="photo-grid">
      ${[0,1,2].map(i=>`
        <div class="photo-thumb" onclick="addPhoto(${i})" id="photoThumb${i}">
          <i class="fa fa-camera"></i>
        </div>
        <input type="file" accept="image/*" capture="environment" id="photoFile${i}" style="display:none" onchange="handlePhoto(${i})">
      `).join('')}
    </div>
    <button class="btn btn-primary" style="width:100%;margin-top:16px;justify-content:center" onclick="submitProof()"><i class="fa fa-paper-plane"></i> Submit Proof</button>
  </div>
  <div style="margin-top:16px">
    <div class="section-label">Submitted Proofs</div>
    ${state.riderProofs.map(p=>`
      <div class="card" style="margin-bottom:8px">
        <div style="font-size:13px;font-weight:700">${p.orderNo}</div>
        <div style="font-size:11px;color:var(--gray-500)">${fmtTime(p.time)} · ${p.note}</div>
        <div style="font-size:11px;color:var(--green);margin-top:4px"><i class="fa fa-image"></i> ${p.photos} photo(s) attached</div>
      </div>
    `).join('')}
  </div>
  `;
}
const _proofPhotos = [];
function addPhoto(i) { document.getElementById('photoFile'+i).click(); }
function handlePhoto(i) {
  const file = document.getElementById('photoFile'+i).files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    _proofPhotos[i] = e.target.result;
    const thumb = document.getElementById('photoThumb'+i);
    thumb.innerHTML = `<img src="${e.target.result}" alt="proof">`;
  };
  reader.readAsDataURL(file);
}
function submitProof() {
  const orderId = document.getElementById('proofOrder').value;
  const note = document.getElementById('proofNote').value;
  if (!orderId) { toast('Select an order', 'error'); return; }
  const o = state.orders.find(o=>o.id===orderId);
  const photos = _proofPhotos.filter(Boolean).length;
  state.riderProofs.push({ id: genId(), orderId, orderNo: o?.orderNo||'', note, photos, time: Date.now(), riderName: state.user?.name });
  save('riderProofs', state.riderProofs);
  toast('Proof submitted!', 'success');
  renderPage();
}

function renderRiderHistory() {
  const myName = state.user?.name;
  const proofs = state.riderProofs.filter(p => !myName || p.riderName === myName).sort((a,b)=>b.time-a.time);
  return `
  <div class="section-label">My Delivery History</div>
  ${proofs.length === 0 ? '<div class="empty-state"><i class="fa fa-clock-rotate-left"></i>No deliveries yet</div>' :
    proofs.map(p => {
      const o = state.orders.find(o=>o.id===p.orderId);
      return `
      <div class="card" style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <strong>${p.orderNo}</strong>
          <span class="badge badge-served"><i class="fa fa-check"></i> Delivered</span>
        </div>
        ${o?`<div style="font-size:12px;color:var(--gray-600);margin-bottom:4px">${o.items.map(i=>`${i.qty}x ${i.name}`).join(', ')}</div>
        <div style="font-size:12px;color:var(--gray-500)"><i class="fa fa-location-dot"></i> ${o.deliveryAddress||'No address'}</div>
        <div style="font-size:12px;font-weight:700;color:var(--red)">${fmtPeso(o.total)}</div>`:''}
        <div style="font-size:11px;color:var(--gray-500);margin-top:6px">${fmtTime(p.time)} · ${p.note||'No note'} · ${p.photos} photo(s)</div>
      </div>
      `;
    }).join('')
  }
  `;
}

// ── SERVICE WORKER REGISTRATION ──────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').catch(() => {});
}
