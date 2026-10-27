// Frontend logic with Strict PIN Authentication & Role-Based Access Control

let currentUser = null; // Will be set after PIN login
let currentVideos = [];
let publicUsersList = [];
let currentStats = null;
let currentTab = 'archive';
let currentView = 'table';
let activePlayingVideo = null;

// Helpers
function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
    } catch {
        return dateStr;
    }
}

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) {
        return (mb / 1024).toFixed(2) + ' GB';
    }
    return mb.toFixed(1) + ' MB';
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');

    toastMessage.textContent = message;
    toast.className = 'fixed bottom-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-white transform transition-all duration-300';
    
    if (type === 'success') {
        toast.classList.add('bg-emerald-600');
        toastIcon.className = 'fa-solid fa-circle-check text-xl';
    } else if (type === 'error') {
        toast.classList.add('bg-rose-600');
        toastIcon.className = 'fa-solid fa-circle-xmark text-xl';
    } else {
        toast.classList.add('bg-blue-600');
        toastIcon.className = 'fa-solid fa-circle-info text-xl';
    }

    toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
    }, 3200);
}

// ================= AUTHENTICATION & LOGIN SCREEN =================

// 1. Khởi động kiểm tra phiên đăng nhập
async function checkAuthOnLoad() {
    await loadPublicUsersList();

    const savedUser = localStorage.getItem('app_auth_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            // Ẩn màn hình đăng nhập và vào thẳng giao diện
            document.getElementById('login-overlay').classList.add('hidden');
            applyRoleUI();
            loadStats();
            loadVideos();
            return;
        } catch {
            currentUser = null;
        }
    }

    // Chưa đăng nhập: Hiện màn hình khóa bắt buộc
    document.getElementById('login-overlay').classList.remove('hidden');
}

// 2. Tải danh sách người dùng cho dropdown đăng nhập
async function loadPublicUsersList() {
    try {
        const res = await fetch('/api/auth/users-list');
        publicUsersList = await res.json();

        const select = document.getElementById('login-user-select');
        let html = '<option value="">-- Chọn tài khoản của bạn --</option>';

        publicUsersList.forEach(u => {
            let roleIcon = '🎬';
            let roleText = 'Nhân viên dựng';
            if (u.role === 'admin') { roleIcon = '👑'; roleText = 'Quản trị viên'; }
            if (u.role === 'boss') { roleIcon = '👔'; roleText = 'Sếp (Chỉ xem)'; }

            html += `<option value="${u.id}">${roleIcon} ${u.name} (${roleText})</option>`;
        });

        select.innerHTML = html;

        // Cập nhật filter creator
        const creatorFilter = document.getElementById('filter-creator');
        const formCreator = document.getElementById('form-creator');

        let filterHtml = '<option value="all">Tất cả người dựng</option>';
        let formHtml = '<option value="">-- Chọn người dựng --</option>';

        publicUsersList.filter(u => u.role !== 'boss').forEach(u => {
            filterHtml += `<option value="${u.name}">${u.name}</option>`;
            formHtml += `<option value="${u.name}">${u.name}</option>`;
        });

        if (creatorFilter) creatorFilter.innerHTML = filterHtml;
        if (formCreator) formCreator.innerHTML = formHtml;
    } catch (err) {
        console.error("Lỗi tải danh sách người dùng:", err);
    }
}

// 3. Xử lý Đăng Nhập bằng Mã PIN
async function handleUserLogin(e) {
    e.preventDefault();
    const select = document.getElementById('login-user-select');
    const pinInput = document.getElementById('login-pin-input');
    const errorMsg = document.getElementById('login-error-msg');
    const errorText = document.getElementById('login-error-text');
    const submitBtn = document.getElementById('btn-login-submit');

    const userId = select.value;
    const pin = pinInput.value.trim();

    if (!userId) {
        alert('Vui lòng chọn tài khoản của bạn!');
        return;
    }

    if (!pin) {
        alert('Vui lòng nhập mã PIN bí mật của bạn!');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Đang xác thực...';

    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('pin', pin);

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            body: formData
        });

        submitBtn.disabled = false;
        submitBtn.innerHTML = 'ĐĂNG NHẬP VÀO PHẦN MỀM <i class="fa-solid fa-arrow-right ml-1"></i>';

        if (res.ok) {
            const data = await res.json();
            currentUser = data.user;
            localStorage.setItem('app_auth_user', JSON.stringify(currentUser));

            errorMsg.classList.add('hidden');
            pinInput.value = '';
            
            // Ẩn màn hình khóa và hiển thị ứng dụng
            document.getElementById('login-overlay').classList.add('hidden');
            applyRoleUI();
            showToast(data.message || 'Đăng nhập thành công!', 'success');
            
            loadStats();
            loadVideos();
        } else {
            const err = await res.json();
            errorText.textContent = err.detail || 'Mã PIN không chính xác!';
            errorMsg.classList.remove('hidden');
            pinInput.focus();
        }
    } catch {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'ĐĂNG NHẬP VÀO PHẦN MỀM <i class="fa-solid fa-arrow-right ml-1"></i>';
        alert('Lỗi kết nối máy chủ khi đăng nhập!');
    }
}

// 4. Bật/Tắt ẩn hiện mã PIN
function togglePinVisibility() {
    const input = document.getElementById('login-pin-input');
    const text = document.getElementById('pin-toggle-text');
    if (input.type === 'password') {
        input.type = 'text';
        text.textContent = 'Ẩn số';
    } else {
        input.type = 'password';
        text.textContent = 'Hiện số';
    }
}

// 5. Đăng xuất khỏi hệ thống
function handleLogout() {
    if (!confirm('Bạn có chắc chắn muốn đăng xuất khỏi phần mềm?')) return;

    localStorage.removeItem('app_auth_user');
    currentUser = null;
    document.getElementById('login-pin-input').value = '';
    document.getElementById('login-error-msg').classList.add('hidden');
    document.getElementById('login-overlay').classList.remove('hidden');
    showToast('Đã đăng xuất thành công', 'info');
}

