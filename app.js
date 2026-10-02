/**
 * Tap Receipt - Complete Frontend Application Logic
 * Framework-free Vanilla JavaScript
 */

const API_HOST = window.location.hostname || 'localhost';
const API_PORT = window.location.port;
const STORAGE_KEY = 'tapreceipt_active_shop';
const API_STORAGE_KEY = 'tapreceipt_api_base';

function resolveApiBase() {
  const custom = localStorage.getItem(API_STORAGE_KEY);
  if (custom) return custom.replace(/\/+$/, '');

  // If on GitHub Pages, use stored or default to localhost:8000
  if (window.location.hostname.endsWith('github.io')) {
    return localStorage.getItem(API_STORAGE_KEY) || '';
  }

  if (window.location.protocol.startsWith('http') && window.location.origin && !window.location.port) {
    // Public tunnels/domains (localtunnel, ngrok, cloudflare without explicit port)
    return `${window.location.origin}/api`;
  } else if (API_PORT) {
    // Local network or local server with explicit port (localhost:8000, 10.112.40.134:8000)
    return `${window.location.protocol}//${API_HOST}:${API_PORT}/api`;
  } else {
    // Fallback / file:// protocol
    return `http://${API_HOST}:8000/api`;
  }
}

let API_BASE = resolveApiBase();

// GitHub Pages / Custom Backend Helper UI
function initBackendConfigUI() {
  const isGithubPages = window.location.hostname.endsWith('github.io');
  if (!isGithubPages && !localStorage.getItem(API_STORAGE_KEY)) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'btn-backend-settings';
  btn.innerHTML = `🔌 <span>${API_BASE ? 'Backend Connected' : 'Connect Backend'}</span>`;
  btn.style.cssText = `
    position: fixed;
    bottom: 12px;
    right: 12px;
    z-index: 9999;
    background: ${API_BASE ? '#10b981' : '#f59e0b'};
    color: #fff;
    border: none;
    border-radius: 9999px;
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    gap: 6px;
    transition: transform 0.2s;
  `;
  btn.title = `Current API: ${API_BASE || 'Not configured'} (Click to change)`;
  btn.onclick = () => {
    const input = prompt(
      "Enter your Backend API URL (e.g., https://my-backend.onrender.com/api or https://xxxx.trycloudflare.com/api):",
      API_BASE || "http://localhost:8000/api"
    );
    if (input !== null) {
      const clean = input.trim().replace(/\/+$/, '');
      if (clean) {
        localStorage.setItem(API_STORAGE_KEY, clean);
      } else {
        localStorage.removeItem(API_STORAGE_KEY);
      }
      window.location.reload();
    }
  };
  document.body.appendChild(btn);

  if (isGithubPages && !API_BASE) {
    const banner = document.createElement('div');
    banner.style.cssText = `
      background: #f59e0b;
      color: #000;
      text-align: center;
      padding: 8px 12px;
      font-size: 13px;
      font-weight: 700;
      position: sticky;
      top: 0;
      z-index: 10000;
      cursor: pointer;
    `;
    banner.innerHTML = `⚠️ Hosted on GitHub Pages: Click here to connect your live Backend Server API URL!`;
    banner.onclick = () => btn.click();
    document.body.prepend(banner);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBackendConfigUI);
} else {
  initBackendConfigUI();
}


// ==========================================
// Authentication & Session Helpers
// ==========================================
function getCurrentShop() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse shop session', e);
    }
  }
  return null;
}

function setCurrentShop(shop) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(shop));
}

function logout() {
  localStorage.removeItem(STORAGE_KEY);
  showToast('Logged out successfully', 'info');
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 400);
}

function requireAuth() {
  const shop = getCurrentShop();
  if (!shop) {
    // If not authenticated, redirect to login
    window.location.href = 'login.html';
    return null;
  }
  return shop;
}

function updateNavShopInfo() {
  const shop = getCurrentShop();
  const shopNameEl = document.getElementById('nav-shop-name');
  if (shopNameEl) {
    if (shop && shop.shop_name) {
      shopNameEl.textContent = shop.shop_name;
    } else {
      shopNameEl.textContent = 'Tap Receipt POS';
    }
  }
}

// ==========================================
// URL, Messaging & QR Code Helpers
// ==========================================
function getReceiptViewUrl(receiptId) {
  try {
    return new URL(`receipt.html?view=${receiptId}`, window.location.href).href;
  } catch (e) {
    return `${window.location.origin}/receipt.html?view=${receiptId}`;
  }
}

function getWhatsAppUrl(phone, text) {
  let clean = (phone || '').toString().replace(/\D/g, '');
  if (clean.length === 10) {
    clean = '91' + clean;
  }
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}

