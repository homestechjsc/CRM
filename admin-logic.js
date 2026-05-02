import { db, ref, set, push, remove, get, child } from './firebase-config.js';
import { onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// --- KHAI BÁO BIẾN TOÀN CỤC (GLOBAL) ---
let currentSelectedCustId = null;
let currentSelectedQuoteId = null; 
let quoteData = null;
let editingDeviceId = null; 
let editingCustomerId = null;
let html5QrCode = null; 

// Hàm định dạng tiền tệ Việt Nam
const formatVND = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);

// --- 1. QUẢN LÝ GIAO DIỆN & TABS ---
window.switchTab = (tab) => {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    
    const targetTab = document.getElementById('tab-' + tab);
    if (targetTab) targetTab.classList.add('active');

    // Cập nhật trạng thái nút bấm điều hướng
    const btn = document.querySelector(`button[onclick*="switchTab('${tab}')"]`);
    if (btn) btn.classList.add('active');

    if (tab === 'quotes') updateCustomerSelect();
};

window.openModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('hidden');
        // Tự động điền ngày hiện tại nếu là modal thêm thiết bị
        if (id === 'modal-add-device' && !editingDeviceId) {
            document.getElementById('in-dev-install-date').value = new Date().toISOString().split('T')[0];
        }
    }
};

window.closeModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('hidden');
        window.stopScanner(); 
        const inputs = modal.querySelectorAll('input');
        inputs.forEach(input => input.value = "");
        editingDeviceId = null;
        editingCustomerId = null;
    }
};

// --- 2. QUẢN LÝ QUÉT MÃ S/N ---
window.startScanner = () => {
    const readerElem = document.getElementById('reader');
    if (readerElem) {
        readerElem.classList.remove('hidden');
        html5QrCode = new Html5Qrcode("reader");
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        html5QrCode.start({ facingMode: "environment" }, config, (decodedText) => {
            document.getElementById('in-dev-serial').value = decodedText;
            window.stopScanner(); 
        }).catch(err => alert("Lỗi camera: " + err));
    }
};

window.stopScanner = () => {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            document.getElementById('reader').classList.add('hidden');
            html5QrCode = null;
        }).catch(err => console.error(err));
    }
};

// --- 3. QUẢN LÝ KHÁCH HÀNG & THIẾT BỊ (Đã sửa để dùng Mã KH) ---
window.saveCustomer = async () => {
    // Lấy giá trị Mã KH từ ô nhập liệu mới
    const customId = document.getElementById('in-cust-id').value.trim().toUpperCase(); 
    const name = document.getElementById('in-cust-name').value;
    const phone = document.getElementById('in-cust-phone').value;
    const addr = document.getElementById('in-cust-addr').value;

    if (!customId) return alert("Vui lòng nhập Mã khách hàng (Ví dụ: KH001)");
    if (!name) return alert("Vui lòng nhập tên khách hàng");

    const data = { 
        customId, // Lưu lại Mã KH vào trong object dữ liệu
        name, 
        phone, 
        address: addr, 
        updatedAt: Date.now() 
    };

    try {
        if (editingCustomerId) {
            // Nếu đang sửa khách hàng cũ
            await set(ref(db, `customers/${editingCustomerId}`), data);
        } else {
            // Tạo mới: Dùng customId làm key thay vì dùng push() tự động
            await set(ref(db, `customers/${customId}`), { 
                ...data, 
                createdAt: Date.now() 
            });
        }
        window.closeModal('modal-add-customer');
        // Reset form và ID đang sửa
        editingCustomerId = null; 
    } catch (e) { 
        console.error("Lỗi lưu khách hàng:", e); 
        alert("Không thể lưu dữ liệu, vui lòng kiểm tra lại!");
    }
};


