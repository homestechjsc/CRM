import { db, ref, get, child } from './firebase-config.js';
import { onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const urlParams = new URLSearchParams(window.location.search);
const custId = urlParams.get('id');

if (custId) loadClientData();

async function loadClientData() {
    // 1. Tải thông tin khách hàng
    const snap = await get(child(ref(db), `customers/${custId}`));
    if (snap.exists()) {
        const cust = snap.val();
        document.getElementById('client-name').innerText = cust.name;
        document.getElementById('client-info').innerHTML = `
            <i class="fa-solid fa-phone"></i> ${cust.phone || ''} 
            <span class="mx-2">|</span> 
            <i class="fa-solid fa-location-dot"></i> ${cust.address || ''}`;
    }

    // Hàm tự động chọn icon dựa trên tên thiết bị
function getDeviceIcon(name) {
    const n = name.toLowerCase();
    if (n.includes('camera') || n.includes('cam')) return 'fa-video';
    if (n.includes('wifi') || n.includes('router') || n.includes('ap')) return 'fa-wifi';
    if (n.includes('switch') || n.includes('hub')) return 'fa-network-wired';
    if (n.includes('khoá') || n.includes('lock')) return 'fa-door-open';
    if (n.includes('công tắc') || n.includes('switch smart')) return 'fa-toggle-on';
    if (n.includes('loa') || n.includes('âm thanh') || n.includes('audio')) return 'fa-volume-high';
    if (n.includes('tổng đài') || n.includes('điện thoại')) return 'fa-phone-volume';
    if (n.includes('đèn') || n.includes('light')) return 'fa-lightbulb';
    return 'fa-microchip'; // Icon mặc định cho các thiết bị khác
}

// Trong phần render Thiết bị, hãy sửa dòng icon thành:
onValue(ref(db, 'devices'), (snapshot) => {
    const container = document.getElementById('list-devices');
    container.innerHTML = "";
    snapshot.forEach(child => {
        const item = child.val();
        if (item.customerId === custId) {
            const deviceIcon = getDeviceIcon(item.name); // Lấy icon động
            
            container.innerHTML += `
            <div class="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                <div class="flex items-center gap-4">
                    <!-- Icon thay đổi linh hoạt theo loại thiết bị -->
                    <div class="w-12 h-12 gradient-bg rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-200">
                        <i class="fa-solid ${deviceIcon}"></i>
                    </div>
                    <div class="flex-1">
                        <p class="text-[10px] font-black text-blue-600 uppercase tracking-tighter">${item.brand || 'Generic'}</p>
                        <h4 class="font-bold text-gray-800 text-lg leading-tight">${item.name}</h4>
                    </div>
                </div>

                    <!-- Thông tin lắp đặt & Bảo hành -->
                    <div class="flex justify-between items-center text-[11px] bg-gray-50 p-2 rounded-xl border border-dashed">
                        <span class="text-gray-500 font-medium"><i class="fa-solid fa-calendar-check mr-1"></i> Lắp: ${item.installDate || 'N/A'}</span>
                        <span class="text-blue-600 font-bold"><i class="fa-solid fa-shield-virus mr-1"></i> BH: ${item.warranty || 'N/A'}</span>
                    </div>

                    <!-- CHI TIẾT KỸ THUẬT -->
                    <div class="space-y-2 pt-2 border-t border-gray-100">
                        <div class="flex items-center justify-between text-[11px] font-mono bg-slate-50 p-2 rounded-lg">
                            <span class="text-gray-400">SERIAL (S/N):</span>
                            <span class="font-bold text-gray-800">${item.serial}</span>
                        </div>
                        <div class="grid grid-cols-1 gap-2">
                            <div class="flex items-center gap-2 text-xs">
                                <i class="fa-solid fa-network-wired text-blue-400 w-4"></i>
                                <span class="text-gray-500">IP:</span>
                                <span class="font-bold text-gray-800">${item.ip || 'N/A'}</span>
                            </div>
                            <div class="flex items-center gap-2 text-xs">
                                <i class="fa-solid fa-user-shield text-blue-400 w-4"></i>
                                <span class="text-gray-500">User:</span>
                                <span class="font-bold text-gray-800">${item.user || 'N/A'}</span>
                            </div>
                            <div class="flex items-center gap-2 text-xs">
                                <i class="fa-solid fa-key text-blue-400 w-4"></i>
                                <span class="text-gray-500">Pass:</span>
                                <span class="font-bold text-gray-800">${item.pass || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    ${item.imgUrl ? `
                        <a href="${item.imgUrl}" target="_blank" class="block w-full text-center text-[11px] font-bold text-blue-500 bg-blue-50 py-2 rounded-xl hover:bg-blue-100 transition-all">
                            <i class="fa-solid fa-image mr-1"></i> Xem ảnh sản phẩm / Sơ đồ
                        </a>
                    ` : ''}
                </div>`;
            }
        });
    });

    // 3. Render Tài khoản
    onValue(ref(db, 'accounts'), (snapshot) => {
        const container = document.getElementById('list-accounts');
        container.innerHTML = "";
        snapshot.forEach(child => {
            const item = child.val();
            if (item.customerId === custId) {
                container.innerHTML += `
                <div class="bg-white p-5 rounded-3xl border-l-[6px] border-blue-500 shadow-sm">
                    <div class="flex justify-between items-start">
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-black uppercase">${item.appName || 'App'}</span>
                            <h4 class="font-bold text-gray-800 text-sm">${item.title}</h4>
                        </div>
                    </div>
                    <div class="mt-3 space-y-1">
                        <div class="flex items-center gap-2 text-xs">
                            <i class="fa-solid fa-user text-gray-300 w-4"></i>
                            <span class="text-gray-500">User:</span>
                            <span class="font-bold text-gray-800">${item.username}</span>
                        </div>
                        <div class="flex items-center gap-2 text-xs">
                            <i class="fa-solid fa-lock text-gray-300 w-4"></i>
                            <span class="text-gray-500">Pass:</span>
                            <span class="font-bold text-gray-800">${item.password}</span>
                        </div>
                        ${item.note ? `<p class="text-[10px] text-gray-400 italic mt-2 border-t pt-1">${item.note}</p>` : ''}
                    </div>
                </div>`;
            }
        });
    });

    // 4. Render Sơ đồ
    onValue(ref(db, 'diagrams'), (snapshot) => {
        const container = document.getElementById('list-diagrams');
        container.innerHTML = "";
        snapshot.forEach(child => {
            const item = child.val();
            if (item.customerId === custId) {
                container.innerHTML += `
                <a href="${item.url}" target="_blank" class="bg-white p-4 rounded-3xl border border-purple-100 flex items-center justify-between shadow-sm hover:bg-purple-50 transition-all">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center text-lg shadow-sm">
                            <i class="fa-solid fa-map-location-dot"></i>
                        </div>
                        <b class="text-gray-700 text-sm">${item.name}</b>
                    </div>
                    <i class="fa-solid fa-chevron-right text-gray-300"></i>
                </a>`;
            }
        });
    });
}