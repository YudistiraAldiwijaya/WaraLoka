// Variabel global
let currentPage = 1;
let isLoading = false;
let currentUser = null; // Akan menyimpan user_id dan username jika login

// Dapatkan referensi elemen-elemen DOM
const authModal = document.getElementById('authModal');
const loginSignupBtn = document.getElementById('loginSignupBtn'); // Tombol "Log in / Daftar" di nav-menu
const loginFormContainer = document.getElementById('loginFormContainer');
const signupFormContainer = document.getElementById('signupFormContainer');
const showSignupLink = document.getElementById('showSignup');
const showLoginLink = document.getElementById('showLogin');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const authMessageContainer = document.getElementById('authMessageContainer');

// Elemen untuk header/UI khusus desktop/mobile
const userStatusDesktopDiv = document.getElementById('userStatusDesktop'); 
const loggedInUsernameDesktopSpan = document.getElementById('loggedInUsernameDesktop'); 
const logoutBtnDesktop = document.getElementById('logoutBtnDesktop');

const userStatusMobileDiv = document.getElementById('userStatusMobile'); 
const loggedInUsernameMobileSpan = document.getElementById('loggedInUsernameMobile'); 
const logoutBtnMobile = document.getElementById('logoutBtnMobile');

const hamburgerMenu = document.getElementById('hamburgerMenu');
const mainNavMenu = document.getElementById('mainNavMenu');

// Elemen yang hanya ada di index.html
const submitSection = document.getElementById('submit'); 
const globalMessageContainer = document.getElementById('globalMessageContainer'); 
const shareStoryHeroBtn = document.querySelector('.hero .cta-button'); 

// Elemen untuk Modal Edit Cerita
const editStoryModal = document.getElementById('editStoryModal');
const closeEditStoryModalBtn = document.getElementById('closeEditStoryModalBtn');
const editStoryForm = document.getElementById('editStoryForm');
const editStoryIdInput = document.getElementById('editStoryId');
const editTitleInput = document.getElementById('editTitle');
const editLocationInput = document.getElementById('editLocation');
const editContentInput = document.getElementById('editContent');
const editPhotoInput = document.getElementById('editPhoto');
const editFilePreviewDiv = document.getElementById('editFilePreview');
const currentPhotoPreviewDiv = document.getElementById('currentPhotoPreview');
const removePhotoCheckbox = document.getElementById('removePhotoCheckbox');
const editCurrentPhotoInput = document.getElementById('editCurrentPhoto');
const editStoryMessageContainer = document.getElementById('editStoryMessageContainer');

// Elemen untuk Modal Konfirmasi Kustom
const customConfirmModal = document.getElementById('customConfirmModal');
const closeCustomConfirmModalBtn = document.getElementById('closeCustomConfirmModalBtn');
const customConfirmMessage = document.getElementById('customConfirmMessage');
const customConfirmYesBtn = document.getElementById('customConfirmYesBtn');
const customConfirmNoBtn = document.getElementById('customConfirmNoBtn');

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    // Periksa apakah di index.html (karena skrip ini utamanya untuk index.html sekarang)
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        loadStoriesForIndexPage().then(() => {
            setTimeout(() => {
                if (window.location.hash) {
                    const targetId = window.location.hash.substring(1);
                    const targetElement = document.getElementById(targetId);
                    if (targetElement) {
                        targetElement.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            }, 100); 
        });
    }
    
    const storyForm = document.getElementById('storyForm');
    if (storyForm) {
        setupFormHandlers(); 
    }
    
    setupNavigation();
    setupAuthForms();
    checkLoginStatus(); 
    setupHamburgerMenu();

    // Event listener untuk tombol logout di desktop
    if (logoutBtnDesktop) {
        logoutBtnDesktop.addEventListener('click', async function() {
            await handleLogout();
        });
    }

    // Event listener untuk tombol logout di mobile
    if (logoutBtnMobile) {
        logoutBtnMobile.addEventListener('click', async function() {
            await handleLogout();
        });
    }
    
    // Event listeners untuk Modal Konfirmasi Kustom
    if (closeCustomConfirmModalBtn) {
        closeCustomConfirmModalBtn.addEventListener('click', closeCustomConfirmModal);
    }

    if (shareStoryHeroBtn) {
        shareStoryHeroBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (!currentUser) {
                showMessage('Anda harus login untuk mengirim cerita.', 'warning', true); 
                openAuthModal(true); 
                return;
            }
            window.location.href = 'index.html#submit';
        });
    }

    // Event listener untuk menutup Modal Edit Cerita
    if (closeEditStoryModalBtn) {
        closeEditStoryModalBtn.addEventListener('click', closeEditStoryModal);
    }
    // Event listener untuk mengirim Form Edit Cerita
    if (editStoryForm) {
        setupEditStoryFormHandler(); 
    }
});

