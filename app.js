// --- DATA STATE ---
const STATE = {
    products: [
        // Demo Data
        { id: 1, name: "Nước Ngọt Coca", price: 10000, cost: 7000, stock: 45, unit: "Lon", category: "Đồ uống" },
        { id: 2, name: "Snack Khoai Tây", price: 6000, cost: 4500, stock: 20, unit: "Gói", category: "Đồ ăn" },
        { id: 3, name: "Bánh Mì Ngọt", price: 12000, cost: 8000, stock: 10, unit: "Cái", category: "Đồ ăn" },
        { id: 4, name: "Nước Suối", price: 5000, cost: 3000, stock: 100, unit: "Chai", category: "Đồ uống" },
    ],
    cart: [],
    transactions: [],
    categories: ["Tất cả", "Đồ ăn", "Đồ uống", "Khác"],
    selectedCategory: "Tất cả",
    isAdmin: false,
    adminPin: "1234" // Default PIN
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    loadDataLocal(); // Load data from LocalStorage
    renderCategories();
    renderProducts();
    renderInventory();
    renderReports();
    updateCartUI();

    // Set Date
    document.getElementById('current-date').innerText = new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
});

// --- NAVIGATION ---
function switchView(viewName) {
    // Hide all views
    document.querySelectorAll('.app-view').forEach(el => el.classList.add('hidden', 'translate-x-full'));
    document.querySelectorAll('.app-view').forEach(el => el.classList.remove('flex', 'translate-x-[0]'));

    // Show target view
    const target = document.getElementById(`view-${viewName}`);
    target.classList.remove('hidden', 'translate-x-full');
    target.classList.add('flex', 'translate-x-[0]'); // Simplified flex for now

    // Admin check for sensitive views
    if (viewName === 'inventory' && !STATE.isAdmin) {
        showLoginModal(() => {
            switchView(viewName); // Recursive call after success
        });
        return; // Stop current switch
    }

    // Update Nav Icons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.dataset.target === viewName) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    if (viewName === 'reports') renderReports();
}

// --- CATEGORIES ---
function renderCategories() {
    const container = document.getElementById('category-filter');
    container.innerHTML = '';

    STATE.categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `px-4 py-1.5 rounded-full text-sm font-medium shadow-sm whitespace-nowrap transition-all ${STATE.selectedCategory === cat
            ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
            : 'bg-white text-gray-600 border border-gray-100'
            }`;
        btn.innerText = cat;
        btn.onclick = () => {
            STATE.selectedCategory = cat;
            renderCategories();
            renderProducts();
        };
        container.appendChild(btn);
    });
}