window.saveDevice = async (shouldClose = true) => {
    const data = {
        customerId: currentSelectedCustId,
        name: document.getElementById('in-dev-name').value,
        serial: document.getElementById('in-dev-serial').value,
        brand: document.getElementById('in-dev-brand').value,
        installDate: document.getElementById('in-dev-install-date').value,
        warranty: document.getElementById('in-dev-warranty').value,
        ip: document.getElementById('in-dev-ip').value,
        user: document.getElementById('in-dev-user').value,
        pass: document.getElementById('in-dev-pass').value,
        imgUrl: document.getElementById('in-dev-img-url').value,
        updatedAt: Date.now()
    };
    if (!data.name || !currentSelectedCustId) return alert("Thiếu thông tin thiết bị");
    try {
        if (editingDeviceId) await set(ref(db, `devices/${editingDeviceId}`), data);
        else await set(push(ref(db, 'devices')), { ...data, createdAt: Date.now() });

        if (shouldClose) window.closeModal('modal-add-device');
        else {
            document.getElementById('in-dev-serial').value = "";
            document.getElementById('in-dev-serial').focus();
        }
    } catch (e) { console.error(e); }
};

window.saveDeviceContinuous = async () => { await window.saveDevice(false); };

// --- QUẢN LÝ TÀI KHOẢN (Sửa lỗi saveAccount is not defined) ---
window.saveAccount = async () => {
    const title = document.getElementById('in-acc-title').value;
    const appName = document.getElementById('in-acc-app').value;
    const user = document.getElementById('in-acc-user').value;
    const pass = document.getElementById('in-acc-pass').value;
    const note = document.getElementById('in-acc-note').value;

    if (!title || !currentSelectedCustId) {
        return alert("Vui lòng nhập tên tài khoản và chọn khách hàng!");
    }

    try {
        await push(ref(db, 'accounts'), {
            customerId: currentSelectedCustId,
            title, 
            appName, 
            username: user, 
            password: pass, 
            note, 
            createdAt: Date.now()
        });
        window.closeModal('modal-add-account');
    } catch (e) { 
        console.error("Lỗi lưu tài khoản:", e); 
    }
};

// --- QUẢN LÝ SƠ ĐỒ (Sửa lỗi saveDiagram is not defined) ---
window.saveDiagram = async () => {
    const name = document.getElementById('in-diag-name').value;
    const url = document.getElementById('in-diag-url').value;

    if (!name || !url || !currentSelectedCustId) {
        return alert("Vui lòng nhập đủ tên sơ đồ, link ảnh và chọn khách hàng!");
    }

    try {
        await push(ref(db, 'diagrams'), { 
            customerId: currentSelectedCustId, 
            name, 
            url, 
            createdAt: Date.now() 
        });
        window.closeModal('modal-add-diagram');
    } catch (e) { 
        console.error("Lỗi lưu sơ đồ:", e); 
    }
};

// --- 4. HỆ THỐNG BÁO GIÁ NÂNG CAO ---

async function updateCustomerSelect() {
    const select = document.getElementById('in-q-customer');
    if (!select) return;
    const snapshot = await get(ref(db, 'customers'));
    select.innerHTML = '<option value="">-- Chọn khách hàng --</option>';
    if (snapshot.exists()) {
        snapshot.forEach(child => {
            select.innerHTML += `<option value="${child.key}">${child.val().name}</option>`;
        });
    }
}

window.initNewQuote = async () => {
    const customerId = document.getElementById('in-q-customer').value;
    const title = document.getElementById('in-q-title').value;
    if (!customerId || !title) return alert("Vui lòng nhập đủ thông tin");

    try {
        const quoteRef = push(ref(db, 'quotes'));
        currentSelectedQuoteId = quoteRef.key;
        await set(quoteRef, { customerId, title, status: "DRAFT", createdAt: Date.now() });
        window.closeModal('modal-add-quote');
        window.selectQuote(currentSelectedQuoteId);
    } catch (e) { console.error(e); }
};

