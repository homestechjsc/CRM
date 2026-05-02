<script>
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            // Đăng ký file sw.js để kích hoạt tính năng Offline và PWA
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('✅ HT CRM PWA: Sẵn sàng!'))
                .catch(err => console.error('❌ Lỗi đăng ký SW:', err));
        });
    }
    </script>