// Fungsi untuk menangani logout, dipanggil dari kedua tombol logout
async function handleLogout() {
    showCustomConfirm('Apakah Anda yakin ingin keluar dari akun ini?', async (confirmed) => {
        if (!confirmed) {
            return; // Batalkan proses logout jika pengguna menekan 'Tidak' atau 'x'
        }

        try {
            const response = await fetch('logout.php', { method: 'POST' }); 
            const data = await response.json(); 
            if (!response.ok) { 
                 const errorText = await response.text();
                 throw new Error(data.message || 'Network response was not ok: ' + errorText);
            }

            if (data.success) {
                sessionStorage.removeItem('loggedInUser');
                currentUser = null; 
                updateAuthUI(); 
                showMessage('Anda telah logout.', 'success', true); 
                // Tutup mobile menu jika terbuka setelah logout
                if (mainNavMenu && mainNavMenu.classList.contains('active')) {
                    mainNavMenu.classList.remove('active');
                }

                // Muat ulang cerita untuk merefresh tampilan tombol edit/hapus
                // berdasarkan status login/pemilik yang baru.
                if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                    currentPage = 1; 
                    loadStoriesForIndexPage();
                } else if (window.location.pathname.includes('stories.html')) {
                    storiesPageCurrentPage = 1; 
                    if (typeof loadStoriesForStoriesPage === 'function') {
                        loadStoriesForStoriesPage();
                    } else {
                        window.location.reload(); 
                    }
                }
            } else {
                showMessage('Gagal logout.', 'error', true); 
            }
        } catch (error) {
            console.error('Error selama logout:', error);
            showMessage('Terjadi kesalahan saat logout.', 'error', true); 
        }
    });
}

function setupHamburgerMenu() {
    if (hamburgerMenu && mainNavMenu) {
        hamburgerMenu.addEventListener('click', (e) => {
            e.stopPropagation(); // Hentikan propagasi untuk mencegah closeMenuOutside segera aktif
            mainNavMenu.classList.toggle('active');
            if (mainNavMenu.classList.contains('active')) {
                document.addEventListener('click', closeMenuOutside);
            } else {
                document.removeEventListener('click', closeMenuOutside);
            }
            updateAuthUI(); // Perbarui UI setelah toggle (terutama userStatusMobile)
        });

        // Menutup menu saat link navigasi di klik (pada mobile menu)
        mainNavMenu.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                // Tutup menu hanya jika ini bukan tombol login/daftar itu sendiri yang membuka modal
                // Atau jika ini adalah tombol logout di mobile status
                if (link.id !== 'loginSignupBtn' && link.id !== 'logoutBtnMobile') {
                    if (mainNavMenu.classList.contains('active')) {
                        mainNavMenu.classList.remove('active');
                        document.removeEventListener('click', closeMenuOutside);
                    }
                }
                updateAuthUI(); // Perbarui UI
            });
        });

        // Menutup menu saat jendela diubah ukurannya ke desktop
        window.addEventListener('resize', () => {
            if (!window.matchMedia("(max-width: 768px)").matches) {
                if (mainNavMenu.classList.contains('active')) {
                    mainNavMenu.classList.remove('active');
                    document.removeEventListener('click', closeMenuOutside);
                }
            }
            updateAuthUI(); 
        });
    }
}

function closeMenuOutside(event) {
    // Pastikan klik bukan pada hamburger menu atau di dalam nav menu itu sendiri
    if (!hamburgerMenu.contains(event.target) && !mainNavMenu.contains(event.target)) {
        if (mainNavMenu.classList.contains('active')) { // Pastikan menu memang aktif
            mainNavMenu.classList.remove('active');
            document.removeEventListener('click', closeMenuOutside);
            updateAuthUI(); // Perbarui UI setelah menutup menu
        }
    }
}

async function loadStoriesForIndexPage() {
    if (isLoading) return;

    isLoading = true;
    const storiesGrid = document.getElementById('storiesGrid'); 

    if (!storiesGrid) { 
        isLoading = false;
        return;
    }

    try {
        const response = await fetch(`get_stories.php?page=${currentPage}`); 
        const data = await response.json();

        if (data.success) {
            if (currentPage === 1) {
                storiesGrid.innerHTML = '';
            }

            data.stories.forEach(story => {
                const storyCard = createStoryCard(story);
                storiesGrid.appendChild(storyCard);
            });

            const loadMoreBtn = document.querySelector('.load-more-btn');
            if (loadMoreBtn) { 
                loadMoreBtn.style.display = 'block'; 
            }

        } else {
            showMessage('Gagal memuat cerita populer.', 'error', true); 
        }
    } catch (error) {
        console.error('Error memuat cerita populer:', error);
        showMessage('Terjadi kesalahan saat memuat cerita populer.', 'error', true); 
    }

    isLoading = false;
}

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault(); 

            const href = link.getAttribute('href');
            const targetUrl = new URL(href, window.location.origin);
            
            // Normalisasi path saat ini dan target untuk perbandingan
            const currentPath = window.location.pathname.replace(/\/+$/, '').replace(/^\//, ''); 
            const targetPath = targetUrl.pathname.replace(/\/+$/, '').replace(/^\//, ''); 

            const isSameFile = (currentPath === targetPath) || 
                               (currentPath === '' && targetPath === 'index.html') || 
                               (currentPath === 'index.html' && targetPath === '');

            if (isSameFile) { 
                // Navigasi ke bagian di halaman yang sama atau di antara root & index.html
                if (targetUrl.hash) {
                    const sectionId = targetUrl.hash.substring(1);
                    const section = document.getElementById(sectionId);
                    if (section) {
                        section.scrollIntoView({ behavior: 'smooth' });
                    }
                } else {
                    // Jika link tidak punya hash, dan berada di file yang sama
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
                // Penting: Perbarui status aktif setelah navigasi internal/scroll
                // Beri sedikit delay agar scrollIntoView selesai sebelum update UI
                setTimeout(updateActiveNavLinkState, 300); 
            } else {
                // Navigasi ke file HTML yang berbeda
                window.location.href = href;
            }
        });
    });

    // Panggil saat DOM dimuat
    updateActiveNavLinkState();
    // Panggil saat history browser berubah (tombol kembali/maju)
    window.addEventListener('popstate', updateActiveNavLinkState);
    // Panggil saat scroll (untuk bagian di halaman yang sama, misal home ke submit)
    window.addEventListener('scroll', updateActiveNavLinkState);
}