window.selectQuote = async (quoteId) => {
    currentSelectedQuoteId = quoteId; 
    onValue(ref(db, `quotes/${quoteId}`), (snapshot) => {
        if (!snapshot.exists()) return;
        quoteData = snapshot.val();
        
        document.getElementById('quote-detail-area').classList.remove('hidden');
        document.getElementById('q-det-title').innerText = quoteData.title;
        
        const listItems = document.getElementById('q-list-items');
        listItems.innerHTML = "";

        if (quoteData.items) {
            const groups = {};
            Object.keys(quoteData.items).forEach(key => {
                const item = quoteData.items[key];
                const gName = item.group || "Hạng mục chung";
                if (!groups[gName]) groups[gName] = [];
                groups[gName].push({ ...item, key });
            });

            for (const gName in groups) {
                let gTotal = 0;
                listItems.innerHTML += `<tr class="bg-gray-50 border-b"><td colspan="5" class="p-2 font-bold text-blue-800 text-[10px] uppercase">${gName}</td></tr>`;
                groups[gName].forEach(item => {
                    const rowTotal = item.qty * item.price;
                    gTotal += rowTotal;
                    listItems.innerHTML += `
                        <tr class="border-b text-xs hover:bg-gray-50">
                            <td class="p-3 pl-6">${item.name}</td>
                            <td class="p-3 text-center">${item.qty}</td>
                            <td class="p-3 text-right">${formatVND(item.price)}</td>
                            <td class="p-3 text-right font-bold text-blue-600">${formatVND(rowTotal)}</td>
                            <td class="p-3 text-center text-red-400 cursor-pointer" onclick="deleteQuoteItem('${quoteId}', '${item.key}')">×</td>
                        </tr>`;
                });
                listItems.innerHTML += `<tr class="bg-blue-50/20 border-b italic"><td colspan="3" class="p-2 text-right text-[10px] font-bold text-gray-400">Cộng nhóm:</td><td class="p-2 text-right text-xs font-black text-blue-800">${formatVND(gTotal)}</td><td></td></tr>`;
            }
        }
        window.calculateQuoteTotal();
    });
};

window.calculateQuoteTotal = () => {
    if (!quoteData || !quoteData.items) return;

    let subtotal = 0;   // Tổng tiền hàng
    let totalCost = 0;  // Tổng giá vốn

    // Duyệt qua từng item để tính toán tiền hàng và tiền vốn
    Object.values(quoteData.items).forEach(item => {
        subtotal += (item.qty * (item.price || 0));
        totalCost += (item.qty * (item.cost || 0));
    });

    // Xử lý Giảm giá[cite: 1]
    const discVal = parseFloat(document.getElementById('in-q-discount-val').value) || 0;
    const discType = document.getElementById('in-q-discount-type').value;
    let discAmount = discType === 'percent' ? (subtotal * discVal / 100) : discVal;

    // Tính toán số cuối cùng (Không có VAT)[cite: 1]
    const finalTotal = subtotal - discAmount;
    const finalProfit = finalTotal - totalCost; // Lợi nhuận sau khi đã trừ giảm giá[cite: 1]

    // Hiển thị ra giao diện[cite: 1]
    document.getElementById('q-subtotal').innerText = formatVND(subtotal);
    document.getElementById('q-total').innerText = formatVND(finalTotal);
    
    // Hiển thị vùng lợi nhuận cho quản trị viên[cite: 1]
    const profitArea = document.getElementById('q-profit-area');
    if (profitArea) {
        profitArea.classList.remove('hidden');
        profitArea.innerHTML = `
            <div class="flex justify-between items-center text-[10px] border-b border-blue-100 pb-1 mb-1 font-bold text-blue-400 uppercase">
                <span>Phân tích nội bộ</span>
                <i class="fa-solid fa-calculator"></i>
            </div>
            <div class="flex justify-between items-center text-[11px] mt-1">
                <span class="text-gray-500 uppercase font-black text-[10px]">Lợi nhuận gộp:</span>
                <span class="font-black ${finalProfit >= 0 ? 'text-green-600' : 'text-red-600'} text-sm">
                    ${formatVND(finalProfit)}
                </span>
            </div>
        `;
    }
};