function renderQRCode(container, url, size = 140) {
  if (!container) return;
  container.innerHTML = '';
  if (typeof QRCode !== 'undefined') {
    try {
      new QRCode(container, {
        text: url,
        width: size,
        height: size,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
      return;
    } catch (e) {
      console.warn('QRCode library error, using fallback:', e);
    }
  }
  // Online / offline SVG fallback
  const img = document.createElement('img');
  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;
  img.alt = 'Receipt QR Code';
  img.style.width = `${size}px`;
  img.style.height = `${size}px`;
  img.style.display = 'block';
  img.style.margin = '0 auto';
  img.onerror = () => {
    container.innerHTML = `<div style="padding: 10px; font-size: 0.8rem; text-align: center;"><a href="${url}" target="_blank" style="color: var(--primary); text-decoration: underline;">Open Digital Receipt</a></div>`;
  };
  container.appendChild(img);
}

// ==========================================
// Toast Notification Utility
// ==========================================
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// ==========================================
// Global Page Initializer
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  updateNavShopInfo();

  // Attach logout handler if button exists
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }

  // Detect current page
  const page = document.body.dataset.page;
  switch (page) {
    case 'login':
      initLoginPage();
      break;
    case 'dashboard':
      initDashboardPage();
      break;
    case 'products':
      initProductsPage();
      break;
    case 'reports':
      initReportsPage();
      break;
    case 'receipt':
      initReceiptPage();
      break;
    case 'history':
      initHistoryPage();
      break;
  }
});

// ==========================================
// 1. Authentication Page (login.html)
// ==========================================
function initLoginPage() {
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  const btnDemoLogin = document.getElementById('btn-demo-login');

  if (tabLogin && tabRegister) {
    tabLogin.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      formLogin.style.display = 'block';
      formRegister.style.display = 'none';
    });

    tabRegister.addEventListener('click', () => {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      formLogin.style.display = 'none';
      formRegister.style.display = 'block';
    });
  }

  // Demo auto-login button
  if (btnDemoLogin) {
    btnDemoLogin.addEventListener('click', async () => {
      document.getElementById('login-username').value = 'demo';
      document.getElementById('login-password').value = 'demo123';
      formLogin.dispatchEvent(new Event('submit'));
    });
  }

  // Handle Login submission
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;

      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || 'Login failed. Check credentials.');
        }

        const shop = await res.json();
        setCurrentShop(shop);
        showToast(`Welcome back, ${shop.shop_name}!`, 'success');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 600);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Handle Register submission
  if (formRegister) {
    formRegister.addEventListener('submit', async (e) => {
      e.preventDefault();
      const shop_name = document.getElementById('reg-shop-name').value.trim();
      const username = document.getElementById('reg-username').value.trim();
      const password = document.getElementById('reg-password').value;
      const phone = document.getElementById('reg-phone').value.trim();
      const address = document.getElementById('reg-address').value.trim();
      const upi_id = document.getElementById('reg-upi').value.trim();
      const gst_number = document.getElementById('reg-gst').value.trim();

      try {
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            password,
            shop_name,
            phone,
            address,
            upi_id,
            gst_number
          })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || 'Registration failed.');
        }

        const shop = await res.json();
        setCurrentShop(shop);
        showToast('Shop account created successfully!', 'success');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 600);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
}

// ==========================================
// 2. Dashboard Page (dashboard.html)
// ==========================================
async function initDashboardPage() {
  const shop = requireAuth();
  if (!shop) return;

  const shopHeaderName = document.getElementById('dash-shop-name');
  if (shopHeaderName) {
    shopHeaderName.textContent = shop.shop_name;
  }

  try {
    // Fetch summary reports
    const res = await fetch(`${API_BASE}/reports/summary`);
    if (res.ok) {
      const data = await res.json();
      const elTodaySales = document.getElementById('stat-today-sales');
      if (elTodaySales) elTodaySales.textContent = `₹${data.today_sales.toLocaleString('en-IN')}`;
      const elTodayReceipts = document.getElementById('stat-today-receipts');
      if (elTodayReceipts) elTodayReceipts.textContent = data.today_receipts;
      const elMonthSales = document.getElementById('stat-month-sales');
      if (elMonthSales) elMonthSales.textContent = `₹${data.monthly_sales.toLocaleString('en-IN')}`;
      const elAvgBill = document.getElementById('stat-avg-bill');
      if (elAvgBill) elAvgBill.textContent = `₹${data.average_order_value.toLocaleString('en-IN')}`;
    }

    // Fetch product count
    const prodRes = await fetch(`${API_BASE}/products/`);
    if (prodRes.ok) {
      const products = await prodRes.json();
      const countEl = document.getElementById('stat-product-count');
      if (countEl) countEl.textContent = products.length;
    }

    // Fetch recent 5 receipts
    const recRes = await fetch(`${API_BASE}/receipts/?limit=5`);
    if (recRes.ok) {
      const receipts = await recRes.json();
      renderDashboardRecentReceipts(receipts);
    }
  } catch (err) {
    console.error('Error loading dashboard stats:', err);
  }
}