function updateActiveNavLinkState() {
    const navLinks = document.querySelectorAll('.nav-link');
    const currentPath = window.location.pathname.replace(/\/+$/, '').replace(/^\//, '');

    navLinks.forEach(link => {
        link.classList.remove('active'); // Hapus semua kelas 'active' terlebih dahulu
    });

    let activeLinkFound = false;

    // Prioritas 1: Pencocokan halaman berdasarkan file HTML (stories.html)
    // Jika currentPath adalah 'stories.html', aktifkan link 'Cerita'
    if (currentPath === 'stories.html') {
        const storiesNavLink = document.querySelector('.nav-link[href="stories.html"]');
        if (storiesNavLink) {
            storiesNavLink.classList.add('active');
            activeLinkFound = true;
        }
    } 
    // Prioritas 2: Pencocokan halaman berdasarkan file HTML (index.html atau root)
    else if (currentPath === '' || currentPath === 'index.html') {
        const heroSection = document.getElementById('home');
        const submitSection = document.getElementById('submit');

        // Cek apakah di bagian 'Kirim Cerita' (submit)
        if (submitSection) {
            const submitRect = submitSection.getBoundingClientRect();
            if (submitRect.top <= window.innerHeight / 2 && submitRect.bottom >= 0) {
                const submitNavLink = document.querySelector('.nav-link[href="#submit"]');
                if (submitNavLink) {
                    submitNavLink.classList.add('active');
                    activeLinkFound = true;
                }
            }
        }
        
        // Cek apakah di bagian 'Beranda' (home) atau di bagian paling atas halaman
        if (!activeLinkFound && heroSection) {
            const heroRect = heroSection.getBoundingClientRect();
            if (heroRect.top <= 0 && heroRect.bottom > 50) {
                const homeNavLink = document.querySelector('.nav-link[href="#home"]');
                if (homeNavLink) {
                    homeNavLink.classList.add('active');
                    activeLinkFound = true;
                }
            } else if (window.scrollY === 0) {
                 const homeNavLink = document.querySelector('.nav-link[href="#home"]');
                 if (homeNavLink) {
                     homeNavLink.classList.add('active');
                     activeLinkFound = true;
                 }
            }
        }
        
        // Fallback terakhir untuk index.html: Jika masih belum ada yang aktif (misal di antara bagian)
        // dan di halaman index, defaultkan ke Beranda
        if (!activeLinkFound) {
            const homeNavLink = document.querySelector('.nav-link[href="#home"]');
            if (homeNavLink) {
                homeNavLink.classList.add('active');
                activeLinkFound = true;
            }
        }
    }
}

function createStoryCard(story) {
    const card = document.createElement('div');
    card.className = 'story-card';
    card.id = `story-${story.id}`;

    const imageHtml = story.photo
        ? `<img src="uploads/${story.photo}" alt="${escapeHtml(story.title)}" style="width: 100%; height: 200px; object-fit: cover;">`
        : `<div class="story-image"><i class="fas fa-book-open"></i></div>`;

    const upvoteActiveClass = (currentUser && story.current_user_vote === 'up') ? 'active' : '';
    const downvoteActiveClass = (currentUser && story.current_user_vote === 'down') ? 'active' : '';
    const voteButtonDisabledAttr = currentUser ? '' : 'disabled';

    let ownerButtonsHtml = '';
    // Tambahkan tombol Edit dan Hapus jika user adalah pemilik cerita
    if (story.is_owner) {
        ownerButtonsHtml = `
            <div class="owner-actions" style="margin-top: 1rem; display: flex; gap: 10px; justify-content: flex-end;">
                <button class="cta-button small-button edit-btn" data-story-id="${story.id}">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="cta-button small-button delete-btn" data-story-id="${story.id}">
                    <i class="fas fa-trash-alt"></i> Hapus
                </button>
            </div>
        `;
    }

    card.innerHTML = `
        ${imageHtml}
        <div class="story-content">
            <h3 class="story-title">${escapeHtml(story.title)}</h3>
            <div class="story-location">
                <i class="fas fa-map-marker-alt"></i>
                ${escapeHtml(story.location)}
            </div>
            <p class="story-excerpt">${escapeHtml(story.content.substring(0, 150))}...</p>
            <div class="story-meta">
                <div class="vote-section">
                    <div class="like-display">
                        <button class="vote-btn upvote-btn ${upvoteActiveClass}" ${voteButtonDisabledAttr} data-story-id="${story.id}" data-vote-type="up">
                            <i class="fas fa-thumbs-up"></i>
                        </button>
                        <span class="like-count">${story.likes_count || 0}</span>
                    </div>
                    <div class="dislike-display">
                        <button class="vote-btn downvote-btn ${downvoteActiveClass}" ${voteButtonDisabledAttr} data-story-id="${story.id}" data-vote-type="down">
                            <i class="fas fa-thumbs-down"></i>
                        </button>
                        <span class="dislike-count">${story.dislikes_count || 0}</span>
                    </div>
                </div>
                <small class="story-date">${formatDate(story.created_at)}</small>
            </div>
            ${ownerButtonsHtml}
        </div>
    `;

    const upvoteBtn = card.querySelector('.upvote-btn');
    const downvoteBtn = card.querySelector('.downvote-btn');
    const editBtn = card.querySelector('.edit-btn');
    const deleteBtn = card.querySelector('.delete-btn');

    // Event listener untuk tombol vote
    if (upvoteBtn) {
        upvoteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Mencegah modal terbuka saat vote
            voteStory(story.id, 'up');
        });
    }
    if (downvoteBtn) {
        downvoteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Mencegah modal terbuka saat vote
            voteStory(story.id, 'down');
        });
    }

    // Event listener untuk tombol Edit
    if (editBtn) {
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Mencegah modal cerita terbuka
            openEditStoryModal(story); // Memanggil fungsi baru untuk modal edit
        });
    }

    // Event listener untuk tombol Hapus
    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Mencegah modal cerita terbuka
            deleteStory(story.id); // Memanggil fungsi baru untuk hapus cerita
        });
    }

    // Tambahkan event listener untuk membuka modal cerita HANYA JIKA TIDAK ADA TOMBOL EDIT/HAPUS YANG DIKLIK
    card.addEventListener('click', (e) => {
        // Hanya buka modal cerita jika klik tidak berasal dari vote, edit, atau delete button
        if (!e.target.closest('.vote-btn') && !e.target.closest('.edit-btn') && !e.target.closest('.delete-btn')) {
            openStoryModal(story);
        }
    });
    
    return card;
}

