// Variabel global khusus untuk halaman stories.html
let storiesPageCurrentPage = 1;
let storiesPageTotalPages = 1;
let storiesPageIsLoading = false;
let currentSearchQuery = ''; 

// Deklarasikan variabel di scope global
let storiesGrid;
let loadMoreBtn;
let storySearchInput; 
let clearSearchBtn; 
let searchResultsDropdown; 
let highlightedSuggestionIndex = -1; 

// Helper untuk debouncing
let searchTimeout;
const DEBOUNCE_DELAY = 300; 
const SUGGESTIONS_DEBOUNCE_DELAY = 150; 

// Debounce khusus saran baru
let suggestionTimeout;

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("stories.js: DOMContentLoaded terpicu.");

    // Inisialisasi elemen DOM di sini
    storiesGrid = document.getElementById('storiesGrid');
    loadMoreBtn = document.getElementById('loadMoreBtn');
    storySearchInput = document.getElementById('storySearchInput');
    clearSearchBtn = document.getElementById('clearSearchBtn');
    searchResultsDropdown = document.getElementById('searchResultsDropdown');

    // Pemeriksaan keamanan awal
    if (!storiesGrid || !loadMoreBtn || !storySearchInput || !clearSearchBtn || !searchResultsDropdown) {
        console.error("stories.js: Elemen storiesGrid, loadMoreBtn, storySearchInput, clearSearchBtn, atau searchResultsDropdown tidak ditemukan. Pastikan ID HTML sudah benar.");
        return; 
    }

    loadStoriesForStoriesPage(); 
    loadMoreBtn.addEventListener('click', loadMoreStories);

    // Event listener untuk search input (debounced untuk PENCARIAN UTAMA & Saran)
    storySearchInput.addEventListener('keyup', function(e) {
        // Cek tombol panah atas/bawah dan Enter untuk navigasi saran
        if (searchResultsDropdown.style.display === 'block' && searchResultsDropdown.children[0] && searchResultsDropdown.children[0].children.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault(); 
                highlightSuggestion(1);
                return;
            } else if (e.key === 'ArrowUp') {
                e.preventDefault(); 
                highlightSuggestion(-1);
                return;
            } else if (e.key === 'Enter') {
                e.preventDefault(); 
                if (highlightedSuggestionIndex !== -1) {
                    const highlightedText = searchResultsDropdown.querySelector('li.highlighted').textContent;
                    storySearchInput.value = highlightedText;
                    currentSearchQuery = highlightedText; 
                } else {
                    currentSearchQuery = this.value.trim(); 
                }
                storiesPageCurrentPage = 1;
                loadStoriesForStoriesPage();
                hideSuggestions(); 
                return;
            }
        }

        // Logika untuk mengambil saran (debounce lebih cepat)
        clearTimeout(suggestionTimeout);
        const inputVal = this.value.trim();
        if (inputVal.length > 1) { 
            suggestionTimeout = setTimeout(() => {
                fetchSuggestions(inputVal);
            }, SUGGESTIONS_DEBOUNCE_DELAY);
        } else {
            hideSuggestions();
        }

        // Logika untuk pencarian utama (debounce lebih lambat)
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const newQuery = this.value.trim();
            if (newQuery !== currentSearchQuery) {
                currentSearchQuery = newQuery;
                storiesPageCurrentPage = 1; 
                loadStoriesForStoriesPage();
            }
            clearSearchBtn.style.display = newQuery ? 'block' : 'none';
        }, DEBOUNCE_DELAY);
    });

    // Event listener untuk tombol clear search
    clearSearchBtn.addEventListener('click', function() {
        storySearchInput.value = ''; 
        currentSearchQuery = ''; 
        storiesPageCurrentPage = 1; 
        loadStoriesForStoriesPage(); 
        clearSearchBtn.style.display = 'none'; 
        hideSuggestions(); 
        storySearchInput.focus(); 
    });

    // Sembunyikan saran jika klik di luar search bar atau dropdown
    document.addEventListener('click', function(e) {
        if (!storySearchInput.contains(e.target) && !searchResultsDropdown.contains(e.target)) {
            hideSuggestions();
        }
    });

    // Saat input fokus, tampilkan kembali saran jika ada query dan saran sebelumnya
    storySearchInput.addEventListener('focus', function() {
        if (currentSearchQuery && searchResultsDropdown.innerHTML.trim() !== '' && searchResultsDropdown.querySelectorAll('li').length > 0) {
            searchResultsDropdown.style.display = 'block';
        }
    });
});

async function fetchSuggestions(query) {
    if (!query) {
        hideSuggestions();
        return;
    }
    try {
        const response = await fetch(`get_suggestions.php?query=${encodeURIComponent(query)}`);
        if (!response.ok) { 
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
        }
        const data = await response.json();
        if (data.success && data.suggestions.length > 0) {
            displaySuggestions(data.suggestions);
        } else {
            hideSuggestions();
        }
    } catch (error) {
        console.error('Error mengambil saran:', error);
        if (typeof showMessage === 'function') { 
            showMessage('Terjadi kesalahan saat mengambil saran.', 'error', true);
        }
        hideSuggestions();
    }
}