function renderDashboardRecentReceipts(receipts) {
  const tbody = document.getElementById('recent-receipts-tbody');
  if (!tbody) return;

  if (receipts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-dim); padding: 1.5rem;">No receipts generated yet. Click "Create Receipt" to get started!</td></tr>`;
    return;
  }

  tbody.innerHTML = receipts.map(r => `
    <tr>
      <td><strong>${r.receipt_number}</strong></td>
      <td>${new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
      <td>${r.customer_phone}</td>
      <td><span class="badge ${r.payment_mode === 'UPI' ? 'badge-info' : r.payment_mode === 'Card' ? 'badge-purple' : 'badge-success'}">${r.payment_mode}</span></td>
      <td><strong>₹${r.total_amount.toFixed(2)}</strong></td>
    </tr>
  `).join('');
}

// ==========================================
// 3. Products Management (products.html)
// ==========================================
let allProducts = [];

async function initProductsPage() {
  requireAuth();
  await loadProducts();

  // Search input filter
  const searchInput = document.getElementById('product-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase().trim();
      const filtered = allProducts.filter(p => 
        p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term)
      );
      renderProductsTable(filtered);
    });
  }

  // Category filter buttons
  const catButtons = document.querySelectorAll('.category-filter-btn');
  catButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      catButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.category;
      if (!cat || cat === 'all') {
        renderProductsTable(allProducts);
      } else {
        const filtered = allProducts.filter(p => p.category.toLowerCase() === cat.toLowerCase());
        renderProductsTable(filtered);
      }
    });
  });

  // Modal open/close handlers
  const btnAdd = document.getElementById('btn-open-add-product');
  const modal = document.getElementById('product-modal');
  const btnClose = document.getElementById('modal-product-close');
  const form = document.getElementById('product-form');

  if (btnAdd && modal) {
    btnAdd.addEventListener('click', () => {
      document.getElementById('modal-product-title').textContent = 'Add New Product';
      document.getElementById('product-id').value = '';
      form.reset();
      modal.classList.add('active');
    });
  }

  if (btnClose && modal) {
    btnClose.addEventListener('click', () => modal.classList.remove('active'));
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('product-id').value;
      const name = document.getElementById('product-name').value.trim();
      const price = parseFloat(document.getElementById('product-price').value);
      const category = document.getElementById('product-category').value.trim() || 'General';
      const stock = parseInt(document.getElementById('product-stock').value, 10) || 0;

      const shop = getCurrentShop();
      const payload = {
        name,
        price,
        category,
        stock,
        shopkeeper_id: shop ? shop.id : null
      };

      try {
        let res;
        if (id) {
          // Update
          res = await fetch(`${API_BASE}/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } else {
          // Create
          res = await fetch(`${API_BASE}/products/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }

        if (!res.ok) throw new Error('Failed to save product');

        showToast(id ? 'Product updated successfully' : 'Product added successfully', 'success');
        modal.classList.remove('active');
        await loadProducts();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
}

async function loadProducts() {
  try {
    const res = await fetch(`${API_BASE}/products/`);
    if (res.ok) {
      allProducts = await res.json();
      renderProductsTable(allProducts);
    }
  } catch (err) {
    console.error('Error fetching products:', err);
    showToast('Failed to load products', 'error');
  }
}

function renderProductsTable(products) {
  const tbody = document.getElementById('products-tbody');
  if (!tbody) return;

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 2rem;">No products found. Click "Add Product" to add one.</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map((p, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td><strong>${p.name}</strong></td>
      <td><span class="badge badge-info">${p.category}</span></td>
      <td><strong>₹${p.price.toFixed(2)}</strong></td>
      <td>
        <span class="badge ${p.stock < 10 ? 'badge-danger' : 'badge-success'}">
          ${p.stock} units ${p.stock < 10 ? '(Low)' : ''}
        </span>
      </td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="editProduct(${p.id})">✏️ Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id}, '${p.name.replace(/'/g, "\\'")}')">🗑️</button>
      </td>
    </tr>
  `).join('');
}

window.editProduct = function(id) {
  const product = allProducts.find(p => p.id === id);
  if (!product) return;

  document.getElementById('modal-product-title').textContent = 'Edit Product';
  document.getElementById('product-id').value = product.id;
  document.getElementById('product-name').value = product.name;
  document.getElementById('product-price').value = product.price;
  document.getElementById('product-category').value = product.category;
  document.getElementById('product-stock').value = product.stock;

  document.getElementById('product-modal').classList.add('active');
};

window.deleteProduct = async function(id, name) {
  if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

  try {
    const res = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete product');
    showToast(`Deleted ${name}`, 'success');
    await loadProducts();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// ==========================================
// 4. Sales Report Module (reports.html)
// ==========================================
async function initReportsPage() {
  requireAuth();

  try {
    const res = await fetch(`${API_BASE}/reports/summary`);
    if (!res.ok) throw new Error('Could not fetch sales report summary');

    const data = await res.json();

    // Summary Metric Cards
    document.getElementById('report-total-sales').textContent = `₹${data.total_sales.toLocaleString('en-IN')}`;
    document.getElementById('report-total-receipts').textContent = data.total_receipts;
    document.getElementById('report-today-sales').textContent = `₹${data.today_sales.toLocaleString('en-IN')}`;
    document.getElementById('report-month-sales').textContent = `₹${data.monthly_sales.toLocaleString('en-IN')}`;
    document.getElementById('report-avg-order').textContent = `₹${data.average_order_value.toFixed(2)}`;

    // Payment Mode Breakdown
    const paymentContainer = document.getElementById('payment-breakdown-bars');
    if (paymentContainer && data.payment_breakdown) {
      const total = data.total_sales || 1;
      const modes = Object.entries(data.payment_breakdown);
      paymentContainer.innerHTML = modes.map(([mode, amt]) => {
        const pct = Math.round((amt / total) * 100);
        return `
          <div style="margin-bottom: 0.85rem;">
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.25rem;">
              <span><strong>${mode}</strong></span>
              <span>₹${amt.toLocaleString('en-IN')} (${pct}%)</span>
            </div>
            <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden;">
              <div style="width: ${pct}%; height: 100%; background: ${mode === 'UPI' ? 'var(--cyan)' : mode === 'Card' ? 'var(--accent)' : 'var(--primary)'}; border-radius: 4px;"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    // 7-Day Trend Visual Chart
    const trendContainer = document.getElementById('trend-bars-container');
    if (trendContainer && data.recent_trends) {
      const maxAmt = Math.max(...data.recent_trends.map(t => t.total_amount), 100);
      trendContainer.innerHTML = data.recent_trends.map(t => {
        const heightPct = Math.max(12, Math.round((t.total_amount / maxAmt) * 100));
        return `
          <div style="display: flex; flex-direction: column; align-items: center; gap: 0.4rem; flex: 1;">
            <span style="font-size: 0.72rem; color: var(--text-muted);">₹${t.total_amount}</span>
            <div style="width: 28px; height: 120px; display: flex; align-items: flex-end; background: rgba(255,255,255,0.04); border-radius: 6px; padding: 2px;">
              <div style="width: 100%; height: ${heightPct}%; background: linear-gradient(180deg, #10b981, #06b6d4); border-radius: 4px;" title="${t.date}: ₹${t.total_amount} (${t.receipts_count} bills)"></div>
            </div>
            <span style="font-size: 0.75rem; color: var(--text-dim);">${t.date}</span>
          </div>
        `;
      }).join('');
    }

    // Top Selling Items Table
    const topTbody = document.getElementById('top-items-tbody');
    if (topTbody && data.top_selling_items) {
      if (data.top_selling_items.length === 0) {
        topTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-dim); padding: 1.5rem;">No sales data recorded yet.</td></tr>`;
      } else {
        topTbody.innerHTML = data.top_selling_items.map((item, idx) => `
          <tr>
            <td><strong>#${idx + 1}</strong></td>
            <td><strong>${item.item_name}</strong></td>
            <td><span class="badge badge-purple">${item.total_quantity} sold</span></td>
            <td><strong>₹${item.total_revenue.toFixed(2)}</strong></td>
          </tr>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Error fetching report:', err);
    showToast(err.message, 'error');
  }
}

// ==========================================
// 5. Billing & Receipt Generation (receipt.html)
// ==========================================
let currentBillItems = [];
let catalogProducts = [];
let selectedPaymentMode = 'Cash';

async function initReceiptPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const viewId = urlParams.get('view');

  // Customer Digital Receipt Mode (?view=123)
  if (viewId) {
    await renderCustomerDigitalReceipt(viewId);
    return;
  }

  // POS Terminal Mode (Requires Auth)
  const shop = requireAuth();
  if (!shop) return;

  // Load catalog into quick selector
  await loadCatalogForBilling();

  // Handle Quick Add from dropdown
  const btnQuickAdd = document.getElementById('btn-quick-add');
  const productSelect = document.getElementById('quick-product-select');
  if (btnQuickAdd && productSelect) {
    btnQuickAdd.addEventListener('click', () => {
      const prodId = parseInt(productSelect.value, 10);
      if (!prodId) return;
      const product = catalogProducts.find(p => p.id === prodId);
      if (!product) return;

      addItemToBill({
        product_id: product.id,
        item_name: product.name,
        price: product.price,
        quantity: 1
      });
    });
  }

  // Handle Custom Item Row Addition
  const btnAddCustom = document.getElementById('btn-add-custom-row');
  if (btnAddCustom) {
    btnAddCustom.addEventListener('click', () => {
      addItemToBill({
        product_id: null,
        item_name: 'Custom Item',
        price: 10.0,
        quantity: 1
      });
    });
  }

  // Payment Mode buttons
  const payButtons = document.querySelectorAll('.payment-btn');
  payButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      payButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedPaymentMode = btn.dataset.mode;
    });
  });

  // Tax and Discount change listeners
  const taxSelect = document.getElementById('bill-tax-rate');
  const discountInput = document.getElementById('bill-discount');
  if (taxSelect) taxSelect.addEventListener('change', calculateTotals);
  if (discountInput) discountInput.addEventListener('input', calculateTotals);

  // Reset Button
  const btnReset = document.getElementById('btn-reset-bill');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (confirm('Clear current bill items?')) {
        currentBillItems = [];
        document.getElementById('customer-phone').value = '';
        document.getElementById('customer-name').value = '';
        renderBillItemsTable();
        calculateTotals();
      }
    });
  }

  // Proceed / Generate Receipt
  const btnProceed = document.getElementById('btn-proceed-bill');
  if (btnProceed) {
    btnProceed.addEventListener('click', handleProceedReceipt);
  }

  // Modal Close
  const modalClose = document.getElementById('receipt-modal-close');
  const modal = document.getElementById('receipt-success-modal');
  if (modalClose && modal) {
    modalClose.addEventListener('click', () => modal.classList.remove('active'));
  }

  // Start with 1 default item row
  if (catalogProducts.length > 0) {
    addItemToBill({
      product_id: catalogProducts[0].id,
      item_name: catalogProducts[0].name,
      price: catalogProducts[0].price,
      quantity: 1
    });
  } else {
    addItemToBill({
      product_id: null,
      item_name: 'Sample Item',
      price: 50.0,
      quantity: 1
    });
  }
}

async function loadCatalogForBilling() {
  try {
    const res = await fetch(`${API_BASE}/products/`);
    if (res.ok) {
      catalogProducts = await res.json();
      const select = document.getElementById('quick-product-select');
      if (select) {
        select.innerHTML = '<option value="">-- Select from Product Catalog --</option>' +
          catalogProducts.map(p => `
            <option value="${p.id}">${p.name} - ₹${p.price.toFixed(2)} (${p.category})</option>
          `).join('');
      }
    }
  } catch (err) {
    console.error('Error loading products for billing:', err);
  }
}

function addItemToBill(item) {
  // Check if item already exists in bill
  const existing = currentBillItems.find(i => 
    (item.product_id && i.product_id === item.product_id) || 
    (i.item_name.toLowerCase() === item.item_name.toLowerCase())
  );

  if (existing) {
    existing.quantity += item.quantity;
  } else {
    currentBillItems.push({
      product_id: item.product_id,
      item_name: item.item_name,
      price: item.price,
      quantity: item.quantity
    });
  }

  renderBillItemsTable();
  calculateTotals();
}

function renderBillItemsTable() {
  const tbody = document.getElementById('billing-items-tbody');
  if (!tbody) return;

  if (currentBillItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-dim); padding: 1.5rem;">No items in bill yet. Add from catalog or custom row.</td></tr>`;
    return;
  }

  tbody.innerHTML = currentBillItems.map((item, idx) => {
    const lineTotal = (item.quantity * item.price).toFixed(2);
    return `
      <tr>
        <td>
          <input 
            type="text" 
            class="form-input form-input-sm" 
            value="${item.item_name}" 
            onchange="updateBillItemName(${idx}, this.value)"
            style="padding: 0.35rem 0.6rem; font-size: 0.85rem;"
          />
        </td>
        <td>
          <div class="qty-control">
            <button type="button" class="qty-btn" onclick="changeQty(${idx}, -1)">-</button>
            <input 
              type="number" 
              class="qty-input" 
              value="${item.quantity}" 
              min="1" 
              onchange="setQty(${idx}, this.value)"
            />
            <button type="button" class="qty-btn" onclick="changeQty(${idx}, 1)">+</button>
          </div>
        </td>
        <td>
          <input 
            type="number" 
            class="form-input form-input-sm" 
            value="${item.price}" 
            step="0.5" 
            min="0"
            onchange="updateBillItemPrice(${idx}, this.value)"
            style="width: 90px; padding: 0.35rem 0.6rem; font-size: 0.85rem;"
          />
        </td>
        <td style="text-align: right; font-family: var(--font-mono); font-weight: 600;">
          ₹${lineTotal}
        </td>
        <td style="text-align: center;">
          <button type="button" class="btn btn-danger btn-sm" onclick="removeBillItem(${idx})" style="padding: 0.2rem 0.5rem;">✕</button>
        </td>
      </tr>
    `;
  }).join('');
}