function loadMoreStories() { // Fungsi ini digunakan pada tombol "Muat Lebih Banyak" di index.html.
    window.location.href = 'stories.html'; 
}

async function voteStory(storyId, voteType) {
    if (!currentUser) {
        showMessage('Anda harus login untuk memberikan vote.', 'warning', true); 
        openAuthModal(true); 
        return;
    }

    try {
        const response = await fetch('vote_story.php', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                story_id: storyId,
                vote_type: voteType
            })
        });

        const data = await response.json(); 
        if (!response.ok) { 
            const errorText = await response.text();
            throw new Error(data.message || 'Network response was not ok: ' + errorText);
        }

        if (data.success) {
            showMessage(data.message, 'success', true); 
            const storyCard = document.getElementById(`story-${storyId}`);
            if (storyCard) {
                const likeCountElement = storyCard.querySelector('.like-count');
                const dislikeCountElement = storyCard.querySelector('.dislike-count');
                const upvoteBtn = storyCard.querySelector('.upvote-btn');
                const downvoteBtn = storyCard.querySelector('.downvote-btn');

                if (likeCountElement) {
                    likeCountElement.textContent = data.new_likes_count; 
                }
                if (dislikeCountElement) {
                    dislikeCountElement.textContent = data.new_dislikes_count; 
                }

                upvoteBtn.classList.remove('active');
                downvoteBtn.classList.remove('active');
                if (data.current_user_vote === 'up') { 
                    upvoteBtn.classList.add('active');
                } else if (data.current_user_vote === 'down') {
                    downvoteBtn.classList.add('active');
                }
            }

        } else {
            showMessage(data.message || 'Gagal memberikan vote', 'error', true); 
        }
    } catch (error) {
        console.error('Error voting:', error);
        showMessage('Terjadi kesalahan saat voting', 'error', true); 
    }
}