window.suggestProducts = async (keyword) => {
    const box = document.getElementById('product-suggestions');
    if (!keyword) { box.classList.add('hidden'); return; }
    
    const snap = await get(ref(db, 'catalog'));
    if (snap.exists()) {
        const prods = snap.val();
        const matches = Object.keys(prods).filter(k => k.toLowerCase().includes(keyword.toLowerCase()));
        
        if (matches.length > 0) {
            box.innerHTML = matches.map(name => {
                const p = prods[name];
                // Sửa lỗi: Truyền trực tiếp p.cost thay vì prods[prods[name].cost]
                return `
                <div class="p-2 hover:bg-blue-50 cursor-pointer text-xs border-b" 
                     onclick="selectSuggestedProduct('${name}', ${p.price || 0}, ${p.cost || 0})">
                    <div class="flex justify-between items-center">
                        <b>${name}</b>
                        <span class="text-[9px] text-gray-400 font-mono">Vốn: ${formatVND(p.cost || 0)}</span>
                    </div>
                </div>`;
            }).join('');
            box.classList.remove('hidden');
        } else {
            box.classList.add('hidden');
        }
    }
};

window.selectSuggestedProduct = (name, price, cost) => {
    // Điền dữ liệu vào các ô input trong Modal
    document.getElementById('in-qi-name').value = name;
    document.getElementById('in-qi-price').value = price;
    document.getElementById('in-qi-cost').value = cost; // Bây giờ giá vốn sẽ hiển thị chính xác
    
    document.getElementById('product-suggestions').classList.add('hidden');
};
window.saveQuoteItem = async () => {
    const group = document.getElementById('in-qi-group').value || "Hạng mục chung";
    const name = document.getElementById('in-qi-name').value;
    const qty = parseInt(document.getElementById('in-qi-qty').value);
    const price = parseInt(document.getElementById('in-qi-price').value);
    const cost = parseInt(document.getElementById('in-qi-cost').value) || 0; // Lấy giá vốn từ input[cite: 1]

    if (!name || !currentSelectedQuoteId) return alert("Thiếu thông tin");
    
    try {
        // Lưu vào báo giá hiện tại[cite: 1]
        await push(ref(db, `quotes/${currentSelectedQuoteId}/items`), { group, name, qty, price, cost });
        
        // Cập nhật lại danh mục để lần sau gợi ý đúng giá mới nhất[cite: 1]
        await set(ref(db, `catalog/${name}`), { price, cost, updatedAt: Date.now() });
        
        window.closeModal('modal-add-quote-item');
    } catch (e) { 
        console.error("Lỗi lưu hạng mục:", e); 
    }
};

window.deleteQuote = async (id) => {
    if (!id || !confirm("Xóa TOÀN BỘ bản báo giá này?")) return;
    try {
        await remove(ref(db, `quotes/${id}`));
        if (currentSelectedQuoteId === id) {
            document.getElementById('quote-detail-area')?.classList.add('hidden');
            currentSelectedQuoteId = null;
        }
        alert("Đã xóa xong!");
    } catch (e) {
        alert("Lỗi: " + e.message);
    }
};

