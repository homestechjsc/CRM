import { db, ref, set, push, remove, get, child } from './firebase-config.js';
import { onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// --- KHAI BÁO BIẾN TOÀN CỤC (GLOBAL) ---
let currentSelectedCustId = null;
let currentSelectedQuoteId = null; 
let quoteData = null;
let editingDeviceId = null; 
let editingCustomerId = null;
let html5QrCode = null; 
let editingAccountId = null;
let editingDiagramId = null;

const getCurrentTechName = () => {
    // Sau này khi bạn làm trang login, bạn sẽ lưu tên kỹ thuật vào localStorage khi đăng nhập thành công
    // Ví dụ: localStorage.setItem('techName', 'Nguyễn Văn A');
    return localStorage.getItem('techName') || "Kỹ thuật Homestech";
};
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
        
        // Sửa lỗi dòng 41: Kiểm tra nếu có ô input ngày mới điền
        const dateInput = document.getElementById('in-dev-install-date');
        if (id === 'modal-add-device' && !editingDeviceId && dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
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
    const container = document.getElementById('reader-container');
    if (container) {
        container.classList.remove('hidden');
        html5QrCode = new Html5Qrcode("reader");
        
        const config = { 
            fps: 30, // Tăng lên 30 để khung hình mượt nhất có thể
            qrbox: { width: 260, height: 150 }, 
            // Cấu hình nâng cao cho lấy nét
            videoConstraints: {
                facingMode: "environment",
                // Ưu tiên tốc độ lấy nét hơn là độ phân giải cực cao
                width: { min: 640, ideal: 1280, max: 1920 },
                height: { min: 480, ideal: 720, max: 1080 },
                // Ép camera lấy nét liên tục (nếu thiết bị hỗ trợ)
                focusMode: "continuous"
            }
        };

        html5QrCode.start(
            { facingMode: "environment" }, 
            config, 
            (decodedText) => {
                const inputSN = document.getElementById('in-dev-model');
                if (inputSN) {
                    inputSN.value = decodedText;
                }
                window.stopScanner(); 
                if (navigator.vibrate) navigator.vibrate(200); 
            }
        ).catch(err => {
            console.error("Camera error:", err);
        });
    }
};
window.stopScanner = () => {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            document.getElementById('reader-container').classList.add('hidden');
            html5QrCode = null;
        }).catch(err => console.error("Lỗi khi dừng camera:", err));
    }
};

// --- 3. QUẢN LÝ KHÁCH HÀNG & THIẾT BỊ ---
window.saveCustomer = async () => {
    const name = document.getElementById('in-cust-name').value;
    const phone = document.getElementById('in-cust-phone').value;
    const contact = document.getElementById('in-cust-contact').value;
    const contactPhone = document.getElementById('in-cust-contact-phone').value;
    const addr = document.getElementById('in-cust-addr').value;
    
    // Tự động lấy tên kỹ thuật đang đăng nhập
    const technicalStaff = getCurrentTechName();

    if (!name || !phone) return alert("Vui lòng nhập tên và SĐT khách hàng");

    const data = {
        name,
        phone,
        contact,
        contactPhone,
        address: addr,
        createdByTech: technicalStaff, // Lưu tên kỹ thuật thực hiện vào DB
        updatedAt: Date.now()
    };

    try {
        if (editingCustomerId) {
            await set(ref(db, `customers/${editingCustomerId}`), data);
        } else {
            await set(push(ref(db, 'customers')), { 
                ...data, 
                createdAt: Date.now() 
            });
        }
        alert("Đã lưu hồ sơ thành công!");
        window.closeModal('modal-add-customer');
        // Reset form
        editingCustomerId = null;
    } catch (e) {
        alert("Lỗi: " + e.message);
    }
};