function setupFormHandlers() {
    const storyForm = document.getElementById('storyForm'); 
    const photoInput = document.getElementById('photo');

    if (storyForm) { 
        photoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            const preview = document.getElementById('filePreview');

            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
                };
                reader.readAsDataURL(file);
            } else {
                preview.innerHTML = '';
            }
        });

        storyForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            if (!currentUser) {
                showMessage('Anda harus login untuk mengirim cerita.', 'warning', true); 
                openAuthModal(true); 
                return;
            }

            const submitBtn = this.querySelector('.submit-btn');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<div class="loading"></div> Mengirim...';
            submitBtn.disabled = true;

            const formData = new FormData(this); // Menggunakan `new FormData(this)` untuk mengambil semua input form secara otomatis

            try {
                const response = await fetch('submit_story.php', { 
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                if (!response.ok) { 
                    const errorText = await response.text();
                    throw new Error(data.message || 'Network response was not ok: ' + errorText);
                }

                if (data.success) {
                    showMessage('Cerita berhasil dikirim!', 'success', false); 
                    this.reset();
                    document.getElementById('filePreview').innerHTML = ''; // Hapus preview foto

                    currentPage = 1;
                    loadStoriesForIndexPage(); 
                } else {
                    showMessage(data.message || 'Gagal mengirim cerita', 'error', false); 
                }
            } catch (error) {
                console.error('Error mengirim cerita:', error);
                showMessage('Terjadi kesalahan saat mengirim cerita', 'error', false); 
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
}

function openStoryModal(story) {
    const modal = document.getElementById('storyModal');
    const modalContent = document.getElementById('modalContent');

    if (!modal || !modalContent) {
        console.error("Modal cerita atau konten tidak ditemukan.");
        return;
    }

    const imageHtml = story.photo
        ? `<img src="uploads/${story.photo}" alt="${escapeHtml(story.title)}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px; margin-bottom: 1rem;">`
        : '';

    const upvoteActiveClassModal = (currentUser && story.current_user_vote === 'up') ? 'active' : '';
    const downvoteActiveClassModal = (currentUser && story.current_user_vote === 'down') ? 'active' : '';
    const voteButtonDisabledAttr = currentUser ? '' : 'disabled';

    let ownerButtonsHtml = '';
    // Tambahkan tombol Edit dan Hapus jika user adalah pemilik cerita
    if (story.is_owner) {
        ownerButtonsHtml = `
            <div class="owner-actions" style="margin-top: 1rem; display: flex; gap: 10px; justify-content: flex-end;">
                <button class="cta-button small-button edit-btn" data-story-id="${story.id}">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="cta-button small-button delete-btn" data-story-id="${story.id}">
                    <i class="fas fa-trash-alt"></i> Hapus
                </button>
            </div>
        `;
    }

    modalContent.innerHTML = `
        ${imageHtml}
        <h2 style="color: #8B4513; margin-bottom: 0.5rem;">${escapeHtml(story.title)}</h2>
        <div style="color: #DC143C; margin-bottom: 1rem; display: flex; align-items: center; gap: 5px;">
            <i class="fas fa-map-marker-alt"></i>
            ${escapeHtml(story.location)}
        </div>
        <p style="line-height: 1.8; color: #333; margin-bottom: 1rem;">${escapeHtml(story.content)}</p>
        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 1rem; border-top: 1px solid #eee;">
            <div class="vote-section">
                <div class="like-display">
                    <button class="vote-btn upvote-btn ${upvoteActiveClassModal}" ${voteButtonDisabledAttr} data-story-id="${story.id}" data-vote-type="up">
                        <i class="fas fa-thumbs-up"></i>
                    </button>
                    <span class="like-count">${story.likes_count || 0}</span>
                </div>
                <div class="dislike-display">
                    <button class="vote-btn downvote-btn ${downvoteActiveClassModal}" ${voteButtonDisabledAttr} data-story-id="${story.id}" data-vote-type="down">
                        <i class="fas fa-thumbs-down"></i>
                    </button>
                    <span class="dislike-count">${story.dislikes_count || 0}</span>
                </div>
            </div>
            <small style="color: #666;">${formatDate(story.created_at)}</small>
        </div>
        ${ownerButtonsHtml}
    `;

    modal.style.display = 'block';

    const modalUpvoteBtn = modalContent.querySelector('.upvote-btn');
    const modalDownvoteBtn = modalContent.querySelector('.downvote-btn');
    const modalEditBtn = modalContent.querySelector('.edit-btn');
    const modalDeleteBtn = modalContent.querySelector('.delete-btn');

    if (modalUpvoteBtn) {
        modalUpvoteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            voteStory(story.id, 'up');
        });
    }
    if (modalDownvoteBtn) {
        modalDownvoteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            voteStory(story.id, 'down');
        });
    }

    // Event listener untuk tombol Edit di modal
    if (modalEditBtn) {
        modalEditBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeModal(); // Tutup modal cerita
            openEditStoryModal(story); // Buka modal edit
        });
    }

    // Event listener untuk tombol Hapus di modal
    if (modalDeleteBtn) {
        modalDeleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeModal(); // Tutup modal cerita
            deleteStory(story.id); // Panggil fungsi hapus
        });
    }
}

window.closeModal = function() { 
    const storyModal = document.getElementById('storyModal');
    if (storyModal) { 
        storyModal.style.display = 'none';
    }
};

window.onclick = function(event) { 
    const storyModal = document.getElementById('storyModal'); 
    const authModal = document.getElementById('authModal'); 
    const editStoryModal = document.getElementById('editStoryModal');
    const customConfirmModal = document.getElementById('customConfirmModal');

    if (storyModal && event.target === storyModal) { 
        storyModal.style.display = 'none';
    }
    if (authModal && event.target === authModal) { 
        authModal.style.display = 'none';
        if (authMessageContainer) { 
            authMessageContainer.innerHTML = ''; 
        }
    }
    if (editStoryModal && event.target === editStoryModal) {
        editStoryModal.style.display = 'none';
        if (editStoryMessageContainer) { 
            editStoryMessageContainer.innerHTML = '';
        }
    }
    // Tutup customConfirmModal
    if (customConfirmModal && event.target === customConfirmModal) {
        closeCustomConfirmModal(); // Panggil fungsi penutup khusus
    }
};