// --- POS & SALES ---
function renderProducts() {
    const grid = document.getElementById('product-grid');
    const searchTerm = document.getElementById('pos-search').value.toLowerCase();

    grid.innerHTML = '';
    STATE.products.forEach(p => {
        // Filter by search
        if (!p.name.toLowerCase().includes(searchTerm)) return;

        // Filter by category (handle missing category field)
        const productCategory = p.category || "Khác";
        if (STATE.selectedCategory !== "Tất cả" && productCategory !== STATE.selectedCategory) return;

        const card = document.createElement('div');
        card.className = 'product-card bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-32 active:border-blue-500 cursor-pointer select-none';
        card.onclick = () => addToCart(p.id);
        card.innerHTML = `
            <div>
                <h4 class="font-bold text-gray-800 leading-tight line-clamp-2 text-sm">${p.name}</h4>
                <p class="text-xs text-gray-400 mt-1">Kho: ${p.stock}</p>
            </div>
            <div class="flex justify-between items-end">
                <span class="font-bold text-blue-600">${formatCurrency(p.price)}</span>
                <button class="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center pointer-events-none">
                    <i class="ph ph-plus-bold"></i>
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function addToCart(productId) {
    const product = STATE.products.find(p => p.id === productId);
    if (!product) return;

    if (product.stock <= 0) {
        showToast("Hết hàng trong kho!", "error");
        return;
    }

    const existingItem = STATE.cart.find(i => i.id === productId);
    if (existingItem) {
        if (existingItem.qty < product.stock) {
            existingItem.qty++;
        } else {
            showToast("Đã đạt giới hạn tồn kho!", "warning");
        }
    } else {
        STATE.cart.push({ ...product, qty: 1 });
    }
    updateCartUI();
}

function updateCartUI() {
    const container = document.getElementById('cart-items');
    const badge = document.getElementById('cart-count');
    const mobileBadge = document.getElementById('mobile-cart-badge');
    const subtotalEl = document.getElementById('cart-subtotal');
    const totalEl = document.getElementById('cart-total');

    container.innerHTML = '';
    let total = 0;
    let itemCount = 0;

    if (STATE.cart.length === 0) {
        container.innerHTML = `
            <div class="h-full flex flex-col items-center justify-center text-gray-400">
                <i class="ph ph-shopping-basket text-4xl mb-2 opacity-50"></i>
                <p class="text-sm">Chưa có món nào</p>
            </div>
        `;
    } else {
        STATE.cart.forEach((item, index) => {
            total += item.price * item.qty;
            itemCount += item.qty;

            const row = document.createElement('div');
            row.className = 'flex items-center justify-between bg-gray-50 p-2 rounded-lg';
            row.innerHTML = `
                <div class="flex-1">
                    <h5 class="font-bold text-sm text-gray-800">${item.name}</h5>
                    <p class="text-xs text-blue-600 font-medium">${formatCurrency(item.price)}</p>
                </div>
                <div class="flex items-center gap-3 bg-white rounded-lg px-1 py-1 shadow-sm border border-gray-100">
                    <button class="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-red-500" onclick="updateCartQty(${index}, -1)"><i class="ph ph-minus"></i></button>
                    <span class="font-bold text-sm w-4 text-center">${item.qty}</span>
                    <button class="w-7 h-7 flex items-center justify-center text-blue-600 hover:bg-blue-50" onclick="updateCartQty(${index}, 1)"><i class="ph ph-plus"></i></button>
                </div>
            `;
            container.appendChild(row);
        });
    }

    badge.innerText = itemCount;
    mobileBadge.innerText = itemCount;
    if (itemCount === 0) mobileBadge.classList.add('hidden');
    else mobileBadge.classList.remove('hidden');

    subtotalEl.innerText = formatCurrency(total);
    totalEl.innerText = formatCurrency(total);
}

function updateCartQty(index, delta) {
    const item = STATE.cart[index];
    const product = STATE.products.find(p => p.id === item.id);

    const newQty = item.qty + delta;

    if (newQty <= 0) {
        STATE.cart.splice(index, 1);
    } else if (newQty > product.stock) {
        showToast("Không đủ hàng trong kho!", "warning");
        return;
    } else {
        item.qty = newQty;
    }
    updateCartUI();
}

function clearCart() {
    STATE.cart = [];
    updateCartUI();
}

function processCheckout() {
    if (STATE.cart.length === 0) return;

    // Create Transaction
    const total = STATE.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const profit = STATE.cart.reduce((sum, item) => sum + ((item.price - item.cost) * item.qty), 0);

    const transaction = {
        id: Date.now(),
        date: new Date().toISOString(),
        items: [...STATE.cart],
        total: total,
        profit: profit
    };

    STATE.transactions.push(transaction);

    // Update Stock
    STATE.cart.forEach(item => {
        const product = STATE.products.find(p => p.id === item.id);
        if (product) product.stock -= item.qty;
    });

    showToast(`Thanh toán thành công ${formatCurrency(total)}`, "success");
    clearCart();
    renderInventory(); // Refresh stock
    renderProducts();
    saveDataLocal();
}

// --- ADMIN & INVENTORY ---
function enterPin(num) {
    const display = document.getElementById('pin-display');
    const dots = display.querySelectorAll('.pin-dot');

    // Find first empty dot (simple logic for now, stored in global var/attr not best but works for simple)
    let currentLen = parseInt(display.dataset.len || "0");
    if (currentLen >= 4) return;

    // Append number
    let currentPin = display.dataset.pin || "";
    currentPin += num;
    display.dataset.pin = currentPin;
    display.dataset.len = currentLen + 1;

    dots[currentLen].classList.add('filled');

    // Check if 4 digits
    if (currentLen + 1 === 4) {
        setTimeout(() => {
            checkPin(currentPin);
        }, 100);
    }
}

function clearPin() {
    const display = document.getElementById('pin-display');
    const dots = display.querySelectorAll('.pin-dot');
    display.dataset.pin = "";
    display.dataset.len = "0";
    dots.forEach(d => d.classList.remove('filled'));
}

function checkPin(pin) {
    if (pin === STATE.adminPin) {
        STATE.isAdmin = true;
        closeLoginModal();
        showToast("Đã mở khóa Admin", "success");
        // Execute pending callback if any
        if (window.pendingAdminCallback) {
            window.pendingAdminCallback();
            window.pendingAdminCallback = null;
        }
    } else {
        showToast("Mã PIN sai!", "error");
        clearPin();
        // Shake animation could go here
    }
}

function showLoginModal(callback) {
    if (STATE.isAdmin) {
        if (callback) callback();
        return;
    }
    window.pendingAdminCallback = callback;
    clearPin();
    document.getElementById('login-modal').classList.remove('hidden');
}

function closeLoginModal() {
    document.getElementById('login-modal').classList.add('hidden');
    window.pendingAdminCallback = null;
}

function toggleAdminMode() {
    if (STATE.isAdmin) {
        STATE.isAdmin = false;
        showToast("Đã thoát chế độ Admin");
        switchView('pos'); // Force back to public view
    } else {
        showLoginModal();
    }
}

// --- INVENTORY MANAGEMENT ---
function renderInventory() {
    const list = document.getElementById('inventory-list');
    list.innerHTML = '';

    STATE.products.forEach(p => {
        const row = document.createElement('tr');
        row.className = "hover:bg-gray-50 border-b border-gray-50";
        row.innerHTML = `
            <td class="p-3">
                <div class="font-bold text-gray-800">${p.name}</div>
                <div class="text-xs text-gray-400">Vốn: ${formatCurrency(p.cost)} / ${p.unit}</div>
            </td>
            <td class="p-3 text-right font-medium text-blue-600">${formatCurrency(p.price)}</td>
            <td class="p-3 text-right font-bold ${p.stock < 10 ? 'text-red-500' : 'text-gray-600'}">${p.stock}</td>
            <td class="p-3 text-center">
                <button onclick="editProduct(${p.id})" class="text-gray-400 hover:text-blue-600 p-2"><i class="ph ph-pencil-simple"></i></button>
            </td>
        `;
        list.appendChild(row);
    });
}

function openProductModal(isEdit = false) {
    // Check admin permission
    if (!STATE.isAdmin) {
        showLoginModal(() => openProductModal(isEdit));
        return;
    }

    const modal = document.getElementById('product-modal');
    modal.showModal();
    if (!isEdit) {
        document.getElementById('product-form').reset();
        document.getElementById('prod-id').value = "";
        document.getElementById('modal-title').innerText = "Thêm sản phẩm mới";
        document.getElementById('btn-delete-prod').classList.add('hidden');
    }
}

function closeProductModal() {
    document.getElementById('product-modal').close();
}

function saveProduct() {
    const id = document.getElementById('prod-id').value;
    const name = document.getElementById('prod-name').value;
    const price = parseInt(document.getElementById('prod-price').value) || 0;
    const cost = parseInt(document.getElementById('prod-cost').value) || 0;
    const stock = parseInt(document.getElementById('prod-stock').value) || 0;
    const unit = document.getElementById('prod-unit').value;
    const category = document.getElementById('prod-category').value || "Khác";

    if (id) {
        // Edit
        const idx = STATE.products.findIndex(p => p.id == id);
        if (idx !== -1) {
            STATE.products[idx] = { ...STATE.products[idx], name, price, cost, stock, unit, category };
        }
    } else {
        // Add
        const newProduct = {
            id: Date.now(),
            name, price, cost, stock, unit, category
        };
        STATE.products.push(newProduct);
    }

    saveDataLocal();
    closeProductModal();
    renderInventory();
    renderProducts(); // Refresh Grid
    showToast("Đã lưu hàng hóa", "success");
}

function editProduct(id) {
    const p = STATE.products.find(prod => prod.id === id);
    if (!p) return;

    document.getElementById('prod-id').value = p.id;
    document.getElementById('prod-name').value = p.name;
    document.getElementById('prod-price').value = p.price;
    document.getElementById('prod-cost').value = p.cost;
    document.getElementById('prod-stock').value = p.stock;
    document.getElementById('prod-category').value = p.category || "Khác";
    document.getElementById('prod-unit').value = p.unit;

    document.getElementById('modal-title').innerText = "Sửa sản phẩm";
    document.getElementById('btn-delete-prod').classList.remove('hidden');

    openProductModal(true);
}

function deleteProduct() {
    if (!confirm("Bạn chắc chắn muốn xóa?")) return;
    const id = document.getElementById('prod-id').value;
    STATE.products = STATE.products.filter(p => p.id != id);
    saveDataLocal();
    closeProductModal();
    renderInventory();
    renderProducts();
}

// --- REPORTS ---
let revenueChartInstance = null;

function renderReports() {
    // 1. Calculate Stats
    const today = new Date().toDateString();
    const todayTrans = STATE.transactions.filter(t => new Date(t.date).toDateString() === today);
    const todayRevenue = todayTrans.reduce((sum, t) => sum + t.total, 0);

    const currentMonth = new Date().getMonth();
    const monthTrans = STATE.transactions.filter(t => new Date(t.date).getMonth() === currentMonth);
    const monthRevenue = monthTrans.reduce((sum, t) => sum + t.total, 0);

    document.getElementById('report-today').innerText = formatCurrency(todayRevenue);
    document.getElementById('report-month').innerText = formatCurrency(monthRevenue);

    // 2. Chart (Last 7 days)
    const ctx = document.getElementById('revenueChart');
    if (revenueChartInstance) revenueChartInstance.destroy();

    // Generate labels and data for last 7 days
    const labels = [];
    const data = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        labels.push(`${d.getDate()}/${d.getMonth() + 1}`);

        const dayStr = d.toDateString();
        const dailyTotal = STATE.transactions
            .filter(t => new Date(t.date).toDateString() === dayStr)
            .reduce((sum, t) => sum + t.total, 0);
        data.push(dailyTotal);
    }

    revenueChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Doanh thu',
                data: data,
                backgroundColor: '#3b82f6',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, grid: { display: false } } }
        }
    });

    // 3. Transactions List
    const txList = document.getElementById('recent-transactions');
    txList.innerHTML = '';
    const recent = [...STATE.transactions].sort((a, b) => b.id - a.id).slice(0, 10);

    recent.forEach(t => {
        const div = document.createElement('div');
        div.className = "flex justify-between items-center p-3 text-sm";
        div.innerHTML = `
            <div>
                <div class="font-bold text-gray-800">#${t.id.toString().slice(-4)}</div>
                <div class="text-xs text-gray-400">${new Date(t.date).toLocaleTimeString()}</div>
            </div>
            <div class="font-bold text-green-600">+${formatCurrency(t.total)}</div>
        `;
        txList.appendChild(div);
    });
}

// --- UTILS & DATA STORAGE ---

function formatCurrency(num) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
}

function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const colors = type === 'error' ? 'bg-red-500' : (type === 'success' ? 'bg-green-500' : 'bg-gray-800');

    toast.className = `${colors} text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-all transform translate-y-0 opacity-100 flex items-center gap-2`;
    toast.innerHTML = `<span>${msg}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

function saveDataLocal() {
    localStorage.setItem('retail_app_data', JSON.stringify({
        products: STATE.products,
        transactions: STATE.transactions
    }));
}

function loadDataLocal() {
    const raw = localStorage.getItem('retail_app_data');
    if (raw) {
        const data = JSON.parse(raw);
        STATE.products = data.products || STATE.products;
        STATE.transactions = data.transactions || [];
    }
}

// --- EXCEL EXPORT (Backup) ---
function exportData() {
    const wb = XLSX.utils.book_new();

    // Inventory Sheet
    const wsProd = XLSX.utils.json_to_sheet(STATE.products);
    XLSX.utils.book_append_sheet(wb, wsProd, "Kho Hàng");

    // Transactions Sheet
    // Flatten transactions for simpler Excel view
    const flatTrans = STATE.transactions.map(t => ({
        ID: t.id,
        Ngay: new Date(t.date).toLocaleString(),
        TongTien: t.total,
        LoiNhuan: t.profit,
        ChiTiet: t.items.map(i => `${i.name} (x${i.qty})`).join(', ')
    }));
    const wsTrans = XLSX.utils.json_to_sheet(flatTrans);
    XLSX.utils.book_append_sheet(wb, wsTrans, "Giao Dịch");

    // Save
    XLSX.writeFile(wb, `BACKUP_CuaHang_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast("Đã tải file Backup", "success");
}

// --- CART TOGGLE (Mobile) ---
function toggleCart() {
    const cart = document.getElementById('cart-panel');
    cart.classList.toggle('cart-open');
}

// --- GOOGLE DRIVE INTEGRATION ---
let googleDriveReady = false;
let gapiInited = false;
let gisInited = false;
let tokenClient;

// Google API Configuration
const CLIENT_ID = 'YOUR_CLIENT_ID.apps.googleusercontent.com'; // User needs to replace this
const API_KEY = 'YOUR_API_KEY'; // User needs to replace this
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

function loadGoogleDriveAPI() {
    // Load Google API scripts dynamically
    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.onload = gapiLoaded;
    document.head.appendChild(gapiScript);

    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.onload = gisLoaded;
    document.head.appendChild(gisScript);
}

function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
    });
    gapiInited = true;
    maybeEnableButtons();
}

function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined later
    });
    gisInited = true;
    maybeEnableButtons();
}

function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        googleDriveReady = true;
    }
}

function saveToDrive() {
    // Check if configured
    if (CLIENT_ID.includes('YOUR_') || API_KEY.includes('YOUR_')) {
        showToast('Chưa cấu hình Google Drive API. Vui lòng xem hướng dẫn!', 'error');
        showDriveSetupGuide();
        return;
    }

    if (!googleDriveReady) {
        loadGoogleDriveAPI();
        showToast('Đang tải Google Drive API...', 'info');
        setTimeout(() => saveToDrive(), 3000);
        return;
    }

    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            throw (resp);
        }
        await uploadFileToDrive();
    };

    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        tokenClient.requestAccessToken({ prompt: '' });
    }
}

async function uploadFileToDrive() {
    try {
        // Prepare data
        const data = JSON.stringify({
            products: STATE.products,
            transactions: STATE.transactions
        }, null, 2);

        const file = new Blob([data], { type: 'application/json' });
        const metadata = {
            name: `CuaHang_Backup_${new Date().toISOString().slice(0, 10)}.json`,
            mimeType: 'application/json',
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: new Headers({ 'Authorization': 'Bearer ' + gapi.client.getToken().access_token }),
            body: form,
        });

        const result = await response.json();
        if (result.id) {
            showToast('Đã lưu thành công lên Google Drive!', 'success');
        } else {
            showToast('Lỗi khi lưu lên Drive', 'error');
        }
    } catch (error) {
        console.error('Drive upload error:', error);
        showToast('Lỗi khi lưu lên Drive', 'error');
    }
}

function showDriveSetupGuide() {
    alert(`HƯỚNG DẪN CẤU HÌNH GOOGLE DRIVE:

1. Truy cập: https://console.cloud.google.com/
2. Tạo dự án mới
3. Bật Google Drive API
4. Tạo OAuth 2.0 Client ID và API Key
5. Sao chép Client ID và API Key
6. Mở file app.js, tìm dòng:
   - CLIENT_ID = 'YOUR_CLIENT_ID...'
   - API_KEY = 'YOUR_API_KEY'
7. Thay thế bằng thông tin của bạn

HOẶC: Tiếp tục dùng nút "Sao lưu Excel" để tải file về máy rồi tự upload lên Drive!`);
}

// Search Listener
// Settings page
function showSettings() {
    alert('Cài đặt: Tính năng đang phát triển.\n\nĐể đổi mật khẩu Admin:\n1. Mở file app.js\n2. Tìm dòng: adminPin: "1234"\n3. Đổi thành mã bạn muốn\n4. Lưu file');
}

// Search Listener
document.getElementById('pos-search').addEventListener('input', renderProducts);

