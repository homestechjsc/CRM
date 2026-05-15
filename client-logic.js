import { db, ref, get, child } from './firebase-config.js';
import { onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// 1. Lấy ID khách hàng từ URL (?id=...)
const urlParams = new URLSearchParams(window.location.search);
const custId = urlParams.get('id');

if (custId) {
    loadClientData();
} else {
    console.error("Không tìm thấy ID khách hàng.");
    // Có thể hiển thị thông báo lỗi lên giao diện nếu cần
}

async function loadClientData() {
    // --- 1. TẢI THÔNG TIN KHÁCH HÀNG ---
    const snap = await get(child(ref(db), `customers/${custId}`));
    if (snap.exists()) {
        const cust = snap.val();
        document.getElementById('client-name').innerText = cust.name;
        document.getElementById('client-info').innerHTML = `
            <i class="fa-solid fa-phone"></i> ${cust.phone || 'Chưa cập nhật'} 
            <span class="mx-2 opacity-50">|</span> 
            <i class="fa-solid fa-location-dot"></i> ${cust.address || 'Đà Lạt'}`;
    }

    // --- 2. TẢI DANH SÁCH THIẾT BỊ ---
    onValue(ref(db, 'devices'), (snapshot) => {
        const container = document.getElementById('list-devices');
        container.innerHTML = ""; // Xóa dữ liệu cũ trước khi render
        
        snapshot.forEach(childSnapshot => {
            const item = childSnapshot.val();
            // Chỉ hiển thị thiết bị thuộc về khách hàng này
            if (item.customerId === custId) {
                container.innerHTML += `
                <div class="device-card shadow-sm flex items-center gap-4">
                    <div class="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-xl shadow-inner">
                        <i class="fa-solid ${getDeviceIcon(item.name)}"></i>
                    </div>
                    <div class="flex-1">
                        <h4 class="font-black text-slate-800 text-sm">${item.name}</h4>
                        <p class="text-[10px] text-slate-400 font-medium uppercase">SN: ${item.serial || item.model || 'N/A'}</p>
                        <div class="flex gap-3 mt-1">
                            <span class="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 rounded-md border border-emerald-100">IP: ${item.ip || '...'}</span>
                            <span class="text-[11px] text-slate-500 font-bold bg-slate-100 px-2 rounded-md">Pass: ${item.password || '...'}</span>
                        </div>
                    </div>
                </div>`;
            }
        });
    });

    // --- 3. TẢI TÀI KHOẢN TRUY CẬP ---
    onValue(ref(db, 'accounts'), (snapshot) => {
        const container = document.getElementById('list-accounts');
        container.innerHTML = "";
        
        snapshot.forEach(childSnapshot => {
            const item = childSnapshot.val();
            if (item.customerId === custId) {
                container.innerHTML += `
                <div class="bg-white p-4 rounded-[24px] border border-emerald-50 shadow-sm flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center">
                            <i class="fa-solid fa-user-shield"></i>
                        </div>
                        <div>
                            <b class="text-slate-700 text-sm block leading-none">${item.title}</b>
                            <span class="text-[10px] text-slate-400">${item.appName || 'Ứng dụng'}</span>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-[11px] font-bold text-slate-800">ID: ${item.username}</div>
                        <div class="text-[11px] text-emerald-600 font-bold">Pass: ${item.password}</div>
                    </div>
                </div>`;
            }
        });
    });

    // --- 4. TẢI SƠ ĐỒ HỆ THỐNG ---
    onValue(ref(db, 'diagrams'), (snapshot) => {
        const container = document.getElementById('list-diagrams');
        container.innerHTML = "";
        
        snapshot.forEach(childSnapshot => {
            const item = childSnapshot.val();
            if (item.customerId === custId) {
                container.innerHTML += `
                <a href="${item.url}" target="_blank" class="bg-emerald-600 p-4 rounded-[24px] flex flex-col items-center justify-center text-center gap-2 shadow-lg active:scale-95 transition-transform">
                    <i class="fa-solid fa-map-location-dot text-white text-xl"></i>
                    <span class="text-white text-[10px] font-black uppercase">${item.name}</span>
                </a>`;
            }
        });
    });
}

// Hàm bổ trợ: Tự động chọn icon dựa trên tên thiết bị
function getDeviceIcon(name) {
    const n = name.toLowerCase();
    if (n.includes('camera') || n.includes('cam')) return 'fa-video';
    if (n.includes('wifi') || n.includes('router') || n.includes('ap')) return 'fa-wifi';
    if (n.includes('switch') || n.includes('hub')) return 'fa-network-wired';
    if (n.includes('khoá') || n.includes('lock')) return 'fa-key';
    if (n.includes('đầu ghi') || n.includes('dvr') || n.includes('nvr')) return 'fa-hard-drive';
    return 'fa-box'; // Icon mặc định
}