function escapeHtml(text) { 
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) { 
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Modifikasi fungsi showMessage untuk mendukung pesan di container tertentu
function showMessage(message, type, isGlobal = false, container = null) {
    // Hapus pesan yang sudah ada sebelum menampilkan yang baru (jika tidak di container spesifik)
    if (!container) {
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());
    }
    
    // Pastikan container pesan modal juga direset jika tidak digunakan untuk pesan global
    if (authMessageContainer) authMessageContainer.innerHTML = ''; 
    if (globalMessageContainer) globalMessageContainer.innerHTML = ''; 
    if (editStoryMessageContainer) editStoryMessageContainer.innerHTML = '';

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    if (isGlobal && globalMessageContainer) { 
        globalMessageContainer.appendChild(messageDiv);
    } else if (container) { // Tambahan: gunakan container yang spesifik jika diberikan
        container.appendChild(messageDiv);
    } else if (authModal && authModal.style.display === 'block' && authMessageContainer) { 
        authMessageContainer.appendChild(messageDiv);
    } else {
        const form = document.querySelector('.story-form'); 
        if (form) {
             form.insertBefore(messageDiv, form.firstChild);
        } else {
            document.body.prepend(messageDiv); 
        }
    }
    
    // Set timeout untuk menghapus pesan
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
        // Bersihkan container jika sudah kosong
        if (isGlobal && globalMessageContainer && !globalMessageContainer.hasChildNodes()) { 
            globalMessageContainer.innerHTML = '';
        } else if (authMessageContainer && !authMessageContainer.hasChildNodes()) { 
            authMessageContainer.innerHTML = '';
        } else if (editStoryMessageContainer && !editStoryMessageContainer.hasChildNodes()) {
            editStoryMessageContainer.innerHTML = '';
        }
    }, 5000);
}

function openAuthModal(showLogin = true) { 
    if (!authModal) return; 
    authModal.style.display = 'block';
    if (showLogin) {
        if (loginFormContainer) loginFormContainer.style.display = 'block'; 
        if (signupFormContainer) signupFormContainer.style.display = 'none'; 
    } else {
        if (loginFormContainer) loginFormContainer.style.display = 'none'; 
        if (signupFormContainer) signupFormContainer.style.display = 'block'; 
    }
    if (authMessageContainer) authMessageContainer.innerHTML = ''; 
    if (loginForm) loginForm.reset(); 
    if (signupForm) signupForm.reset(); 
}

window.closeAuthModal = function() { 
    if (authModal) authModal.style.display = 'none'; 
    if (authMessageContainer) authMessageContainer.innerHTML = ''; 
};