// --- 6. KHỞI CHẠY & WATCHERS ---
export function watchQuotes() {
    onValue(ref(db, 'quotes'), (snapshot) => {
        const list = document.getElementById('list-quotes');
        if (!list) return;
        list.innerHTML = "";
        
        snapshot.forEach(childSnap => {
            const quote = childSnap.val();
            const id = childSnap.key;
            const li = document.createElement('li');
            
            // Thêm class 'group' và 'relative' để định vị nút xóa
            li.className = `p-4 cursor-pointer border-b hover:bg-gray-50 transition-all group relative ${currentSelectedQuoteId === id ? 'bg-green-50 border-l-4 border-green-500' : ''}`;
            
            li.innerHTML = `
                <div onclick="window.selectQuote('${id}')" class="flex-1">
                    <p class="font-bold text-sm text-gray-800">${quote.title}</p>
                    <p class="text-[10px] text-gray-400 italic">${new Date(quote.createdAt).toLocaleDateString()}</p>
                </div>
                <!-- NÚT XÓA TOÀN BỘ BÁO GIÁ: Chỉ hiện khi di chuột vào dòng -->
                <button onclick="event.stopPropagation(); window.deleteQuote('${id}')" 
                        class="absolute right-4 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>`;
            list.appendChild(li);
        });
    });
}

// Bổ sung các hàm xóa và tiện ích khác
window.addQuoteItemPrompt = () => window.openModal('modal-add-quote-item');
window.deleteQuoteItem = async (qId, iKey) => { if (confirm("Xóa?")) await remove(ref(db, `quotes/${qId}/items/${iKey}`)); };
window.selectCustomer = async (id) => {
    currentSelectedCustId = id; // Lưu ID khách hàng đang chọn
    
    const snapshot = await get(child(ref(db), `customers/${id}`));
    if (!snapshot.exists()) return;
    const data = snapshot.val();

    // Hiển thị vùng chi tiết và ẩn trạng thái trống
    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('customer-detail-area').classList.remove('hidden');
    
    // Đổ thông tin cơ bản[cite: 1]
    document.getElementById('det-name').innerText = data.name;
    document.getElementById('det-info').innerText = `${data.phone || ''} - ${data.address || ''}`;

    // Tạo mã QR cho khách hàng (Đã sửa theo Mã KH và GitHub Pages)[cite: 1, 5]
const qrContainer = document.getElementById('qrcode');
qrContainer.innerHTML = "";
if (window.QRCode) {
    // 1. Dùng đường dẫn cố định của dự án trên GitHub để tránh lỗi localhost
    // 2. Thay đổi tham số 'id' thành 'makh' để khớp với yêu cầu mới[cite: 1]
    const repoPath = "https://homestechjsc.github.io/crmhomestech";
    const clientUrl = `${repoPath}/client-view.html?makh=${id}`;

    new QRCode(qrContainer, {
        text: clientUrl,
        width: 120, 
        height: 120,
        colorDark: "#1d4ed8", // Màu xanh cùng tone với hệ thống
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H // Tăng khả năng quét khi in ấn
    });
    
    console.log("QR Code trỏ tới:", clientUrl); // Để bạn kiểm tra trong Console
}
    // Tải danh sách Thiết bị lắp đặt[cite: 1]
    loadSubData('devices', 'list-devices', (item, key) => `
        <div class="bg-gray-50 p-3 rounded border group mb-2 shadow-sm">
            <div class="flex justify-between items-start">
                <div>
                    <b class="text-blue-700 text-sm">${item.name}</b>
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Thương hiệu: ${item.brand || 'N/A'}</p>
                </div>
                <div class="flex gap-2">
                    <button onclick="editDevice('${key}')" class="text-blue-500 hover:text-blue-700 text-[10px] font-bold">Sửa</button>
                    <button onclick="deleteData('devices/${key}')" class="text-red-500 hover:text-red-700 text-[10px] font-bold">Xóa</button>
                </div>
            </div>
            <div class="mt-2 text-[10px] text-gray-600 font-mono border-t pt-2">
                <p><span class="text-gray-400">S/N:</span> ${item.serial}</p>
                <p><span class="text-gray-400">IP:</span> ${item.ip || 'N/A'}</p>
            </div>
        </div>`);

    // Tải danh sách Tài khoản & App[cite: 1]
    loadSubData('accounts', 'list-accounts', (item, key) => `
        <div class="bg-blue-50 p-3 rounded border-l-4 border-blue-400 relative group mt-2 shadow-sm">
            <div class="flex justify-between items-start">
                <b class="text-blue-800 text-sm">${item.title}</b>
                <span class="text-[10px] bg-blue-200 text-blue-700 px-2 rounded-full font-bold">${item.appName || 'App'}</span>
            </div>
            <p class="text-xs mt-1 font-mono"><b>U:</b> ${item.username} | <b>P:</b> ${item.password}</p>
            <button onclick="deleteData('accounts/${key}')" class="absolute right-2 bottom-2 text-red-400 hidden group-hover:block text-[10px] hover:text-red-600">Xóa</button>
        </div>`);

    // Tải danh sách Sơ đồ hệ thống[cite: 1]
    loadSubData('diagrams', 'list-diagrams', (item, key) => `
        <div class="bg-purple-50 p-3 rounded border border-purple-100 group relative">
            <div class="flex justify-between items-center text-xs">
                <b class="text-purple-800">${item.name}</b>
                <div class="flex gap-2 font-bold">
                    <a href="${item.url}" target="_blank" class="text-blue-600 hover:underline">Xem</a>
                    <button onclick="deleteData('diagrams/${key}')" class="text-red-400">Xóa</button>
                </div>
            </div>
        </div>`);
};