window.saveDevice = async () => {
    const name = document.getElementById('in-dev-name').value;
    const model = document.getElementById('in-dev-model').value;
    const ip = document.getElementById('in-dev-ip').value;
    const password = document.getElementById('in-dev-pass').value; // Lấy mật khẩu

    if (!currentSelectedCustId) return alert("Vui lòng chọn khách hàng trước");
    if (!name) return alert("Vui lòng nhập tên thiết bị");

    const deviceData = {
        customerId: currentSelectedCustId,
        name,
        model,
        ip,
        password, // Lưu vào object
        updatedAt: Date.now()
    };

    try {
        if (editingDeviceId) {
            await set(ref(db, `devices/${editingDeviceId}`), deviceData);
            editingDeviceId = null;
        } else {
            await push(ref(db, 'devices'), { ...deviceData, createdAt: Date.now() });
        }
        
        // Reset form
        document.getElementById('in-dev-name').value = "";
        document.getElementById('in-dev-model').value = "";
        document.getElementById('in-dev-ip').value = "";
        document.getElementById('in-dev-pass').value = "";
        
        window.closeModal('modal-add-device');
        alert("Đã lưu thiết bị!");
    } catch (e) {
        console.error(e);
        alert("Lỗi khi lưu thiết bị");
    }
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
        return alert("Vui lòng nhập đủ thông tin sơ đồ!");
    }

    try {
        await push(ref(db, 'diagrams'), { 
            customerId: currentSelectedCustId, 
            name, 
            url, 
            createdAt: Date.now() 
        });
        window.closeModal('modal-add-diagram');
        alert("Đã thêm sơ đồ thành công!");
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
            li.className = `p-4 cursor-pointer border-b hover:bg-gray-50 transition-all ${currentSelectedQuoteId === id ? 'bg-green-50 border-l-4 border-green-500' : ''}`;
            li.innerHTML = `<div onclick="window.selectQuote('${id}')"><p class="font-bold text-sm">${quote.title}</p><p class="text-[10px] text-gray-400 italic">${new Date(quote.createdAt).toLocaleDateString()}</p></div>`;
            list.appendChild(li);
        });
    });
}