function displaySuggestions(suggestions) {
    searchResultsDropdown.innerHTML = '';
    const ul = document.createElement('ul');
    suggestions.forEach((suggestion, index) => {
        const li = document.createElement('li');
        li.textContent = suggestion;
        li.addEventListener('click', () => {
            storySearchInput.value = suggestion;
            currentSearchQuery = suggestion; 
            storiesPageCurrentPage = 1;
            loadStoriesForStoriesPage(); 
            hideSuggestions(); 
            storySearchInput.focus(); 
            clearSearchBtn.style.display = 'block'; 
        });
        ul.appendChild(li);
    });
    searchResultsDropdown.appendChild(ul);
    searchResultsDropdown.style.display = 'block';
    highlightedSuggestionIndex = -1; 
}

function hideSuggestions() {
    if (searchResultsDropdown) {
        searchResultsDropdown.style.display = 'none';
        searchResultsDropdown.innerHTML = '';
        highlightedSuggestionIndex = -1;
    }
}

function highlightSuggestion(direction) {
    const items = searchResultsDropdown.querySelectorAll('li');
    if (items.length === 0) return;

    if (highlightedSuggestionIndex !== -1) {
        items[highlightedSuggestionIndex].classList.remove('highlighted');
    }

    highlightedSuggestionIndex += direction;

    if (highlightedSuggestionIndex >= items.length) {
        highlightedSuggestionIndex = 0;
    } else if (highlightedSuggestionIndex < 0) {
        highlightedSuggestionIndex = items.length - 1;
    }

    items[highlightedSuggestionIndex].classList.add('highlighted');
    storySearchInput.value = items[highlightedSuggestionIndex].textContent;
}

async function loadStoriesForStoriesPage() {
    console.log(`stories.js: loadStoriesForStoriesPage() dipanggil. Halaman: ${storiesPageCurrentPage}, Query: "${currentSearchQuery}".`);
    if (storiesPageIsLoading) {
        console.log("stories.js: loadStoriesForStoriesPage() dibatalkan, sedang memuat.");
        return;
    }

    storiesPageIsLoading = true;

    if (!storiesGrid || !loadMoreBtn) {
         console.error("stories.js: storiesGrid atau loadMoreBtn tidak ditemukan saat memuat cerita.");
         storiesPageIsLoading = false;
         return;
    }

    let apiUrl = `get_stories.php?page=${storiesPageCurrentPage}`;
    if (currentSearchQuery) {
        apiUrl += `&query=${encodeURIComponent(currentSearchQuery)}`; 
    }
    console.log("stories.js: Memanggil API:", apiUrl);

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
        }
        const data = await response.json();
        console.log("stories.js: Data diterima dari API:", data);

        if (data.success) {
            if (storiesPageCurrentPage === 1) {
                storiesGrid.innerHTML = ''; 
                if (data.stories.length === 0) { 
                     const imagePath = 'assets/no_results.svg'; 
                     const noResultsHtml = `
                        <div style="text-align: center; margin-top: 2rem; width: 100%;">
                            <img src="${imagePath}" alt="Tidak Ditemukan" onerror="this.onerror=null;this.src='https://via.placeholder.com/200?text=No+Results';" style="max-width: 200px; opacity: 0.7; margin-bottom: 1rem;">
                            <p style="font-size: 1.2rem; color: #666;">Tidak ada cerita yang cocok dengan pencarian Anda.</p>
                        </div>`;
                     storiesGrid.innerHTML = noResultsHtml;
                     console.log("stories.js: Tidak ada cerita yang cocok.");
                }
            }

            if (data.stories.length > 0) {
                 data.stories.forEach(story => {
                    // createStoryCard adalah fungsi global dari script.js
                    if (typeof createStoryCard === 'function') { 
                        const storyCard = createStoryCard(story);
                        storiesGrid.appendChild(storyCard);
                    } else {
                        console.error("stories.js: Fungsi createStoryCard tidak ditemukan. Apakah script.js dimuat dengan benar?");
                    }
                });
                console.log(`stories.js: ${data.stories.length} cerita berhasil ditambahkan.`);
            }
            
            storiesPageTotalPages = data.total_pages; 
            console.log("stories.js: Total halaman:", storiesPageTotalPages);

            if (storiesPageCurrentPage < storiesPageTotalPages) {
                loadMoreBtn.style.display = 'block';
                console.log("stories.js: Tombol 'Muat Lebih Banyak' ditampilkan.");
            } else {
                loadMoreBtn.style.display = 'none';
                console.log("stories.js: Tombol 'Muat Lebih Banyak' disembunyikan (sudah halaman terakhir).");
            }

        } else {
            if (typeof showMessage === 'function') {
                showMessage(data.message || 'Gagal memuat cerita.', 'error', true); 
            } else {
                console.error("stories.js: Fungsi showMessage tidak ditemukan.");
            }
            console.error("stories.js: Respons API gagal:", data.message);
        }
    } catch (error) {
        console.error('stories.js: Terjadi kesalahan saat memuat cerita:', error);
        if (typeof showMessage === 'function') {
            showMessage('Terjadi kesalahan saat memuat cerita. Cek konsol browser untuk detail.', 'error', true); 
        } else {
            console.error("stories.js: Fungsi showMessage tidak ditemukan, tidak dapat menampilkan pesan global.");
        }
    } finally {
        storiesPageIsLoading = false;
        console.log("stories.js: Pemuatan selesai.");
    }
}

function loadMoreStories() {
    console.log("stories.js: loadMoreStories() dipanggil.");
    if (storiesPageCurrentPage < storiesPageTotalPages) { 
        storiesPageCurrentPage++;
        loadStoriesForStoriesPage();
    } else {
        if (typeof showMessage === 'function') {
            showMessage('Semua cerita sudah ditampilkan.', 'info', true);
        }
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    }
}