// 6. Áp dụng giao diện theo Phân Quyền
function applyRoleUI() {
    if (!currentUser) return;

    const nameEl = document.getElementById('current-user-name');
    const roleEl = document.getElementById('current-user-role-label');
    const avatarBadge = document.getElementById('user-avatar-badge');
    const roleHeaderPill = document.getElementById('role-header-pill');
    const btnAdminMembers = document.getElementById('btn-admin-members');
    const btnAddVideo = document.getElementById('btn-add-video');
    const bannerBoss = document.getElementById('banner-boss-notice');
    const thActions = document.getElementById('th-actions');
    const roleHintText = document.getElementById('role-hint-text');

    nameEl.textContent = currentUser.name;

    if (currentUser.role === 'admin') {
        // TƯỜNG VY ADMIN
        roleEl.textContent = 'Quản trị viên tối cao';
        roleEl.className = 'text-[10px] text-purple-700 font-black mt-0.5';
        avatarBadge.className = 'w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-sm';
        avatarBadge.innerHTML = '<i class="fa-solid fa-crown text-[11px]"></i>';
        roleHeaderPill.textContent = 'Tường Vy Admin (Toàn quyền)';
        roleHeaderPill.className = 'text-[11px] font-black px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800';

        btnAdminMembers.classList.remove('hidden');
        btnAddVideo.classList.remove('hidden');
        bannerBoss.classList.add('hidden');
        if (thActions) thActions.classList.remove('hidden');
        if (roleHintText) roleHintText.textContent = '* Tường Vy có toàn quyền quản trị, cấp mã PIN và xóa video';
    } 
    else if (currentUser.role === 'boss') {
        // SẾP (CHỈ XEM)
        roleEl.textContent = 'Sếp (Chế độ xem video)';
        roleEl.className = 'text-[10px] text-blue-700 font-bold mt-0.5';
        avatarBadge.className = 'w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm';
        avatarBadge.innerHTML = '<i class="fa-solid fa-user-tie text-[11px]"></i>';
        roleHeaderPill.textContent = 'Chế độ Sếp (Chỉ xem)';
        roleHeaderPill.className = 'text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800';

        btnAdminMembers.classList.add('hidden');
        btnAddVideo.classList.add('hidden');
        bannerBoss.classList.remove('hidden');
        if (thActions) thActions.classList.add('hidden');
        if (roleHintText) roleHintText.textContent = '* Sếp đang xem video ở chế độ an toàn (Chỉ xem, không sửa/xóa)';
    } 
    else {
        // NHÂN VIÊN DỰNG (EDITOR)
        roleEl.textContent = 'Nhân viên dựng video';
        roleEl.className = 'text-[10px] text-slate-600 font-bold mt-0.5';
        avatarBadge.className = 'w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-xs shadow-sm';
        avatarBadge.innerHTML = '<i class="fa-solid fa-user-pen text-[11px]"></i>';
        roleHeaderPill.textContent = 'Nhân viên dựng video';
        roleHeaderPill.className = 'text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700';

        btnAdminMembers.classList.add('hidden');
        btnAddVideo.classList.remove('hidden');
        bannerBoss.classList.add('hidden');
        if (thActions) thActions.classList.remove('hidden');
        if (roleHintText) roleHintText.textContent = '* Nhân viên có thể thêm video và cập nhật tình trạng đăng kênh';
    }
}

// ================= DỮ LIỆU & TAB =================

async function loadStats() {
    try {
        const res = await fetch('/api/stats');
        currentStats = await res.json();
        
        document.getElementById('badge-tab-archive').textContent = currentStats.archive_count;
        document.getElementById('badge-tab-tiktok').textContent = currentStats.tiktok_count;
        document.getElementById('badge-tab-facebook').textContent = currentStats.facebook_count;
        document.getElementById('badge-tab-youtube').textContent = currentStats.youtube_count;
        document.getElementById('badge-tab-all').textContent = currentStats.total_videos;

        document.getElementById('stat-total-videos').textContent = currentStats.total_videos;
        document.getElementById('stat-archive').textContent = currentStats.archive_count;
        document.getElementById('stat-published').textContent = currentStats.total_published;
        document.getElementById('stat-today-videos').textContent = currentStats.today_videos;
    } catch (err) {
        console.error("Lỗi tải thống kê:", err);
    }
}

async function loadVideos() {
    try {
        const search = document.getElementById('filter-search').value.trim();
        const creator = document.getElementById('filter-creator').value;
        const dateFrom = document.getElementById('filter-date-from').value;
        const dateTo = document.getElementById('filter-date-to').value;

        const params = new URLSearchParams();
        params.append('tab', currentTab);
        if (search) params.append('search', search);
        if (creator && creator !== 'all') params.append('creator', creator);
        if (dateFrom) params.append('date_from', dateFrom);
        if (dateTo) params.append('date_to', dateTo);

        const res = await fetch(`/api/videos?${params.toString()}`);
        currentVideos = await res.json();

        document.getElementById('video-count-badge').textContent = `${currentVideos.length} video`;

        if (currentView === 'table') {
            renderVideosTable();
        } else {
            renderVideosGrid();
        }
    } catch (err) {
        console.error("Lỗi tải danh sách video:", err);
    }
}