// --- 8. KHÔI PHỤC HÀM TRỢ GIÚP ---
function loadSubData(path, targetId, templateFunc) {
    onValue(ref(db, path), (snapshot) => {
        const container = document.getElementById(targetId);
        if (!container) return;
        container.innerHTML = "";
        snapshot.forEach(child => {
            if (child.val().customerId === currentSelectedCustId) {
                container.innerHTML += templateFunc(child.val(), child.key);
            }
        });
    });
}

window.deleteData = async (path) => {
    if (confirm("Xóa dữ liệu này?")) await remove(ref(db, path));
};

// Cập nhật lại watchCustomers để hiển thị danh sách khách hàng bên trái[cite: 1]
export function watchCustomers() {
    const listContainer = document.getElementById('list-customers');
    onValue(ref(db, 'customers'), (snapshot) => {
        if (!listContainer) return;
        listContainer.innerHTML = "";
        if (!snapshot.exists()) return;
        
        snapshot.forEach(childSnapshot => {
            const cust = childSnapshot.val();
            const id = childSnapshot.key;
            const li = document.createElement('li');
            
            // Thiết lập class hiển thị (Highlight nếu đang chọn)
            li.className = `p-4 hover:bg-blue-50 cursor-pointer border-l-4 transition-all flex justify-between items-center ${currentSelectedCustId === id ? 'border-blue-500 bg-blue-50' : 'border-transparent'}`;
            
            li.innerHTML = `
                <div onclick="window.selectCustomer('${id}')" class="flex-1">
                    <p class="font-bold text-gray-800">${cust.name}</p>
                    <p class="text-xs text-gray-500">${cust.phone || ''}</p>
                </div>
                <div class="flex gap-3 ml-2">
                    <!-- Nút Sửa -->
                    <button onclick="window.editCustomer('${id}')" class="text-blue-500 hover:text-blue-700">
                        <i class="fa-solid fa-pen-to-square"></i> Sửa
                    </button>
                    <!-- Nút Xóa -->
                    <button onclick="window.deleteCustomer('${id}')" class="text-red-500 hover:text-red-700">
                        <i class="fa-solid fa-trash"></i> Xóa
                    </button>
                </div>`;
            listContainer.appendChild(li);
        });
    });
}

// Hàm mở Modal để sửa thông tin khách hàng
window.editCustomer = async (id) => {
    editingCustomerId = id; // Gán ID khách hàng đang sửa vào biến toàn cục
    const snapshot = await get(child(ref(db), `customers/${id}`));
    if (snapshot.exists()) {
        const cust = snapshot.val();
        // Đổ dữ liệu vào các ô input trong Modal
        document.getElementById('in-cust-name').value = cust.name || "";
        document.getElementById('in-cust-phone').value = cust.phone || "";
        document.getElementById('in-cust-addr').value = cust.address || "";
        
        // Mở modal thêm khách hàng (dùng chung cho cả thêm và sửa)
        window.openModal('modal-add-customer');
    }
};