// Bổ sung các hàm xóa và tiện ích khác
window.addQuoteItemPrompt = () => window.openModal('modal-add-quote-item');
window.deleteQuoteItem = async (qId, iKey) => { if (confirm("Xóa?")) await remove(ref(db, `quotes/${qId}/items/${iKey}`)); };
window.selectCustomer = async (id) => {
    currentSelectedCustId = id;
    const snapshot = await get(child(ref(db), `customers/${id}`));
    if (!snapshot.exists()) return;
    const data = snapshot.val();

    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('customer-detail-area').classList.remove('hidden');
    
    // Hiển thị thông tin khách hàng
    document.getElementById('det-name').innerText = data.name;
    document.getElementById('det-info').innerHTML = `
        <div class="flex flex-col gap-0.5">
            <span><i class="fa-solid fa-phone mr-1"></i> ${data.phone || ''}</span>
            <span><i class="fa-solid fa-location-dot mr-1"></i> ${data.address || ''}</span>
        </div>`;
    
    // Khởi tạo mã QR
    // Khởi tạo mã QR - Sử dụng đường dẫn tuyệt đối đến GitHub Pages của bạn
const qrBox = document.getElementById('qrcode');
qrBox.innerHTML = "";

// Đảm bảo đường dẫn này khớp chính xác với URL dự án của bạn
const clientUrl = `https://homestechjsc.github.io/CRM/client-view.html?id=${id}`;

new QRCode(qrBox, { 
    text: clientUrl, 
    width: 120, 
    height: 120,
    correctLevel: QRCode.CorrectLevel.H 
});

    // --- RENDER THIẾT BỊ (Có nút Sửa/Xóa) ---
loadSubData('devices', 'list-devices', (item, key) => `
    <div class="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 relative mb-3">
        <div class="flex justify-between items-start">
            <div class="flex-1" onclick="window.editDevice('${key}')">
                <b class="text-slate-800 text-lg">${item.name}</b>
                <p class="text-xs text-emerald-600 font-bold mt-1">S/N: ${item.serial || item.model || 'N/A'}</p>
            </div>
            <div class="flex gap-4">
                <button onclick="window.editDevice('${key}')" class="text-blue-500 text-lg p-2"><i class="fa-solid fa-pen"></i></button>
                <button onclick="window.deleteData('devices/${key}')" class="text-red-400 text-lg p-2"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
        <div class="mt-3 text-xs text-slate-400 border-t pt-3">IP: ${item.ip || '...'} | Pass: ${item.password || '...'}</div>
    </div>`);

// --- RENDER TÀI KHOẢN (Bổ sung nút Sửa) ---
loadSubData('accounts', 'list-accounts', (item, key) => `
    <div class="bg-white p-5 rounded-[2rem] border-l-[6px] border-blue-500 shadow-sm flex justify-between items-center mb-3">
        <div class="flex-1">
            <b class="text-slate-800">${item.title}</b>
            <p class="text-xs text-slate-500 mt-1">U: ${item.username} | P: ${item.password}</p>
        </div>
        <div class="flex gap-2">
            <button onclick="window.editAccount('${key}')" class="text-blue-500 text-lg p-2"><i class="fa-solid fa-pen"></i></button>
            <button onclick="window.deleteData('accounts/${key}')" class="text-red-300 text-lg p-2"><i class="fa-solid fa-trash-can"></i></button>
        </div>
    </div>`);

// --- RENDER SƠ ĐỒ (Bổ sung nút Sửa) ---
loadSubData('diagrams', 'list-diagrams', (item, key) => `
    <div class="bg-white p-4 rounded-[2rem] border border-purple-100 shadow-sm flex justify-between items-center mb-3">
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center text-lg"><i class="fa-solid fa-map-location-dot"></i></div>
            <b class="text-sm text-slate-700">${item.name}</b>
        </div>
        <div class="flex gap-3 items-center">
            <a href="${item.url}" target="_blank" class="text-blue-500 font-bold text-xs uppercase p-2">XEM</a>
            <button onclick="window.editDiagram('${key}')" class="text-emerald-500 text-lg p-2"><i class="fa-solid fa-pen"></i></button>
            <button onclick="window.deleteData('diagrams/${key}')" class="text-red-400 text-lg p-2"><i class="fa-solid fa-trash"></i></button>
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
// Sửa Thiết bị (Đã lược bỏ các trường không dùng để tránh lỗi null)
window.editDevice = async (id) => {
    editingDeviceId = id;
    try {
        const snap = await get(ref(db, `devices/${id}`));
        if (snap.exists()) {
            const dev = snap.val();
            document.getElementById('in-dev-name').value = dev.name || "";
            document.getElementById('in-dev-model').value = dev.serial || dev.model || "";
            document.getElementById('in-dev-ip').value = dev.ip || "";
            document.getElementById('in-dev-pass').value = dev.password || "";
            window.openModal('modal-add-device');
        }
    } catch (e) { alert("Lỗi tải dữ liệu!"); }
};

// Sửa Tài khoản
window.editAccount = async (id) => {
    editingAccountId = id; // Bạn nhớ khai báo thêm biến let editingAccountId ở đầu file
    try {
        const snap = await get(ref(db, `accounts/${id}`));
        if (snap.exists()) {
            const acc = snap.val();
            document.getElementById('in-acc-title').value = acc.title || "";
            document.getElementById('in-acc-app').value = acc.appName || acc.app || "";
            document.getElementById('in-acc-user').value = acc.username || acc.user || "";
            document.getElementById('in-acc-pass').value = acc.password || acc.pass || "";
            window.openModal('modal-add-account');
        }
    } catch (e) { alert("Lỗi tải dữ liệu!"); }
};

// Sửa Sơ đồ
window.editDiagram = async (id) => {
    editingDiagramId = id; // Khai báo biến này ở đầu file
    try {
        const snap = await get(ref(db, `diagrams/${id}`));
        if (snap.exists()) {
            const diag = snap.val();
            document.getElementById('in-diag-name').value = diag.name || "";
            document.getElementById('in-diag-url').value = diag.url || "";
            window.openModal('modal-add-diagram');
        }
    } catch (e) { alert("Lỗi tải dữ liệu!"); }
};
window.downloadQRCode = () => {
    const qrContainer = document.getElementById('qrcode');
    const canvas = qrContainer.querySelector('canvas');
    const img = qrContainer.querySelector('img');

    let imagePath = "";
    if (canvas) {
        imagePath = canvas.toDataURL("image/png");
    } else if (img) {
        imagePath = img.src;
    }

    if (!imagePath) return;

    const clientName = document.getElementById('det-name').innerText || "Khach_Hang";
    const link = document.createElement("a");
    link.href = imagePath;
    link.download = `QR_Homestech_${clientName.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