function switchTab(tab) {
    currentTab = tab;

    const tabs = ['archive', 'tiktok', 'facebook', 'youtube', 'all'];
    tabs.forEach(t => {
        const tabBtn = document.getElementById(`tab-${t}`);
        if (!tabBtn) return;
        if (t === tab) {
            tabBtn.className = "flex items-center gap-2 px-5 py-3.5 border-b-2 border-blue-600 font-bold text-sm text-blue-600 bg-blue-50/50 transition-all whitespace-nowrap";
        } else {
            tabBtn.className = "flex items-center gap-2 px-5 py-3.5 border-b-2 border-transparent font-medium text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all whitespace-nowrap";
        }
    });

    const titles = {
        'archive': '📁 KHO LƯU TRỮ (CÁC VIDEO CHƯA ĐĂNG)',
        'tiktok': '🎵 DANH SÁCH VIDEO ĐÃ ĐĂNG KÊNH TIKTOK',
        'facebook': '📘 DANH SÁCH VIDEO ĐÃ ĐĂNG KÊNH FACEBOOK',
        'youtube': '▶️ DANH SÁCH VIDEO ĐÃ ĐĂNG KÊNH YOUTUBE',
        'all': '🎬 TẤT CẢ VIDEO TRONG HỆ THỐNG'
    };
    document.getElementById('current-tab-title').textContent = titles[tab] || 'DANH SÁCH VIDEO';

    loadVideos();
}