// Hàm xóa khách hàng[cite: 1]
window.deleteCustomer = async (id) => {
    if (confirm("Xóa khách hàng này sẽ mất toàn bộ dữ liệu thiết bị và tài khoản liên quan. Bạn có chắc chắn?")) {
        try {
            await remove(ref(db, `customers/${id}`));
            // Nếu khách hàng đang bị xóa là khách hàng đang hiển thị, hãy ẩn vùng chi tiết[cite: 1]
            if (currentSelectedCustId === id) {
                document.getElementById('customer-detail-area').classList.add('hidden');
                document.getElementById('empty-state').classList.remove('hidden');
                currentSelectedCustId = null;
            }
        } catch (e) { 
            console.error("Lỗi khi xóa khách hàng:", e); 
        }
    }
};

// Hàm lấy dữ liệu thiết bị và đổ vào Modal để chỉnh sửa
window.editDevice = async (deviceId) => {
    editingDeviceId = deviceId; // Lưu ID thiết bị đang sửa vào biến toàn cục
    
    try {
        const snapshot = await get(child(ref(db), `devices/${deviceId}`));
        if (snapshot.exists()) {
            const dev = snapshot.val();
            
            // Đổ dữ liệu vào các ô input trong Modal
            document.getElementById('in-dev-name').value = dev.name || "";
            document.getElementById('in-dev-serial').value = dev.serial || "";
            document.getElementById('in-dev-brand').value = dev.brand || "";
            document.getElementById('in-dev-install-date').value = dev.installDate || "";
            document.getElementById('in-dev-warranty').value = dev.warranty || "";
            document.getElementById('in-dev-ip').value = dev.ip || "";
            document.getElementById('in-dev-user').value = dev.user || "";
            document.getElementById('in-dev-pass').value = dev.pass || "";
            document.getElementById('in-dev-img-url').value = dev.imgUrl || "";
            
            // Nếu bạn có ô nhập giá bán và giá vốn ở phần thiết bị, hãy bổ sung:
            if (document.getElementById('in-dev-price')) {
                document.getElementById('in-dev-price').value = dev.price || 0;
            }
            if (document.getElementById('in-dev-cost')) {
                document.getElementById('in-dev-cost').value = dev.cost || 0;
            }

            // Đổi tiêu đề Modal để người dùng biết đang ở chế độ chỉnh sửa
            const title = document.getElementById('modal-device-title');
            if (title) title.innerText = "Chỉnh sửa thông tin thiết bị";
            
            window.openModal('modal-add-device');
        }
    } catch (e) {
        console.error("Lỗi khi lấy dữ liệu thiết bị:", e);
        alert("Không thể tải dữ liệu thiết bị");
    }
};

// --- 9. XUẤT BÁO GIÁ SANG FILE PDF ---
window.printQuote = () => {
    // Chọn vùng cần in (Vùng chứa toàn bộ bảng tính và tổng cộng)
    const element = document.getElementById('quote-detail-area');
    
    if (!element) {
        alert("Không tìm thấy nội dung báo giá để in!");
        return;
    }

    // Cấu hình cho file PDF[cite: 1]
    const opt = {
        margin:       [10, 10, 10, 10], // Lề: trên, trái, dưới, phải
        filename:     `Bao_Gia_${currentSelectedQuoteId || 'Homestech'}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Thực hiện chuyển đổi và tải về[cite: 1]
    // Lưu ý: Thư viện sẽ tự động ẩn các nút bấm nếu bạn thêm class 'no-print' cho chúng
    html2pdf().set(opt).from(element).save();
};


// Khởi chạy đồng thời cả hai bộ theo dõi[cite: 1]
watchCustomers();
watchQuotes();