function setupAuthForms() { 
    if (loginSignupBtn) { 
        loginSignupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openAuthModal(true); 
        });
    }

    if (showSignupLink) { 
        showSignupLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (loginFormContainer) loginFormContainer.style.display = 'none';
            if (signupFormContainer) signupFormContainer.style.display = 'block';
            if (authMessageContainer) authMessageContainer.innerHTML = ''; 
        });
    }

    if (showLoginLink) { 
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (loginFormContainer) loginFormContainer.style.display = 'block';
            if (signupFormContainer) signupFormContainer.style.display = 'none';
            if (authMessageContainer) authMessageContainer.innerHTML = ''; 
        });
    }

    if (signupForm) { 
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const username = signupForm.signupUsername.value;
            const email = signupForm.signupEmail.value;
            const password = signupForm.signupPassword.value;
            const confirmPassword = signupForm.signupConfirmPassword.value;

            if (password !== confirmPassword) {
                showMessage('Konfirmasi password tidak cocok.', 'error', false, authMessageContainer); 
                return;
            }

            const submitBtn = this.querySelector('.auth-submit-btn');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<div class="loading"></div> Mendaftar...';
            submitBtn.disabled = true;

            try {
                const response = await fetch('signup.php', { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });
                const data = await response.json(); 
                if (!response.ok) { 
                     const errorText = await response.text();
                     throw new Error(data.message || 'Network response was not ok: ' + errorText);
                }

                if (data.success) {
                    showMessage(data.message, 'success', false, authMessageContainer); 
                    signupForm.reset();
                    setTimeout(() => {
                        if (loginFormContainer) loginFormContainer.style.display = 'block';
                        if (signupFormContainer) signupFormContainer.style.display = 'none';
                        if (authMessageContainer) authMessageContainer.innerHTML = ''; 
                    }, 2000);
                } else {
                    showMessage(data.message || 'Pendaftaran gagal.', 'error', false, authMessageContainer); 
                }
            } catch (error) {
                console.error('Error selama pendaftaran:', error);
                showMessage('Terjadi kesalahan jaringan atau server.', 'error', false, authMessageContainer); 
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    if (loginForm) { 
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const username = loginForm.loginUsername.value;
            const password = loginForm.loginPassword.value;

            const submitBtn = this.querySelector('.auth-submit-btn');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<div class="loading"></div> Login...';
            submitBtn.disabled = true;

            try {
                const response = await fetch('login.php', { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await response.json(); 
                if (!response.ok) { 
                    const errorText = await response.text();
                    throw new Error(data.message || 'Network response was not ok: ' + errorText);
                }

                if (data.success) {
                    showMessage(data.message, 'success', false, authMessageContainer); 
                    sessionStorage.setItem('loggedInUser', JSON.stringify(data.user));
                    currentUser = data.user; 

                    setTimeout(() => {
                        closeAuthModal();
                        updateAuthUI(); 

                        // Perbarui kartu cerita setelah login
                        if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                            currentPage = 1; 
                            loadStoriesForIndexPage();
                        } else if (window.location.pathname.includes('stories.html')) {
                            storiesPageCurrentPage = 1; 
                            if (typeof loadStoriesForStoriesPage === 'function') {
                                loadStoriesForStoriesPage();
                            } else {
                                window.location.reload(); 
                            }
                        }
                    }, 150); 
                } else {
                    showMessage(data.message || 'Login gagal.', 'error', false, authMessageContainer); 
                }
            } catch (error) {
                console.error('Error selama login:', error);
                showMessage('Terjadi kesalahan jaringan atau server.', 'error', false, authMessageContainer); 
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
}

function checkLoginStatus() { 
    const storedUser = sessionStorage.getItem('loggedInUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
    } else {
        currentUser = null;
    }
    updateAuthUI(); 
}

function updateAuthUI() { 
    const isMobileView = window.matchMedia("(max-width: 768px)").matches;
    const isMenuOpen = mainNavMenu && mainNavMenu.classList.contains('active');

    // Mengatur visibilitas tombol "Log in / Daftar"
    if (loginSignupBtn) { 
        if (currentUser) {
            loginSignupBtn.style.display = 'none'; 
        } else {
            loginSignupBtn.style.display = 'block'; 
        }
    }

    // Mengatur visibilitas userStatusDesktop dan userStatusMobile
    if (currentUser) {
        if (!isMobileView) { // Tampilan desktop
            if (userStatusDesktopDiv) {
                userStatusDesktopDiv.style.display = 'flex';
                if (loggedInUsernameDesktopSpan) loggedInUsernameDesktopSpan.textContent = currentUser.username;
            }
            if (userStatusMobileDiv) userStatusMobileDiv.style.display = 'none';
        } else { // Tampilan mobile
            if (userStatusMobileDiv) {
                // Hanya tampilkan userStatusMobileDiv jika menu aktif DAN user login
                if (isMenuOpen) {
                    userStatusMobileDiv.style.display = 'flex';
                } else {
                    userStatusMobileDiv.style.display = 'none'; 
                }
                if (loggedInUsernameMobileSpan) loggedInUsernameMobileSpan.textContent = currentUser.username;
            }
            if (userStatusDesktopDiv) userStatusDesktopDiv.style.display = 'none';
        }
    } else {
        // Jika tidak login, sembunyikan kedua status user
        if (userStatusDesktopDiv) userStatusDesktopDiv.style.display = 'none';
        if (userStatusMobileDiv) userStatusMobileDiv.style.display = 'none';
    }
    
    // Mengatur visibilitas bagian "Kirim Cerita"
    if (submitSection) { 
        if (currentUser) {
            submitSection.style.display = 'block'; 
        } else {
            submitSection.style.display = 'none'; 
        }
    }

    // Mengatur status disabled untuk tombol vote di kartu cerita
    document.querySelectorAll('.story-card').forEach(card => {
        const upvoteBtn = card.querySelector('.upvote-btn');
        const downvoteBtn = card.querySelector('.downvote-btn');
        if (upvoteBtn) upvoteBtn.disabled = !currentUser;
        if (downvoteBtn) downvoteBtn.disabled = !currentUser;
    });

    // Tangani tombol vote di modal (jika terbuka)
    const modalUpvoteBtn = document.querySelector('#storyModal .upvote-btn');
    const modalDownvoteBtn = document.querySelector('#storyModal .downvote-btn');

    if (modalUpvoteBtn) modalUpvoteBtn.disabled = !currentUser;
    if (modalDownvoteBtn) modalDownvoteBtn.disabled = !currentUser;
}

// Fungsi Baru: Membuka Modal Edit Cerita
function openEditStoryModal(story) {
    if (!editStoryModal) {
        console.error("Modal Edit Cerita tidak ditemukan.");
        return;
    }

    // Isi form dengan data cerita
    editStoryIdInput.value = story.id;
    editTitleInput.value = story.title;
    editLocationInput.value = story.location;
    editContentInput.value = story.content;
    editCurrentPhotoInput.value = story.photo || ''; 
    
    // Tampilkan preview foto saat ini
    currentPhotoPreviewDiv.innerHTML = '';
    if (story.photo) {
        currentPhotoPreviewDiv.innerHTML = `<img src="uploads/${story.photo}" alt="Foto Lama" style="max-width: 150px; max-height: 150px; object-fit: cover; border-radius: 5px;">`;
        removePhotoCheckbox.checked = false; 
    } else {
        currentPhotoPreviewDiv.innerHTML = 'Tidak ada foto terunggah.';
        removePhotoCheckbox.checked = false;
    }

    // Reset input file dan preview foto baru
    editPhotoInput.value = '';
    editFilePreviewDiv.innerHTML = '';

    editStoryModal.style.display = 'block';
    if (editStoryMessageContainer) editStoryMessageContainer.innerHTML = ''; 
}

// Fungsi untuk Menutup Modal Edit Cerita
window.closeEditStoryModal = function() {
    if (editStoryModal) {
        editStoryModal.style.display = 'none';
    }
    if (editStoryMessageContainer) editStoryMessageContainer.innerHTML = ''; 
};

// Fungsi untuk Menangani Submit Form Edit Cerita
function setupEditStoryFormHandler() {
    if (editStoryForm) {
        // Event listener untuk preview foto baru yang diupload
        editPhotoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    editFilePreviewDiv.innerHTML = `<img src="${e.target.result}" alt="Preview Foto Baru" style="max-width: 150px; max-height: 150px; object-fit: cover; border-radius: 5px;">`;
                };
                reader.readAsDataURL(file);
                removePhotoCheckbox.checked = false; 
            } else {
                editFilePreviewDiv.innerHTML = '';
            }
        });

        // Event listener untuk checkbox hapus foto
        removePhotoCheckbox.addEventListener('change', function() {
            if (this.checked) {
                editPhotoInput.value = ''; 
                editFilePreviewDiv.innerHTML = ''; 
            }
        });

        editStoryForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const submitBtn = this.querySelector('.submit-btn');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<div class="loading"></div> Menyimpan...';
            submitBtn.disabled = true;

            const formData = new FormData();
            formData.append('story_id', editStoryIdInput.value);
            formData.append('title', editTitleInput.value);
            formData.append('content', editContentInput.value);
            formData.append('location', editLocationInput.value);
            formData.append('current_photo', editCurrentPhotoInput.value); 

            if (editPhotoInput.files.length > 0) {
                formData.append('photo', editPhotoInput.files[0]);
            }
            if (removePhotoCheckbox.checked) {
                formData.append('remove_photo', 'true');
            }

            try {
                const response = await fetch('edit_story.php', {
                    method: 'POST',
                    body: formData 
                });

                const data = await response.json();
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(data.message || 'Network response was not ok: ' + errorText);
                }

                if (data.success) {
                    showMessage(data.message, 'success', true); 
                    closeEditStoryModal();
                    // Setelah sukses edit, muat ulang cerita untuk memperbarui tampilan
                    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                        loadStoriesForIndexPage();
                    } else if (window.location.pathname.includes('stories.html')) {
                        storiesPageCurrentPage = 1; 
                        loadStoriesForStoriesPage();
                    }
                } else {
                    showMessage(data.message || 'Gagal menyimpan perubahan.', 'error', false, editStoryMessageContainer);
                }
            } catch (error) {
                console.error('Error mengirim edit:', error);
                showMessage('Terjadi kesalahan saat menyimpan perubahan.', 'error', false, editStoryMessageContainer);
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
}