window.changeQty = function(idx, delta) {
  if (currentBillItems[idx]) {
    currentBillItems[idx].quantity = Math.max(1, currentBillItems[idx].quantity + delta);
    renderBillItemsTable();
    calculateTotals();
  }
};

window.setQty = function(idx, val) {
  if (currentBillItems[idx]) {
    currentBillItems[idx].quantity = Math.max(1, parseInt(val, 10) || 1);
    renderBillItemsTable();
    calculateTotals();
  }
};

window.updateBillItemName = function(idx, val) {
  if (currentBillItems[idx]) {
    currentBillItems[idx].item_name = val.trim() || 'Item';
  }
};

window.updateBillItemPrice = function(idx, val) {
  if (currentBillItems[idx]) {
    currentBillItems[idx].price = Math.max(0, parseFloat(val) || 0);
    renderBillItemsTable();
    calculateTotals();
  }
};

window.removeBillItem = function(idx) {
  currentBillItems.splice(idx, 1);
  renderBillItemsTable();
  calculateTotals();
};

function calculateTotals() {
  const subtotal = currentBillItems.reduce((acc, i) => acc + (i.quantity * i.price), 0);
  const taxRate = parseFloat(document.getElementById('bill-tax-rate')?.value || 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const discount = Math.max(0, parseFloat(document.getElementById('bill-discount')?.value || 0));
  const grandTotal = Math.max(0, subtotal + taxAmount - discount);

  document.getElementById('summary-subtotal').textContent = `₹${subtotal.toFixed(2)}`;
  document.getElementById('summary-tax').textContent = `₹${taxAmount.toFixed(2)}`;
  document.getElementById('summary-discount').textContent = `-₹${discount.toFixed(2)}`;
  document.getElementById('summary-grand-total').textContent = `₹${grandTotal.toFixed(2)}`;

  return { subtotal, taxRate, taxAmount, discount, grandTotal };
}

async function handleProceedReceipt() {
  const phone = document.getElementById('customer-phone').value.trim();
  const name = document.getElementById('customer-name').value.trim() || 'Walk-in Customer';

  if (!phone || phone.length < 10) {
    showToast('Please enter a valid 10-digit customer mobile number', 'error');
    document.getElementById('customer-phone').focus();
    return;
  }

  if (currentBillItems.length === 0) {
    showToast('Please add at least one item to the bill', 'error');
    return;
  }

  const { taxRate, discount } = calculateTotals();
  const shop = getCurrentShop();

  const payload = {
    customer_phone: phone,
    customer_name: name,
    payment_mode: selectedPaymentMode,
    tax_rate: taxRate,
    discount: discount,
    shopkeeper_id: shop ? shop.id : null,
    items: currentBillItems.map(i => ({
      item_name: i.item_name,
      quantity: i.quantity,
      price: i.price,
      product_id: i.product_id || null
    }))
  };

  try {
    const res = await fetch(`${API_BASE}/receipts/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to create receipt');
    }

    const receipt = await res.json();
    showToast(`Receipt ${receipt.receipt_number} generated!`, 'success');

    // Show Success Modal with QR Code and WhatsApp action
    renderReceiptSuccessModal(receipt, shop);

    // Reset bill state
    currentBillItems = [];
    document.getElementById('customer-phone').value = '';
    document.getElementById('customer-name').value = '';
    renderBillItemsTable();
    calculateTotals();

  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderReceiptSuccessModal(receipt, shop) {
  const modal = document.getElementById('receipt-success-modal');
  if (!modal) return;

  // Digital receipt view URL
  const viewUrl = getReceiptViewUrl(receipt.id);

  // Build WhatsApp text
  const shopName = shop ? shop.shop_name : 'Tap Receipt Store';
  const itemSummary = receipt.items.map(i => `• ${i.item_name} x ${i.quantity} = ₹${i.total.toFixed(2)}`).join('\n');
  const waText = 
`🧾 *${shopName}*
*Receipt No:* ${receipt.receipt_number}
*Date:* ${new Date(receipt.created_at).toLocaleDateString()} ${new Date(receipt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
--------------------------------
${itemSummary}
--------------------------------
*Total Paid:* ₹${receipt.total_amount.toFixed(2)} (${receipt.payment_mode})
*Payment Status:* PAID ✅

🌐 *View Digital Receipt:*
${viewUrl}

Thank you for shopping with us! 🙏`;

  const waUrl = getWhatsAppUrl(receipt.customer_phone, waText);

  // Populate modal details
  document.getElementById('modal-receipt-num').textContent = receipt.receipt_number;
  document.getElementById('modal-customer-phone').textContent = receipt.customer_phone;
  document.getElementById('modal-grand-total').textContent = `₹${receipt.total_amount.toFixed(2)}`;

  // Set WhatsApp button link
  const btnWa = document.getElementById('btn-send-whatsapp');
  if (btnWa) {
    btnWa.href = waUrl;
  }

  // Set Digital Link
  const linkDigital = document.getElementById('link-view-digital');
  if (linkDigital) {
    linkDigital.href = viewUrl;
  }

  // Generate QR Code
  const qrContainer = document.getElementById('qrcode-container');
  if (qrContainer) {
    renderQRCode(qrContainer, viewUrl, 140);
  }

  // Render thermal slip preview inside modal
  const slipContainer = document.getElementById('modal-thermal-slip-preview');
  if (slipContainer) {
    slipContainer.innerHTML = generateThermalSlipHtml(receipt, shop, viewUrl);
  }

  modal.classList.add('active');
}

function generateThermalSlipHtml(receipt, shop, viewUrl) {
  const shopName = shop ? shop.shop_name : 'QuickMart Superstore';
  const shopAddress = shop ? shop.address : 'Galleria Market, Bengaluru';
  const shopPhone = shop ? shop.phone : '9876543210';
  const shopGst = shop ? shop.gst_number : '';
  const dateStr = new Date(receipt.created_at).toLocaleString();

  return `
    <div class="receipt-paper">
      <div class="shop-header">
        <div class="shop-name">${shopName}</div>
        <div class="shop-info">${shopAddress}</div>
        <div class="shop-info">Tel: ${shopPhone} ${shopGst ? '| GST: ' + shopGst : ''}</div>
      </div>

      <div class="divider-dashed"></div>

      <div class="meta-grid">
        <span>Receipt: <strong>${receipt.receipt_number}</strong></span>
        <span>${dateStr}</span>
      </div>
      <div class="meta-grid">
        <span>Cust: <strong>${receipt.customer_phone}</strong></span>
        <span>Mode: <strong>${receipt.payment_mode}</strong></span>
      </div>

      <div class="divider-dashed"></div>

      <table class="paper-table">
        <thead>
          <tr>
            <th style="width: 50%;">Item</th>
            <th style="width: 15%; text-align: center;">Qty</th>
            <th style="width: 15%; text-align: right;">Rate</th>
            <th style="width: 20%; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${receipt.items.map(i => `
            <tr>
              <td>${i.item_name}</td>
              <td style="text-align: center;">${i.quantity}</td>
              <td style="text-align: right;">${i.price.toFixed(2)}</td>
              <td style="text-align: right;">${i.total.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="divider-dashed"></div>

      <div class="calc-row">
        <span>Subtotal</span>
        <span>₹${receipt.subtotal.toFixed(2)}</span>
      </div>
      ${receipt.tax_amount > 0 ? `
        <div class="calc-row">
          <span>GST / Tax (${receipt.tax_rate}%)</span>
          <span>₹${receipt.tax_amount.toFixed(2)}</span>
        </div>
      ` : ''}
      ${receipt.discount > 0 ? `
        <div class="calc-row">
          <span>Discount</span>
          <span>-₹${receipt.discount.toFixed(2)}</span>
        </div>
      ` : ''}

      <div class="divider-double"></div>

      <div class="grand-total-row">
        <span>GRAND TOTAL</span>
        <span>₹${receipt.total_amount.toFixed(2)}</span>
      </div>

      <div class="divider-dashed"></div>

      <div class="qr-container">
        <div id="thermal-slip-qr"></div>
        <div class="qr-caption">Scan to Verify Digital Bill</div>
      </div>

      <div class="thankyou-msg">
        *** THANK YOU FOR YOUR VISIT ***<br>
        Save Paper, Save Planet 🌱
      </div>
    </div>
  `;
}

// Customer Digital Receipt View (?view=123)
async function renderCustomerDigitalReceipt(receiptId) {
  try {
    const res = await fetch(`${API_BASE}/receipts/${receiptId}`);
    if (!res.ok) throw new Error('Receipt not found');
    const receipt = await res.json();

    // Hide POS terminal UI, show customer receipt container
    const terminalEl = document.getElementById('pos-terminal-container');
    const customerEl = document.getElementById('customer-view-container');
    if (terminalEl) terminalEl.style.display = 'none';
    if (customerEl) {
      customerEl.style.display = 'block';
      const viewUrl = window.location.href;
      customerEl.innerHTML = `
        <div style="max-width: 440px; margin: 2rem auto;">
          <div style="text-align: center; margin-bottom: 1.5rem;">
            <span class="badge badge-success" style="font-size: 0.9rem; padding: 0.4rem 1rem;">
              Verified Digital Receipt ✅
            </span>
          </div>

          ${generateThermalSlipHtml(receipt, receipt.shopkeeper, viewUrl)}

          <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 1.5rem;" class="no-print">
            <button class="btn btn-primary" onclick="window.print()">
              <span>🖨️</span> Print / Save PDF
            </button>
            <a href="receipt.html" class="btn btn-secondary">
              <span>🧾</span> New Bill
            </a>
          </div>
        </div>
      `;

      // Render QR code inside thermal slip
      setTimeout(() => {
        const qrEl = document.getElementById('thermal-slip-qr');
        if (qrEl) {
          renderQRCode(qrEl, viewUrl, 100);
        }
      }, 100);
    }
  } catch (err) {
    showToast('Failed to load digital receipt: ' + err.message, 'error');
  }
}

// ==========================================
// 6. Receipt History (history.html)
// ==========================================
let allReceipts = [];

async function initHistoryPage() {
  requireAuth();
  await loadReceiptHistory();

  // Search input filter
  const searchInput = document.getElementById('history-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase().trim();
      const filtered = allReceipts.filter(r => 
        r.customer_phone.includes(term) || 
        r.receipt_number.toLowerCase().includes(term) ||
        r.customer_name.toLowerCase().includes(term)
      );
      renderHistoryTable(filtered);
    });
  }

  // Payment mode filter
  const payFilter = document.getElementById('history-filter-mode');
  if (payFilter) {
    payFilter.addEventListener('change', (e) => {
      const mode = e.target.value;
      if (!mode || mode === 'ALL') {
        renderHistoryTable(allReceipts);
      } else {
        const filtered = allReceipts.filter(r => r.payment_mode === mode);
        renderHistoryTable(filtered);
      }
    });
  }

  // Modal close handlers
  const modalClose = document.getElementById('history-modal-close');
  const modal = document.getElementById('history-modal');
  if (modalClose && modal) {
    modalClose.addEventListener('click', () => modal.classList.remove('active'));
  }
}

async function loadReceiptHistory() {
  try {
    const res = await fetch(`${API_BASE}/receipts/`);
    if (res.ok) {
      allReceipts = await res.json();
      renderHistoryTable(allReceipts);
    }
  } catch (err) {
    console.error('Error fetching receipts history:', err);
    showToast('Failed to load receipt history', 'error');
  }
}

function renderHistoryTable(receipts) {
  const tbody = document.getElementById('history-tbody');
  if (!tbody) return;

  if (receipts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 2rem;">No receipts match the filter criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = receipts.map(r => {
    const dateStr = new Date(r.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return `
      <tr>
        <td><strong>${r.receipt_number}</strong></td>
        <td>
          <div>${dateStr}</div>
          <div style="font-size: 0.75rem; color: var(--text-dim);">${timeStr}</div>
        </td>
        <td>
          <div><strong>${r.customer_phone}</strong></div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${r.customer_name || 'Walk-in'}</div>
        </td>
        <td><span class="badge badge-purple">${r.items ? r.items.length : 0} items</span></td>
        <td>
          <span class="badge ${r.payment_mode === 'UPI' ? 'badge-info' : r.payment_mode === 'Card' ? 'badge-purple' : 'badge-success'}">
            ${r.payment_mode}
          </span>
        </td>
        <td><strong style="color: var(--primary);">₹${r.total_amount.toFixed(2)}</strong></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="viewHistoryReceipt(${r.id})">👁️ View</button>
          <button class="btn btn-whatsapp btn-sm" onclick="resendWhatsApp(${r.id})">📲 WhatsApp</button>
          <button class="btn btn-danger btn-sm" onclick="deleteHistoryReceipt(${r.id}, '${r.receipt_number}')">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');
}

window.viewHistoryReceipt = async function(receiptId) {
  const receipt = allReceipts.find(r => r.id === receiptId);
  if (!receipt) return;

  const modal = document.getElementById('history-modal');
  const preview = document.getElementById('history-modal-preview');
  if (modal && preview) {
    const shop = getCurrentShop();
    const viewUrl = getReceiptViewUrl(receipt.id);
    preview.innerHTML = generateThermalSlipHtml(receipt, shop, viewUrl);

    setTimeout(() => {
      const qrEl = document.getElementById('thermal-slip-qr');
      if (qrEl) {
        renderQRCode(qrEl, viewUrl, 90);
      }
    }, 100);

    modal.classList.add('active');
  }
};

window.resendWhatsApp = function(receiptId) {
  const receipt = allReceipts.find(r => r.id === receiptId);
  if (!receipt) return;

  const shop = getCurrentShop();
  const shopName = shop ? shop.shop_name : 'Tap Receipt Store';
  const viewUrl = getReceiptViewUrl(receipt.id);
  const itemSummary = receipt.items.map(i => `• ${i.item_name} x ${i.quantity} = ₹${i.total.toFixed(2)}`).join('\n');

  const waText = 
`🧾 *${shopName}*
*Receipt No:* ${receipt.receipt_number}
*Date:* ${new Date(receipt.created_at).toLocaleDateString()}
--------------------------------
${itemSummary}
--------------------------------
*Total Paid:* ₹${receipt.total_amount.toFixed(2)} (${receipt.payment_mode})

🌐 *Digital Receipt Link:*
${viewUrl}

Thank you for shopping with us! 🙏`;

  const waUrl = getWhatsAppUrl(receipt.customer_phone, waText);
  window.open(waUrl, '_blank');
};

window.deleteHistoryReceipt = async function(receiptId, receiptNum) {
  if (!confirm(`Are you sure you want to delete receipt ${receiptNum}? This cannot be undone.`)) return;

  try {
    const res = await fetch(`${API_BASE}/receipts/${receiptId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete receipt');

    showToast(`Receipt ${receiptNum} deleted`, 'success');
    await loadReceiptHistory();
  } catch (err) {
    showToast(err.message, 'error');
  }
};