// Render Table View (Với Phân Quyền)
function renderVideosTable() {
    const container = document.getElementById('table-view-container');
    const tbody = document.getElementById('videos-table-body');
    const emptyState = document.getElementById('empty-state');
    const thActions = document.getElementById('th-actions');

    document.getElementById('grid-view-container').classList.add('hidden');
    container.classList.remove('hidden');

    const isBoss = currentUser && currentUser.role === 'boss';
    const isAdmin = currentUser && currentUser.role === 'admin';

    if (isBoss && thActions) thActions.classList.add('hidden');
    else if (thActions) thActions.classList.remove('hidden');

    if (!currentVideos || currentVideos.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    let html = '';
    currentVideos.forEach((v, index) => {
        const hasVideo = !!v.video_filename;
        const videoBtn = hasVideo 
            ? `<button onclick="openVideoPlayer(${v.id})" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-sm transition-all">
                <i class="fa-solid fa-play"></i> Xem video
               </button>`
            : `<span class="text-xs text-slate-400 italic">Chưa có video</span>`;

        const isTiktok = !!v.posted_tiktok;
        const isFacebook = !!v.posted_facebook;
        const isYoutube = !!v.posted_youtube;
        const isPublished = isTiktok || isFacebook || isYoutube;

        let channelsHtml = '';
        if (isBoss) {
            channelsHtml = `
                <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${isTiktok ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}">
                        <i class="fa-brands fa-tiktok"></i> TikTok ${isTiktok ? '✅' : ''}
                    </span>
                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${isFacebook ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}">
                        <i class="fa-brands fa-facebook"></i> Facebook ${isFacebook ? '✅' : ''}
                    </span>
                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${isYoutube ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-400'}">
                        <i class="fa-brands fa-youtube"></i> YouTube ${isYoutube ? '✅' : ''}
                    </span>
                </div>
            `;
        } else {
            channelsHtml = `
                <div class="flex items-center gap-1.5 flex-wrap">
                    <button onclick="quickToggleChannel(${v.id}, 'tiktok')" title="Bấm để bật/tắt đăng TikTok" 
                        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${isTiktok ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}">
                        <i class="fa-brands fa-tiktok ${isTiktok ? 'text-pink-400' : ''}"></i> TikTok
                        ${isTiktok ? '<i class="fa-solid fa-check text-[10px] ml-0.5 text-emerald-400"></i>' : ''}
                    </button>
                    <button onclick="quickToggleChannel(${v.id}, 'facebook')" title="Bấm để bật/tắt đăng Facebook" 
                        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${isFacebook ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}">
                        <i class="fa-brands fa-facebook"></i> Facebook
                        ${isFacebook ? '<i class="fa-solid fa-check text-[10px] ml-0.5 text-emerald-300"></i>' : ''}
                    </button>
                    <button onclick="quickToggleChannel(${v.id}, 'youtube')" title="Bấm để bật/tắt đăng YouTube" 
                        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${isYoutube ? 'bg-red-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}">
                        <i class="fa-brands fa-youtube"></i> YouTube
                        ${isYoutube ? '<i class="fa-solid fa-check text-[10px] ml-0.5 text-emerald-300"></i>' : ''}
                    </button>
                </div>
            `;
        }

        const statusBadge = isPublished
            ? `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <i class="fa-solid fa-circle-check text-emerald-500"></i> Đã Đăng
               </span>`
            : `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <i class="fa-solid fa-box-archive text-amber-500"></i> Lưu Trữ
               </span>`;

        let actionsTd = '';
        if (!isBoss) {
            const deleteBtn = isAdmin ? `
                <button onclick="confirmDeleteVideo(${v.id})" class="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Chỉ Tường Vy có quyền xóa">
                    <i class="fa-regular fa-trash-can"></i>
                </button>
            ` : '';

            actionsTd = `
                <td class="px-5 py-4 text-right whitespace-nowrap">
                    <div class="flex items-center justify-end gap-1.5">
                        <button onclick="openEditModal(${v.id})" class="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Chỉnh sửa">
                            <i class="fa-regular fa-pen-to-square"></i>
                        </button>
                        ${deleteBtn}
                    </div>
                </td>
            `;
        }

        html += `
            <tr class="hover:bg-purple-50/20 transition-colors border-b border-slate-100 group">
                <td class="px-5 py-4 text-center text-xs font-semibold text-slate-400">${index + 1}</td>
                <td class="px-5 py-4 text-xs text-slate-700 font-medium whitespace-nowrap">
                    <div class="font-bold text-slate-900">${formatDate(v.created_date)}</div>
                    ${v.published_date && isPublished ? `<div class="text-[11px] text-emerald-600 mt-0.5">Đăng: ${formatDate(v.published_date)}</div>` : '<div class="text-[11px] text-slate-400 mt-0.5">Chưa đăng</div>'}
                </td>
                <td class="px-5 py-4">
                    <div class="font-bold text-slate-900 text-sm hover:text-blue-600 cursor-pointer flex items-center gap-2" onclick="${hasVideo ? `openVideoPlayer(${v.id})` : (!isBoss ? `openEditModal(${v.id})` : '')}">
                        <span>${v.title}</span>
                    </div>
                    ${v.description ? `<div class="text-xs text-slate-500 mt-1 line-clamp-1">${v.description}</div>` : ''}
                </td>
                <td class="px-5 py-4 whitespace-nowrap">
                    <div class="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                        <i class="fa-solid fa-user-pen text-blue-600"></i> ${v.creator || 'Chưa rõ'}
                    </div>
                </td>
                <td class="px-5 py-4 whitespace-nowrap">
                    ${statusBadge}
                </td>
                <td class="px-5 py-4">
                    ${channelsHtml}
                </td>
                <td class="px-5 py-4 text-center whitespace-nowrap">
                    ${videoBtn}
                </td>
                ${actionsTd}
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// Render Grid View
function renderVideosGrid() {
    const container = document.getElementById('grid-view-container');
    const emptyState = document.getElementById('empty-state');

    document.getElementById('table-view-container').classList.add('hidden');
    container.classList.remove('hidden');

    const isBoss = currentUser && currentUser.role === 'boss';
    const isAdmin = currentUser && currentUser.role === 'admin';

    if (!currentVideos || currentVideos.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    let html = '';
    currentVideos.forEach(v => {
        const hasVideo = !!v.video_filename;
        const isTiktok = !!v.posted_tiktok;
        const isFacebook = !!v.posted_facebook;
        const isYoutube = !!v.posted_youtube;
        const isPublished = isTiktok || isFacebook || isYoutube;

        let channelButtons = '';
        if (isBoss) {
            channelButtons = `
                <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="px-2.5 py-1 rounded-md text-xs font-semibold ${isTiktok ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}">TikTok ${isTiktok ? '✅' : ''}</span>
                    <span class="px-2.5 py-1 rounded-md text-xs font-semibold ${isFacebook ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}">Facebook ${isFacebook ? '✅' : ''}</span>
                    <span class="px-2.5 py-1 rounded-md text-xs font-semibold ${isYoutube ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-400'}">YouTube ${isYoutube ? '✅' : ''}</span>
                </div>
            `;
        } else {
            channelButtons = `
                <div class="flex items-center gap-1.5 flex-wrap">
                    <button onclick="quickToggleChannel(${v.id}, 'tiktok')" class="px-2.5 py-1 rounded-md text-xs font-semibold ${isTiktok ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}">
                        <i class="fa-brands fa-tiktok"></i> TikTok
                    </button>
                    <button onclick="quickToggleChannel(${v.id}, 'facebook')" class="px-2.5 py-1 rounded-md text-xs font-semibold ${isFacebook ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}">
                        <i class="fa-brands fa-facebook"></i> Facebook
                    </button>
                    <button onclick="quickToggleChannel(${v.id}, 'youtube')" class="px-2.5 py-1 rounded-md text-xs font-semibold ${isYoutube ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-400'}">
                        <i class="fa-brands fa-youtube"></i> YouTube
                    </button>
                </div>
            `;
        }

        let footerActions = '';
        if (isBoss) {
            footerActions = hasVideo ? `
                <button onclick="openVideoPlayer(${v.id})" class="w-full py-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm">
                    <i class="fa-solid fa-play"></i> Thưởng thức Video
                </button>
            ` : '<span class="text-xs text-slate-400 italic">Chưa có video đính kèm</span>';
        } else {
            const deleteBtn = isAdmin ? `
                <button onclick="confirmDeleteVideo(${v.id})" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg">
                    <i class="fa-regular fa-trash-can"></i>
                </button>
            ` : '';

            footerActions = `
                <div class="flex items-center justify-between w-full">
                    ${hasVideo ? `
                        <button onclick="openVideoPlayer(${v.id})" class="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                            <i class="fa-solid fa-play"></i> Xem video
                        </button>
                    ` : `
                        <button onclick="openEditModal(${v.id})" class="text-xs font-semibold text-slate-500 hover:text-blue-600 flex items-center gap-1">
                            <i class="fa-solid fa-cloud-arrow-up"></i> Upload
                        </button>
                    `}

                    <div class="flex items-center gap-1">
                        <button onclick="openEditModal(${v.id})" class="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg">
                            <i class="fa-regular fa-pen-to-square"></i>
                        </button>
                        ${deleteBtn}
                    </div>
                </div>
            `;
        }

        html += `
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all flex flex-col group">
                <div class="relative bg-slate-950 h-52 flex items-center justify-center cursor-pointer overflow-hidden" onclick="${hasVideo ? `openVideoPlayer(${v.id})` : (!isBoss ? `openEditModal(${v.id})` : '')}">
                    ${hasVideo ? `
                        <video class="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300" preload="metadata">
                            <source src="/videos/stream/${v.video_filename}#t=0.5" type="video/mp4">
                        </video>
                        <div class="absolute inset-0 bg-black/25 flex items-center justify-center group-hover:bg-black/10 transition-colors">
                            <div class="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xl transform group-hover:scale-110 transition-transform">
                                <i class="fa-solid fa-play text-xl ml-0.5"></i>
                            </div>
                        </div>
                        <span class="absolute bottom-2.5 right-2.5 bg-black/75 text-white text-[11px] px-2 py-0.5 rounded-md font-mono">
                            ${formatFileSize(v.file_size)}
                        </span>
                    ` : `
                        <div class="text-center text-slate-400 p-4">
                            <i class="fa-solid fa-film text-4xl mb-2 text-slate-600"></i>
                            <p class="text-xs font-semibold">Chưa có video</p>
                        </div>
                    `}

                    <div class="absolute top-2.5 left-2.5">
                        ${isPublished ? 
                            '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-md flex items-center gap-1"><i class="fa-solid fa-check"></i> Đã đăng</span>' : 
                            '<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-md flex items-center gap-1"><i class="fa-solid fa-box-archive"></i> Kho lưu trữ</span>'
                        }
                    </div>
                </div>

                <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                        <div class="flex items-center justify-between text-xs text-slate-500 mb-2">
                            <span class="flex items-center gap-1 font-medium"><i class="fa-regular fa-calendar"></i> ${formatDate(v.created_date)}</span>
                            <span class="font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-md"><i class="fa-solid fa-user-pen text-blue-600 mr-1"></i>${v.creator}</span>
                        </div>

                        <h4 class="font-bold text-slate-900 text-sm line-clamp-2 hover:text-blue-600 cursor-pointer" onclick="${hasVideo ? `openVideoPlayer(${v.id})` : (!isBoss ? `openEditModal(${v.id})` : '')}">
                            ${v.title}
                        </h4>
                        ${v.description ? `<p class="text-xs text-slate-500 mt-1 line-clamp-2">${v.description}</p>` : ''}
                    </div>

                    <div class="pt-3 border-t border-slate-100 space-y-2">
                        <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kênh đăng:</div>
                        ${channelButtons}
                    </div>

                    <div class="pt-3 border-t border-slate-100">
                        ${footerActions}
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// 1-Click Toggle Channel
async function quickToggleChannel(id, channel) {
    if (currentUser.role === 'boss') {
        showToast('Sếp chỉ có quyền xem, không được đổi trạng thái kênh!', 'error');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('channel', channel);

        const res = await fetch(`/api/videos/${id}/toggle-channel`, {
            method: 'POST',
            headers: {
                'Current-User-Role': currentUser.role
            },
            body: formData
        });

        if (res.ok) {
            const data = await res.json();
            showToast('Đã cập nhật kênh đăng thành công!', 'success');
            loadVideos();
            loadStats();

            if (activePlayingVideo && activePlayingVideo.id === id) {
                updatePlayerChannelCheckboxes(data.data);
            }
        } else {
            const err = await res.json();
            showToast(err.detail || 'Lỗi khi cập nhật trạng thái kênh', 'error');
        }
    } catch {
        showToast('Lỗi kết nối máy chủ', 'error');
    }
}

function setView(view) {
    currentView = view;
    document.getElementById('btn-view-table').className = view === 'table' ? 'px-3 py-1.5 rounded-lg text-xs font-bold bg-white shadow-sm text-blue-600' : 'px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900';
    document.getElementById('btn-view-grid').className = view === 'grid' ? 'px-3 py-1.5 rounded-lg text-xs font-bold bg-white shadow-sm text-blue-600' : 'px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900';

    if (view === 'table') renderVideosTable();
    else renderVideosGrid();
}

function setDateFilter(range) {
    const today = new Date();
    const formatDateInput = (d) => d.toISOString().split('T')[0];

    const dateFromInput = document.getElementById('filter-date-from');
    const dateToInput = document.getElementById('filter-date-to');

    if (range === 'today') {
        const str = formatDateInput(today);
        dateFromInput.value = str;
        dateToInput.value = str;
    } else if (range === 'yesterday') {
        const y = new Date();
        y.setDate(today.getDate() - 1);
        const str = formatDateInput(y);
        dateFromInput.value = str;
        dateToInput.value = str;
    } else if (range === '7days') {
        const past = new Date();
        past.setDate(today.getDate() - 7);
        dateFromInput.value = formatDateInput(past);
        dateToInput.value = formatDateInput(today);
    } else if (range === 'this_month') {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        dateFromInput.value = formatDateInput(firstDay);
        dateToInput.value = formatDateInput(today);
    } else if (range === 'all') {
        dateFromInput.value = '';
        dateToInput.value = '';
    }

    loadVideos();
}

function resetFilters() {
    document.getElementById('filter-search').value = '';
    document.getElementById('filter-creator').value = 'all';
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    loadVideos();
}

// Modal Create / Edit
function openCreateModal() {
    if (currentUser.role === 'boss') {
        showToast('Sếp chỉ có quyền xem video, không được thêm video mới!', 'error');
        return;
    }

    document.getElementById('modal-title').textContent = 'Thêm Video Mới';
    document.getElementById('video-form').reset();
    document.getElementById('form-video-id').value = '';
    
    document.getElementById('form-created-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('video-preview-info').innerHTML = '';
    document.getElementById('file-selected-name').innerHTML = '';
    document.getElementById('upload-progress-container').classList.add('hidden');
    
    if (currentUser.role === 'editor') {
        document.getElementById('form-creator').value = currentUser.name;
    }

    document.getElementById('check-tiktok').checked = false;
    document.getElementById('check-facebook').checked = false;
    document.getElementById('check-youtube').checked = false;
    onChannelCheckboxChange();

    document.getElementById('modal-video').classList.remove('hidden');
}

async function openEditModal(id) {
    if (currentUser.role === 'boss') {
        showToast('Sếp chỉ có quyền xem video, không được chỉnh sửa video!', 'error');
        return;
    }

    try {
        const res = await fetch(`/api/videos/${id}`);
        const v = await res.json();

        document.getElementById('modal-title').textContent = 'Chỉnh Sửa Video';
        document.getElementById('form-video-id').value = v.id;
        document.getElementById('form-title').value = v.title || '';
        document.getElementById('form-desc').value = v.description || '';
        document.getElementById('form-creator').value = v.creator || '';
        document.getElementById('form-created-date').value = v.created_date || '';
        document.getElementById('form-published-date').value = v.published_date || '';

        document.getElementById('check-tiktok').checked = !!v.posted_tiktok;
        document.getElementById('check-facebook').checked = !!v.posted_facebook;
        document.getElementById('check-youtube').checked = !!v.posted_youtube;
        onChannelCheckboxChange();

        const previewInfo = document.getElementById('video-preview-info');
        if (v.video_filename) {
            previewInfo.innerHTML = `
                <div class="flex items-center justify-between text-xs bg-blue-50 border border-blue-200 p-3 rounded-xl text-blue-900">
                    <span class="flex items-center gap-2"><i class="fa-solid fa-file-video text-blue-600 text-base"></i> Video hiện tại: <strong>${v.original_filename || v.video_filename}</strong> (${formatFileSize(v.file_size)})</span>
                    <button type="button" onclick="openVideoPlayer(${v.id})" class="text-blue-700 hover:underline font-bold">Xem thử</button>
                </div>
            `;
        } else {
            previewInfo.innerHTML = '<span class="text-xs text-slate-400 italic">Chưa có file video nào được tải lên.</span>';
        }

        document.getElementById('file-selected-name').innerHTML = '';
        document.getElementById('upload-progress-container').classList.add('hidden');
        document.getElementById('modal-video').classList.remove('hidden');
    } catch (err) {
        showToast('Không thể tải thông tin video', 'error');
    }
}

function onChannelCheckboxChange() {
    const isTiktok = document.getElementById('check-tiktok').checked;
    const isFacebook = document.getElementById('check-facebook').checked;
    const isYoutube = document.getElementById('check-youtube').checked;
    const isAny = isTiktok || isFacebook || isYoutube;

    const pubDateContainer = document.getElementById('published-date-container');
    const storageNotice = document.getElementById('storage-status-notice');

    if (isAny) {
        pubDateContainer.classList.remove('hidden');
        if (!document.getElementById('form-published-date').value) {
            document.getElementById('form-published-date').value = new Date().toISOString().split('T')[0];
        }
        storageNotice.innerHTML = `
            <div class="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex items-center gap-2">
                <i class="fa-solid fa-circle-check text-emerald-600"></i> Video này sẽ được xếp vào mục: <strong>ĐÃ ĐĂNG</strong> (kênh đã chọn).
            </div>
        `;
    } else {
        pubDateContainer.classList.add('hidden');
        storageNotice.innerHTML = `
            <div class="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 p-2.5 rounded-xl flex items-center gap-2">
                <i class="fa-solid fa-box-archive text-amber-600"></i> Video này sẽ được xếp vào: <strong>KHO LƯU TRỮ (Chưa đăng)</strong>.
            </div>
        `;
    }
}

function closeVideoModal() {
    document.getElementById('modal-video').classList.add('hidden');
}

// Submit Form
async function submitVideoForm(e) {
    e.preventDefault();
    if (currentUser.role === 'boss') {
        showToast('Sếp chỉ có quyền xem video!', 'error');
        return;
    }

    const id = document.getElementById('form-video-id').value;
    const isEdit = !!id;

    const form = document.getElementById('video-form');
    const formData = new FormData(form);

    formData.set('posted_tiktok', document.getElementById('check-tiktok').checked ? '1' : '0');
    formData.set('posted_facebook', document.getElementById('check-facebook').checked ? '1' : '0');
    formData.set('posted_youtube', document.getElementById('check-youtube').checked ? '1' : '0');

    const submitBtn = document.getElementById('btn-save-video');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Đang lưu...';

    const progressBar = document.getElementById('upload-progress-bar');
    const progressText = document.getElementById('upload-progress-text');
    const progressContainer = document.getElementById('upload-progress-container');

    const fileInput = document.getElementById('form-video-file');
    if (fileInput.files.length > 0) {
        progressContainer.classList.remove('hidden');
    }

    const url = isEdit ? `/api/videos/${id}/update` : '/api/videos';

    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Current-User-Role', currentUser.role);

    xhr.upload.onprogress = function(event) {
        if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            progressBar.style.width = percent + '%';
            progressText.textContent = `Đang tải video: ${percent}% (${formatFileSize(event.loaded)} / ${formatFileSize(event.total)})`;
        }
    };

    xhr.onload = function() {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;

        if (xhr.status >= 200 && xhr.status < 300) {
            showToast(isEdit ? 'Đã cập nhật video thành công!' : 'Đã thêm video thành công!', 'success');
            closeVideoModal();
            loadVideos();
            loadStats();
        } else {
            showToast('Lỗi khi lưu video. Vui lòng kiểm tra quyền hạn!', 'error');
        }
    };

    xhr.onerror = function() {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        showToast('Lỗi kết nối khi tải video!', 'error');
    };

    xhr.send(formData);
}

// Delete Video (CHỈ TƯỜNG VY MỚI ĐƯỢC XÓA)
async function confirmDeleteVideo(id) {
    if (currentUser.role !== 'admin') {
        showToast('Chỉ có Tường Vy (Quản trị viên) mới có quyền xóa video!', 'error');
        return;
    }

    if (!confirm('Tường Vy ơi, bạn có chắc chắn muốn xóa vĩnh viễn video này khỏi hệ thống?')) {
        return;
    }

    try {
        const res = await fetch(`/api/videos/${id}`, {
            method: 'DELETE',
            headers: {
                'Current-User-Role': currentUser.role
            }
        });

        if (res.ok) {
            showToast('Tường Vy đã xóa video thành công!', 'success');
            loadVideos();
            loadStats();
        } else {
            const err = await res.json();
            showToast(err.detail || 'Lỗi khi xóa video', 'error');
        }
    } catch {
        showToast('Lỗi kết nối', 'error');
    }
}

// Video Player Modal (Theater Mode)
async function openVideoPlayer(id) {
    try {
        const res = await fetch(`/api/videos/${id}`);
        const v = await res.json();
        activePlayingVideo = v;

        document.getElementById('player-modal-title').textContent = v.title;
        document.getElementById('player-created-date').textContent = formatDate(v.created_date);
        document.getElementById('player-creator').textContent = v.creator || 'Chưa rõ';

        const playerDesc = document.getElementById('player-description');
        if (v.description) {
            playerDesc.textContent = v.description;
            playerDesc.classList.remove('hidden');
        } else {
            playerDesc.classList.add('hidden');
        }

        updatePlayerChannelCheckboxes(v);

        const playerControls = document.getElementById('player-controls-container');
        const bossNotice = document.getElementById('player-boss-view-notice');

        if (currentUser.role === 'boss') {
            playerControls.classList.add('hidden');
            bossNotice.classList.remove('hidden');
        } else {
            playerControls.classList.remove('hidden');
            bossNotice.classList.add('hidden');
        }

        const videoElement = document.getElementById('main-video-player');
        const noVideoNotice = document.getElementById('player-no-video');
        const downloadBtn = document.getElementById('player-download-btn');

        if (v.video_filename) {
            const videoUrl = `/videos/stream/${v.video_filename}`;
            videoElement.src = videoUrl;
            videoElement.classList.remove('hidden');
            noVideoNotice.classList.add('hidden');
            downloadBtn.href = videoUrl;
            downloadBtn.classList.remove('hidden');
        } else {
            videoElement.src = '';
            videoElement.classList.add('hidden');
            noVideoNotice.classList.remove('hidden');
            downloadBtn.classList.add('hidden');
        }

        document.getElementById('modal-player').classList.remove('hidden');
    } catch (err) {
        showToast('Không thể mở video', 'error');
    }
}

function updatePlayerChannelCheckboxes(v) {
    const isTiktok = !!(v.posted_tiktok || v.tiktok);
    const isFacebook = !!(v.posted_facebook || v.facebook);
    const isYoutube = !!(v.posted_youtube || v.youtube);
    const isPublished = isTiktok || isFacebook || isYoutube;

    const badge = document.getElementById('player-status-badge');
    badge.innerHTML = isPublished
        ? '<span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300"><i class="fa-solid fa-circle-check text-emerald-600 mr-1"></i>Đã Đăng</span>'
        : '<span class="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300"><i class="fa-solid fa-box-archive text-amber-600 mr-1"></i>Kho Lưu Trữ (Chưa đăng)</span>';

    const btnTiktok = document.getElementById('player-btn-tiktok');
    const btnFacebook = document.getElementById('player-btn-facebook');
    const btnYoutube = document.getElementById('player-btn-youtube');

    btnTiktok.className = `w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${isTiktok ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`;
    btnTiktok.innerHTML = `<span><i class="fa-brands fa-tiktok mr-2"></i> Kênh TikTok</span> <span>${isTiktok ? 'Đã đăng ✅' : 'Chưa đăng'}</span>`;

    btnFacebook.className = `w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${isFacebook ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`;
    btnFacebook.innerHTML = `<span><i class="fa-brands fa-facebook mr-2"></i> Kênh Facebook</span> <span>${isFacebook ? 'Đã đăng ✅' : 'Chưa đăng'}</span>`;

    btnYoutube.className = `w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${isYoutube ? 'bg-red-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`;
    btnYoutube.innerHTML = `<span><i class="fa-brands fa-youtube mr-2"></i> Kênh YouTube</span> <span>${isYoutube ? 'Đã đăng ✅' : 'Chưa đăng'}</span>`;
}

function playerToggleChannel(channel) {
    if (!activePlayingVideo) return;
    quickToggleChannel(activePlayingVideo.id, channel);
}

function playerMoveToArchive() {
    if (!activePlayingVideo) return;
    quickToggleChannel(activePlayingVideo.id, 'archive');
}

function closeVideoPlayer() {
    const videoElement = document.getElementById('main-video-player');
    videoElement.pause();
    videoElement.src = '';
    document.getElementById('modal-player').classList.add('hidden');
}

// Export Excel
function exportExcel() {
    const search = document.getElementById('filter-search').value.trim();
    const creator = document.getElementById('filter-creator').value;
    const dateFrom = document.getElementById('filter-date-from').value;
    const dateTo = document.getElementById('filter-date-to').value;

    const params = new URLSearchParams();
    params.append('tab', currentTab);
    if (search) params.append('search', search);
    if (creator && creator !== 'all') params.append('creator', creator);
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);

    window.location.href = `/api/export?${params.toString()}`;
    showToast('Đang tải file Excel về máy...', 'info');
}

// Copy LAN Link
function copyLanLink(lanUrl) {
    navigator.clipboard.writeText(lanUrl).then(() => {
        showToast(`Đã sao chép link mạng LAN: ${lanUrl}`, 'success');
    }).catch(() => {
        prompt('Sao chép đường link này gửi cho Sếp:', lanUrl);
    });
}

// ================= ADMIN MANAGEMENT (DÀNH RIÊNG CHO TƯỜNG VY) =================

async function openMembersModal() {
    if (currentUser.role !== 'admin') {
        showToast('Chỉ Tường Vy (Admin) mới có quyền vào mục này!', 'error');
        return;
    }
    await loadAdminUsersList();
    document.getElementById('modal-members').classList.remove('hidden');
}

function closeMembersModal() {
    document.getElementById('modal-members').classList.add('hidden');
}

async function loadAdminUsersList() {
    try {
        const res = await fetch('/api/admin/users', {
            headers: { 'Current-User-Role': currentUser.role }
        });
        const users = await res.json();
        const tbody = document.getElementById('admin-users-tbody');

        let html = '';
        users.forEach(u => {
            let roleBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">🎬 Nhân viên dựng</span>';
            if (u.role === 'admin') roleBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800">👑 Quản trị viên</span>';
            if (u.role === 'boss') roleBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">👔 Sếp (Chỉ xem)</span>';

            const isCurrentAdmin = u.role === 'admin';

            const deleteBtn = isCurrentAdmin ? '' : `
                <button onclick="adminDeleteUser(${u.id}, '${u.name}')" class="text-slate-400 hover:text-rose-600 p-1.5 transition-colors" title="Xóa tài khoản này">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;

            const changeRoleBtn = isCurrentAdmin ? '' : `
                <button onclick="adminToggleUserRole(${u.id}, '${u.role}')" class="text-xs text-blue-600 hover:underline font-semibold mr-2" title="Chuyển giữa Sếp và Nhân viên">
                    Đổi quyền
                </button>
            `;

            html += `
                <tr class="hover:bg-slate-50 border-b border-slate-100">
                    <td class="px-4 py-3 font-bold text-slate-900">${u.name}</td>
                    <td class="px-4 py-3">${roleBadge}</td>
                    <td class="px-4 py-3 font-mono font-bold text-purple-700">
                        <span class="bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5">
                            <i class="fa-solid fa-key text-[10px]"></i> ${u.pin}
                        </span>
                        <button onclick="copyUserPin('${u.name}', '${u.pin}')" class="text-slate-400 hover:text-purple-700 text-xs ml-1" title="Sao chép gửi Zalo">
                            <i class="fa-regular fa-copy"></i>
                        </button>
                    </td>
                    <td class="px-4 py-3 text-right whitespace-nowrap">
                        ${changeRoleBtn}
                        <button onclick="adminUpdatePin(${u.id}, '${u.name}', '${u.pin}')" class="text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-lg font-bold mr-1.5 transition-colors">
                            Đổi PIN
                        </button>
                        ${deleteBtn}
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    } catch {
        showToast('Lỗi khi tải danh sách quản trị', 'error');
    }
}

function copyUserPin(name, pin) {
    const textToCopy = `Chào ${name}, mã PIN đăng nhập phần mềm video của bạn là: ${pin}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
        showToast(`Đã sao chép mã PIN của ${name} để gửi Zalo!`, 'success');
    }).catch(() => {
        prompt(`Mã PIN của ${name}:`, pin);
    });
}

async function adminUpdatePin(userId, name, oldPin) {
    const newPin = prompt(`Nhập mã PIN mới muốn cấp cho [${name}]:`, oldPin);
    if (!newPin || !newPin.trim()) return;

    const formData = new FormData();
    formData.append('new_pin', newPin.trim());

    try {
        const res = await fetch(`/api/admin/users/${userId}/update-pin`, {
            method: 'POST',
            headers: { 'Current-User-Role': currentUser.role },
            body: formData
        });

        if (res.ok) {
            showToast(`Đã đổi mã PIN cho ${name} thành [${newPin.trim()}]!`, 'success');
            await loadAdminUsersList();
        } else {
            const err = await res.json();
            showToast(err.detail || 'Lỗi khi đổi PIN', 'error');
        }
    } catch {
        showToast('Lỗi kết nối', 'error');
    }
}

async function adminToggleUserRole(userId, currentRole) {
    const targetRole = currentRole === 'boss' ? 'editor' : 'boss';
    const roleName = targetRole === 'boss' ? 'Sếp (Chỉ xem)' : 'Nhân viên dựng video';

    if (!confirm(`Bạn có muốn đổi quyền tài khoản này sang: [${roleName}]?`)) return;

    const formData = new FormData();
    formData.append('new_role', targetRole);

    try {
        const res = await fetch(`/api/admin/users/${userId}/update-role`, {
            method: 'POST',
            headers: { 'Current-User-Role': currentUser.role },
            body: formData
        });

        if (res.ok) {
            showToast(`Đã đổi quyền sang ${roleName}!`, 'success');
            await loadAdminUsersList();
            await loadPublicUsersList();
        } else {
            const err = await res.json();
            showToast(err.detail || 'Lỗi khi đổi quyền', 'error');
        }
    } catch {
        showToast('Lỗi kết nối', 'error');
    }
}

async function adminDeleteUser(userId, name) {
    if (!confirm(`Tường Vy ơi, bạn có chắc chắn muốn xóa tài khoản [${name}]?`)) return;

    try {
        const res = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Current-User-Role': currentUser.role }
        });

        if (res.ok) {
            showToast(`Đã xóa tài khoản ${name}!`, 'success');
            await loadAdminUsersList();
            await loadPublicUsersList();
        } else {
            const err = await res.json();
            showToast(err.detail || 'Không thể xóa', 'error');
        }
    } catch {
        showToast('Lỗi khi xóa tài khoản', 'error');
    }
}

async function submitAddNewMember(e) {
    e.preventDefault();
    const name = document.getElementById('new-user-name').value.trim();
    const role = document.getElementById('new-user-role').value;
    const pin = document.getElementById('new-user-pin').value.trim();

    if (!name || !pin) return;

    const formData = new FormData();
    formData.append('name', name);
    formData.append('role', role);
    formData.append('pin', pin);

    try {
        const res = await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Current-User-Role': currentUser.role },
            body: formData
        });

        if (res.ok) {
            showToast(`Đã thêm ${name} với mã PIN [${pin}] thành công!`, 'success');
            document.getElementById('new-user-name').value = '';
            document.getElementById('new-user-pin').value = '';
            await loadAdminUsersList();
            await loadPublicUsersList();
        } else {
            const err = await res.json();
            showToast(err.detail || 'Tên người dùng đã tồn tại!', 'error');
        }
    } catch {
        showToast('Lỗi kết nối khi thêm người dùng', 'error');
    }
}

// Drag & drop file upload UX
function setupDragAndDrop() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('form-video-file');
    const fileSelectedName = document.getElementById('file-selected-name');

    if (!dropzone || !fileInput) return;

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('dragover');
        }, false);
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length) {
            fileInput.files = files;
            updateFileLabel(files[0]);
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
            updateFileLabel(fileInput.files[0]);
        }
    });

    function updateFileLabel(file) {
        fileSelectedName.innerHTML = `
            <div class="mt-2 text-xs font-bold text-blue-600 bg-blue-50 py-2 px-3.5 rounded-xl border border-blue-200 inline-flex items-center gap-2">
                <i class="fa-solid fa-file-video text-base"></i> Đã chọn file: ${file.name} (${formatFileSize(file.size)})
            </div>
        `;
    }
}

// Khởi chạy khi tài liệu HTML sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    checkAuthOnLoad();
    setupDragAndDrop();

    let searchTimeout = null;
    document.getElementById('filter-search').addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(loadVideos, 300);
    });
});