// Fungsi untuk Menghapus Cerita
async function deleteStory(storyId) {
    if (!currentUser) {
        showMessage('Anda harus login untuk menghapus cerita.', 'warning', true);
        return;
    }

    showCustomConfirm('Apakah Anda yakin ingin menghapus cerita ini? Tindakan ini tidak dapat dibatalkan.', async (confirmed) => {
        if (!confirmed) {
            return; 
        }

        try {
            const response = await fetch('delete_story.php', {
                method: 'POST', 
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ story_id: storyId })
            });

            const data = await response.json();
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(data.message || 'Network response was not ok: ' + errorText);
            }

            if (data.success) {
                showMessage(data.message, 'success', true);
                // Hapus kartu cerita dari DOM
                const deletedCard = document.getElementById(`story-${storyId}`);
                if (deletedCard) {
                    deletedCard.remove();
                }
                // Muat ulang cerita untuk memastikan konsistensi paginasi, dll.
                if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                    currentPage = 1; 
                    loadStoriesForIndexPage();
                } else if (window.location.pathname.includes('stories.html')) {
                    storiesPageCurrentPage = 1; 
                    loadStoriesForStoriesPage();
                }
            } else {
                showMessage(data.message || 'Gagal menghapus cerita.', 'error', true);
            }
        } catch (error) {
            console.error('Error menghapus cerita:', error);
            showMessage('Terjadi kesalahan saat menghapus cerita.', 'error', true);
        }
    });
}

window.scrollToSection = function(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
};

function showCustomConfirm(message, callbackFunction) {
    if (!customConfirmModal || !customConfirmMessage || !customConfirmYesBtn || !customConfirmNoBtn) {
        console.error("Elemen modal konfirmasi kustom tidak ditemukan.");
        // Fallback ke native confirm jika elemen tidak ada
        const nativeConfirmResult = confirm(message);
        callbackFunction(nativeConfirmResult);
        return;
    }

    customConfirmMessage.textContent = message;
    customConfirmModal.style.display = 'block';

    // Pastikan event listener lama dihapus sebelum menambahkan yang baru
    customConfirmYesBtn.onclick = null;
    customConfirmNoBtn.onclick = null;
    closeCustomConfirmModalBtn.onclick = null;

    customConfirmYesBtn.onclick = function() {
        closeCustomConfirmModal();
        callbackFunction(true);
    };

    customConfirmNoBtn.onclick = function() {
        closeCustomConfirmModal();
        callbackFunction(false);
    };
    
    closeCustomConfirmModalBtn.onclick = function() {
        closeCustomConfirmModal();
        callbackFunction(false); // Mengklik 'x' juga dianggap 'Tidak'
    };
}

// Fungsi untuk Menutup Modal Konfirmasi Kustom
window.closeCustomConfirmModal = function() {
    if (customConfirmModal) {
        customConfirmModal.style.display = 'none';
        // Hapus event listener untuk mencegah duplikasi di panggilan berikutnya
        customConfirmYesBtn.onclick = null;
        customConfirmNoBtn.onclick = null;
        closeCustomConfirmModalBtn.onclick = null;
    }
};
