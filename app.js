/* ==========================================================================
   JIMIKKI HERITAGE CATALOG — IN-PAGE OVERLAY CONTROLLER
   No page navigation. openJimikkiCatalog() / closeJimikkiCatalog() are
   called directly from index.html button onclick attributes.
   ========================================================================== */
(function () {
    'use strict';

    // ---- Image list (matches /jimiki/ directory) ----
    const overlayArchives = [
        "1.jpg","2.jpg","3.jpg","4.jpg","5.jpg","6.jpg","7.jpg","8.jpg","9.jpg","10.jpg",
        "11.jpg","12.jpg","13.jpg","14.jpg","15.jpg","16.jpg","17.jpg","18.jpg","19.jpg","20.jpg",
        "21.jpg","22.jpg","23.jpg","24.jpg","25.jpg","26.jpg","27.jpg","28.jpg","29.jpg","30.jpg",
        "31.jpg","32.jpg","33.jpg","34.jpg","35.jpg","36.jpg","37.jpg","38.jpg","39.jpg","40.jpg",
        "41.jpg","42.jpg","43.jpg","44.jpg","45.jpg","46.jpg","47.jpg","48.jpg","49.jpg","50.jpg",
        "51.jpg","52.jpg","53.jpg","54.jpg","55.jpg","56.jpg","57.jpg","58.jpg","59.jpg","60.jpg",
        "61.jpg","64.jpg","65.jpg","66.jpg","67.jpg","68.jpg","69.jpg","70.jpg","71.jpg","72.jpg",
        "73.jpg","74.jpg","75.jpg","76.jpg","77.jpg","78.jpg","79.jpg","80.jpg","81.jpg","82.jpg",
        "83.jpg","84.jpg","85.jpg","86.jpg","87.jpg","88.jpg","89.jpg","90.jpg","91.jpg","92.jpg",
        "93.jpg","95.jpg","96.jpg","97.jpg","98.jpg","99.jpg","100.jpg","101.jpg","102.jpg","103.jpg",
        "104.jpg"
    ];

    let overlayIdx = 0;
    let overlayReady = false;

    // ---- DOM refs (resolved on first open) ----
    let overlay, grid, imgDisplay, btnPrev, btnNext, refName, counter, btnVault, btnBack;

    function resolveRefs() {
        overlay    = document.getElementById('jimikkiCatalogOverlay');
        grid       = document.getElementById('overlayCatalogGrid');
        imgDisplay = document.getElementById('overlayImgDisplay');
        btnPrev    = document.getElementById('overlayBtnPrev');
        btnNext    = document.getElementById('overlayBtnNext');
        refName    = document.getElementById('overlayRefName');
        counter    = document.getElementById('overlayCounter');
        btnVault   = document.getElementById('overlayBtnVault');
        btnBack    = document.getElementById('btnCatalogBack');
    }

    // ---- Update the large preview image ----
    function overlayShow(idx) {
        overlayIdx = (idx + overlayArchives.length) % overlayArchives.length;
        const src = './jimiki/' + overlayArchives[overlayIdx];

        if (imgDisplay) {
            imgDisplay.style.opacity = '0';
            setTimeout(() => {
                imgDisplay.src = src;
                imgDisplay.style.opacity = '1';
            }, 130);
        }
        if (refName)  refName.textContent  = 'Heritage Design #' + (overlayIdx + 1);
        if (counter)  counter.textContent  = (overlayIdx + 1) + ' / ' + overlayArchives.length;

        // Highlight active thumbnail
        if (grid) {
            grid.querySelectorAll('img').forEach((t, i) => {
                t.style.border = i === overlayIdx
                    ? '2px solid #bf953f'
                    : '1px solid rgba(255,255,255,0.08)';
                t.style.boxShadow = i === overlayIdx ? '0 0 10px rgba(191,149,63,0.5)' : 'none';
                if (i === overlayIdx) t.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
        }
    }

    // ---- Build thumbnail grid (once) ----
    function buildGrid() {
        if (!grid || overlayReady) return;
        overlayReady = true;
        grid.innerHTML = '';
        overlayArchives.forEach((file, idx) => {
            const img = document.createElement('img');
            img.src = './jimiki/' + file;
            img.alt = 'Heritage Jimikki #' + (idx + 1);
            img.loading = 'lazy';
            img.style.cssText = [
                'width:100%','height:auto','aspect-ratio:1/1','object-fit:cover',
                'border-radius:4px','cursor:pointer','transition:all 0.2s',
                'border:1px solid rgba(255,255,255,0.08)','background:#111'
            ].join(';');
            img.addEventListener('click', () => overlayShow(idx));
            grid.appendChild(img);
        });
    }

    // ---- Swipe support ----
    function attachSwipe(el) {
        let sx = 0;
        el.addEventListener('touchstart', e => { sx = e.changedTouches[0].screenX; }, { passive: true });
        el.addEventListener('touchend', e => {
            const dx = e.changedTouches[0].screenX - sx;
            if (Math.abs(dx) > 50) overlayShow(overlayIdx + (dx < 0 ? 1 : -1));
        }, { passive: true });
    }

    // ---- Open overlay (global — called by index.html button) ----
    window.openJimikkiCatalog = function () {
        resolveRefs();
        if (!overlay) return;

        buildGrid();
        overlayShow(overlayIdx);

        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Wire buttons (idempotent — guard with data attr)
        if (!overlay.dataset.wired) {
            overlay.dataset.wired = '1';

            btnBack.addEventListener('click', window.closeJimikkiCatalog);
            btnPrev.addEventListener('click', () => overlayShow(overlayIdx - 1));
            btnNext.addEventListener('click', () => overlayShow(overlayIdx + 1));

            // Keyboard nav
            document.addEventListener('keydown', e => {
                if (overlay.style.display !== 'flex') return;
                if (e.key === 'ArrowLeft')  overlayShow(overlayIdx - 1);
                if (e.key === 'ArrowRight') overlayShow(overlayIdx + 1);
                if (e.key === 'Escape')     window.closeJimikkiCatalog();
            });

            // Swipe on right canvas section
            const canvas = overlay.querySelector('section');
            if (canvas) attachSwipe(canvas);

            // Vault button
            btnVault.addEventListener('click', () => {
                const file = overlayArchives[overlayIdx];
                const cart = JSON.parse(localStorage.getItem('ad_jewels_cart') || '[]');
                cart.push({
                    id: Date.now() + Math.random().toString(36).substr(2, 5),
                    design: 'jimikki',
                    name: 'Jimikki Earrings',
                    specs: 'Purity: 22K Yellow Gold | Est. Weight: 42.5g | Accents: Kemp Rubies & Diamonds',
                    notes: '[Reference Photo: ' + file + ']',
                    image: './jimiki/' + file
                });
                localStorage.setItem('ad_jewels_cart', JSON.stringify(cart));

                const orig = btnVault.textContent;
                btnVault.textContent = '✦ Added to Vault! ✦';
                btnVault.style.background = '#fcf6ba';
                setTimeout(() => {
                    btnVault.textContent = orig;
                    btnVault.style.background = '#bf953f';
                }, 2000);
            });
        }
    };

    // ---- Close overlay + scroll to #gallery (global) ----
    window.closeJimikkiCatalog = function () {
        resolveRefs();
        if (!overlay) return;
        overlay.style.display = 'none';
        document.body.style.overflow = '';

        // Scroll to Royal Masterpiece Gallery — no page reload
        const gallery = document.getElementById('gallery');
        if (gallery) {
            setTimeout(() => gallery.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
        }
    };

}());

/* ==========================================================================
   KAASU MAALAI HERITAGE CATALOG — IN-PAGE OVERLAY CONTROLLER
   ========================================================================== */
(function () {
    'use strict';

    // 136 images from /kaasu malai/ folder (URL-encoded path for browser)
    const kaasuArchives = [
        "1.jpg","2.jpg","3.jpg","4.jpg","5.jpg","6.jpg","7.jpg","8.jpg","9.jpg","10.jpg",
        "11.jpg","12.jpg","13.jpg","14.jpg","15.jpg","16.jpg","17.jpg","18.jpg","19.jpg","20.jpg",
        "21.jpg","22.jpg","23.jpg","24.jpg","25.jpg","26.jpg","27.jpg","28.jpg","29.jpg","30.jpg",
        "31.jpg","32.jpg","33.jpg","34.jpg","35.jpg","36.jpg","37.jpg","38.jpg","39.jpg","40.jpg",
        "41.jpg","42.jpg","43.jpg","44.jpg","45.jpg","46.jpg","47.jpg","48.jpg","49.jpg","50.jpg",
        "51.jpg","52.jpg","53.jpg","54.jpg","55.jpg","56.jpg","57.jpg","58.jpg","59.jpg","60.jpg",
        "61.jpg","62.jpg","63.jpg","64.jpg","65.jpg","66.jpg","67.jpg","68.jpg","69.jpg","70.jpg",
        "71.jpg","72.jpg","73.jpg","74.jpg","75.jpg","76.jpg","77.jpg","78.jpg","79.jpg","80.jpg",
        "81.jpg","82.jpg","83.jpg","84.jpg","85.jpg","86.jpg","87.jpg","88.jpg","89.jpg","90.jpg",
        "91.jpg","92.jpg","93.jpg","94.jpg","95.jpg","96.jpg","97.jpg","98.jpg","99.jpg","100.jpg",
        "101.jpg","102.jpg","103.jpg","104.jpg","105.jpg","106.jpg","107.jpg","108.jpg","109.jpg","110.jpg",
        "111.jpg","112.jpg","113.jpg","114.jpg","115.jpg","116.jpg","117.jpg","118.jpg","119.jpg","120.jpg",
        "121.jpg","122.jpg","123.jpg","124.jpg","125.jpg","126.jpg","127.jpg","128.jpg","129.jpg","130.jpg",
        "131.jpg","132.jpg","133.jpg","134.jpg","135.jpg","136.jpg"
    ];
    // Folder name has a space — encode it for the browser URL
    const KAASU_DIR = './kaasu%20malai/';

    let kaasuIdx = 0;
    let kaasuReady = false;
    let kOverlay, kGrid, kImg, kBtnPrev, kBtnNext, kRefName, kCounter, kBtnVault, kBtnBack;

    function kResolve() {
        kOverlay  = document.getElementById('kaasuMaalaiCatalogOverlay');
        kGrid     = document.getElementById('kaasuCatalogGrid');
        kImg      = document.getElementById('kaasuImgDisplay');
        kBtnPrev  = document.getElementById('kaasuBtnPrev');
        kBtnNext  = document.getElementById('kaasuBtnNext');
        kRefName  = document.getElementById('kaasuRefName');
        kCounter  = document.getElementById('kaasuCounter');
        kBtnVault = document.getElementById('kaasuBtnVault');
        kBtnBack  = document.getElementById('btnKaasuBack');
    }

    function kShow(idx) {
        kaasuIdx = (idx + kaasuArchives.length) % kaasuArchives.length;
        const src = KAASU_DIR + kaasuArchives[kaasuIdx];
        if (kImg) {
            kImg.style.opacity = '0';
            setTimeout(() => { kImg.src = src; kImg.style.opacity = '1'; }, 130);
        }
        if (kRefName) kRefName.textContent = 'Kaasu Maalai Design #' + (kaasuIdx + 1);
        if (kCounter) kCounter.textContent  = (kaasuIdx + 1) + ' / ' + kaasuArchives.length;
        if (kGrid) {
            kGrid.querySelectorAll('img').forEach((t, i) => {
                t.style.border     = i === kaasuIdx ? '2px solid #bf953f' : '1px solid rgba(255,255,255,0.08)';
                t.style.boxShadow  = i === kaasuIdx ? '0 0 10px rgba(191,149,63,0.5)' : 'none';
                if (i === kaasuIdx) t.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
        }
    }

    function kBuildGrid() {
        if (!kGrid || kaasuReady) return;
        kaasuReady = true;
        kGrid.innerHTML = '';
        kaasuArchives.forEach((file, idx) => {
            const img = document.createElement('img');
            img.src     = KAASU_DIR + file;
            img.alt     = 'Kaasu Maalai #' + (idx + 1);
            img.loading = 'lazy';
            img.style.cssText = 'width:100%;height:auto;aspect-ratio:1/1;object-fit:cover;border-radius:4px;cursor:pointer;transition:all 0.2s;border:1px solid rgba(255,255,255,0.08);background:#111';
            img.addEventListener('click', () => kShow(idx));
            kGrid.appendChild(img);
        });
    }

    window.openKaasuMaalaiCatalog = function () {
        kResolve();
        if (!kOverlay) return;
        kBuildGrid();
        kShow(kaasuIdx);
        kOverlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        if (!kOverlay.dataset.wired) {
            kOverlay.dataset.wired = '1';
            kBtnBack.addEventListener('click',  window.closeKaasuMaalaiCatalog);
            kBtnPrev.addEventListener('click',  () => kShow(kaasuIdx - 1));
            kBtnNext.addEventListener('click',  () => kShow(kaasuIdx + 1));

            document.addEventListener('keydown', e => {
                if (kOverlay.style.display !== 'flex') return;
                if (e.key === 'ArrowLeft')  kShow(kaasuIdx - 1);
                if (e.key === 'ArrowRight') kShow(kaasuIdx + 1);
                if (e.key === 'Escape')     window.closeKaasuMaalaiCatalog();
            });

            // Swipe on canvas section
            const canvas = kOverlay.querySelector('section');
            if (canvas) {
                let sx = 0;
                canvas.addEventListener('touchstart', e => { sx = e.changedTouches[0].screenX; }, { passive: true });
                canvas.addEventListener('touchend',   e => {
                    const dx = e.changedTouches[0].screenX - sx;
                    if (Math.abs(dx) > 50) kShow(kaasuIdx + (dx < 0 ? 1 : -1));
                }, { passive: true });
            }

            kBtnVault.addEventListener('click', () => {
                const file = kaasuArchives[kaasuIdx];
                const cart = JSON.parse(localStorage.getItem('ad_jewels_cart') || '[]');
                cart.push({
                    id:     Date.now() + Math.random().toString(36).substr(2, 5),
                    design: 'kasumalai',
                    name:   'Kaasu Maalai',
                    specs:  'Purity: 22K Antique Gold | Est. Weight: 125.0g | Accents: Lakshmi reliefs & Kemp Rubies',
                    notes:  '[Reference Photo: ' + file + ']',
                    image:  KAASU_DIR + file
                });
                localStorage.setItem('ad_jewels_cart', JSON.stringify(cart));
                const orig = kBtnVault.textContent;
                kBtnVault.textContent = '\u2726 Added to Vault! \u2726';
                kBtnVault.style.background = '#fcf6ba';
                setTimeout(() => { kBtnVault.textContent = orig; kBtnVault.style.background = '#bf953f'; }, 2000);
            });
        }
    };

    window.closeKaasuMaalaiCatalog = function () {
        kResolve();
        if (!kOverlay) return;
        kOverlay.style.display = 'none';
        document.body.style.overflow = '';
        const gallery = document.getElementById('gallery');
        if (gallery) setTimeout(() => gallery.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    };

}());

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // Application state
    const state = {
        activeProduct: 'jimikki',
        isPlayingSound: false
    };

    /* ==========================================================================
       1. LUXURIOUS SPLASH SCREEN TIMER (4-Second Hold)
       ========================================================================== */
    const splash = document.getElementById('luxurySplash');
    if (splash) {
        // Only show the splash on a fresh first visit — skip it when returning from subpage
        const isReturning = splash.style.display === 'none' || splash.style.opacity === '0';
        if (!isReturning) {
            setTimeout(() => {
                splash.classList.add('fade-out');
                setTimeout(() => {
                    splash.style.display = 'none';
                }, 800);
            }, 4000);
        }
    }

    /* ==========================================================================
       2. RESPONSIVE MOBILE & DESKTOP NAVIGATION
       ========================================================================== */
    const mobileNavToggle = document.getElementById('mobileNavToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    const navLinks = document.querySelectorAll('.nav-link, .mobile-link');

    if (mobileNavToggle && mobileMenu) {
        mobileNavToggle.addEventListener('click', () => {
            mobileNavToggle.classList.toggle('active');
            mobileMenu.classList.toggle('open');
        });
    }

    // Close mobile menu on nav links and manage active states
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (mobileNavToggle && mobileMenu) {
                mobileNavToggle.classList.remove('active');
                mobileMenu.classList.remove('open');
            }

            // Highlighting desktop/mobile active nav link
            const currentTab = link.getAttribute('data-tab');
            navLinks.forEach(l => {
                if (l.getAttribute('data-tab') === currentTab) {
                    l.classList.add('active');
                } else {
                    l.classList.remove('active');
                }
            });

            // Handle Gallery tab click - scroll to showroom and activate Jimikki gallery
            if (currentTab === 'Gallery') {
                const jimikkiCard = document.querySelector('.catalog-item[data-product-info="jimikki"]');
                if (jimikkiCard) {
                    jimikkiCard.click();
                    setTimeout(() => {
                        jimikkiCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 100);
                }
            }
        });
    });

    /* ==========================================================================
       3. MASTERPIECE CATALOG & IMPERIAL CONCIERGE SYNC & HERITAGE ARCHIVE GALLERY
       ========================================================================== */
    const catalogItems = document.querySelectorAll('.catalog-item');
    const conciergeDesign = document.getElementById('conciergeDesign');
    const conciergeForm = document.getElementById('conciergeForm');
    const conciergeSuccessScreen = document.getElementById('conciergeSuccessScreen');
    const btnReturnToConcierge = document.getElementById('btnReturnToConcierge');

    // Gallery Elements
    const conciergeGalleryContainer = document.getElementById('conciergeGalleryContainer');
    const archiveCatalogGrid = document.getElementById('archiveCatalogGrid');
    const archiveRefName = document.getElementById('archiveRefName');
    const btnPrevArchive = document.getElementById('btnPrevArchive');
    const btnNextArchive = document.getElementById('btnNextArchive');
    const imgArchiveDisplay = document.getElementById('imgArchiveDisplay');
    const archiveCounter = document.getElementById('archiveCounter');

    // Complete archive of real photographs — filenames updated to sequential numbering (1.jpg–104.jpg)
    const jimikkiArchives = [
        "1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg",
        "6.jpg", "7.jpg", "8.jpg", "9.jpg", "10.jpg",
        "11.jpg", "12.jpg", "13.jpg", "14.jpg", "15.jpg",
        "16.jpg", "17.jpg", "18.jpg", "19.jpg", "20.jpg",
        "21.jpg", "22.jpg", "23.jpg", "24.jpg", "25.jpg",
        "26.jpg", "27.jpg", "28.jpg", "29.jpg", "30.jpg",
        "31.jpg", "32.jpg", "33.jpg", "34.jpg", "35.jpg",
        "36.jpg", "37.jpg", "38.jpg", "39.jpg", "40.jpg",
        "41.jpg", "42.jpg", "43.jpg", "44.jpg", "45.jpg",
        "46.jpg", "47.jpg", "48.jpg", "49.jpg", "50.jpg",
        "51.jpg", "52.jpg", "53.jpg", "54.jpg", "55.jpg",
        "56.jpg", "57.jpg", "58.jpg", "59.jpg", "60.jpg",
        "61.jpg", "64.jpg", "65.jpg", "66.jpg", "67.jpg",
        "68.jpg", "69.jpg", "70.jpg", "71.jpg", "72.jpg",
        "73.jpg", "74.jpg", "75.jpg", "76.jpg", "77.jpg",
        "78.jpg", "79.jpg", "80.jpg", "81.jpg", "82.jpg",
        "83.jpg", "84.jpg", "85.jpg", "86.jpg", "87.jpg",
        "88.jpg", "89.jpg", "90.jpg", "91.jpg", "92.jpg",
        "93.jpg", "95.jpg", "96.jpg", "97.jpg", "98.jpg",
        "99.jpg", "100.jpg", "101.jpg", "102.jpg", "103.jpg",
        "104.jpg"
    ];

    let activeArchiveIdx = 0;

    function updateArchiveSlider() {
        if (!imgArchiveDisplay) return;
        const targetSrc = `./jimiki/${jimikkiArchives[activeArchiveIdx]}`;
        const currentSrc = imgArchiveDisplay.getAttribute('src');
        
        // Update active class on thumbnails instantly
        if (archiveCatalogGrid) {
            const thumbs = archiveCatalogGrid.querySelectorAll('.gallery-thumb');
            thumbs.forEach((thumb, idx) => {
                if (idx === activeArchiveIdx) {
                    thumb.classList.add('active-thumb');
                    // Automatically scroll the active thumbnail into view inside the horizontal ribbon
                    thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                } else {
                    thumb.classList.remove('active-thumb');
                }
            });
        }
        
        if (archiveCounter) {
            archiveCounter.textContent = `${activeArchiveIdx + 1} / ${jimikkiArchives.length}`;
        }
        if (archiveRefName) {
            archiveRefName.textContent = `Heritage Design #${activeArchiveIdx + 1}`;
        }

        if (currentSrc && currentSrc.endsWith(jimikkiArchives[activeArchiveIdx])) {
            return;
        }

        imgArchiveDisplay.style.opacity = '0';
        setTimeout(() => {
            imgArchiveDisplay.src = targetSrc;
            imgArchiveDisplay.style.opacity = '1';
        }, 150);
    }

    function renderArchiveCatalog() {
        if (!archiveCatalogGrid) return;
        
        // Render all 102 thumbnails dynamically if not already rendered
        if (archiveCatalogGrid.children.length === 0) {
            archiveCatalogGrid.innerHTML = '';
            jimikkiArchives.forEach((fileName, index) => {
                const img = document.createElement('img');
                img.src = `./jimiki/${fileName}`;
                img.alt = `Heritage Jimikki Reference #${index + 1}`;
                img.className = 'gallery-thumb';
                if (index === activeArchiveIdx) {
                    img.classList.add('active-thumb');
                }
                
                // Add click listener to thumbnail
                img.addEventListener('click', (e) => {
                    e.stopPropagation(); // Avoid triggering catalog selection resets
                    activeArchiveIdx = index;
                    updateArchiveSlider();
                });
                
                archiveCatalogGrid.appendChild(img);
            });
        }
        
        // Initial slide updates
        updateArchiveSlider();
    }

    function checkConciergeGallery() {
        if (!conciergeGalleryContainer || !conciergeDesign) return;
        if (conciergeDesign.value === 'jimikki') {
            conciergeGalleryContainer.style.display = 'block';
            renderArchiveCatalog();
        } else {
            conciergeGalleryContainer.style.display = 'none';
        }
    }

    // Prev / Next button listeners
    if (btnPrevArchive) {
        btnPrevArchive.addEventListener('click', (e) => {
            e.stopPropagation();
            activeArchiveIdx = (activeArchiveIdx - 1 + jimikkiArchives.length) % jimikkiArchives.length;
            updateArchiveSlider();
        });
    }

    if (btnNextArchive) {
        btnNextArchive.addEventListener('click', (e) => {
            e.stopPropagation();
            activeArchiveIdx = (activeArchiveIdx + 1) % jimikkiArchives.length;
            updateArchiveSlider();
        });
    }

    // Touch swipe support — works on both index.html (.gallery-preview-wrapper) and jimikki.html (.showcase-canvas)
    const previewWrapper = document.querySelector('.gallery-preview-wrapper') || document.querySelector('.showcase-canvas');
    if (previewWrapper) {
        let touchstartX = 0;
        let touchstartY = 0;
        let touchendX = 0;
        let touchendY = 0;

        previewWrapper.addEventListener('touchstart', (e) => {
            touchstartX = e.changedTouches[0].screenX;
            touchstartY = e.changedTouches[0].screenY;
        }, { passive: true });

        previewWrapper.addEventListener('touchend', (e) => {
            touchendX = e.changedTouches[0].screenX;
            touchendY = e.changedTouches[0].screenY;
            
            const diffX = touchendX - touchstartX;
            const diffY = touchendY - touchstartY;
            
            // Check if swipe is primary horizontal and exceeds threshold
            if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
                if (diffX < 0) {
                    // Swipe Left -> Next Image
                    activeArchiveIdx = (activeArchiveIdx + 1) % jimikkiArchives.length;
                } else {
                    // Swipe Right -> Prev Image
                    activeArchiveIdx = (activeArchiveIdx - 1 + jimikkiArchives.length) % jimikkiArchives.length;
                }
                updateArchiveSlider();
            }
        }, { passive: true });
    }


    if (conciergeGalleryContainer) {
        conciergeGalleryContainer.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    if (conciergeDesign) {
        conciergeDesign.addEventListener('change', () => {
            checkConciergeGallery();
        });
    }

    catalogItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetProduct = item.getAttribute('data-product-info');
            
            // Jimikki and Kaasu Maalai open their catalog overlays via dedicated buttons inside the card
            // The card click just sets the active selection state — no page redirect needed
            if (targetProduct === 'jimikki' || targetProduct === 'kasumalai') {
                // Fall through to set active state below
            } else {
                // For non-catalog items, just fall through to the active state logic below
            }

            // Remove active class from all items
            catalogItems.forEach(i => {
                i.classList.remove('active');
                const actionLabel = i.querySelector('.catalog-item-action');
                if (actionLabel) actionLabel.textContent = 'Select Masterpiece';
            });

            // Set active class
            item.classList.add('active');
            const activeActionLabel = item.querySelector('.catalog-item-action');
            if (activeActionLabel) activeActionLabel.textContent = 'Selected for Inquiry';

            // Sync design dropdown selection
            state.activeProduct = targetProduct;

            if (conciergeDesign && targetProduct) {
                conciergeDesign.value = targetProduct;
                checkConciergeGallery();
            }
        });
    });

    // Run once on load to initialize default selection
    checkConciergeGallery();

    // Auto-initialize Heritage archive catalog grid directly if on the dedicated subpage
    if (archiveCatalogGrid) {
        renderArchiveCatalog();
    }

    // "Add to my Vault" button on jimikki.html subpage
    const btnAddToVault = document.getElementById('btnAddToVault');
    if (btnAddToVault) {
        btnAddToVault.addEventListener('click', () => {
            const refPhoto = jimikkiArchives[activeArchiveIdx];
            if (!refPhoto) {
                showLuxuryToast('Please select a design first.');
                return;
            }

            const cart = JSON.parse(localStorage.getItem('ad_jewels_cart')) || [];

            const newItem = {
                id: Date.now() + Math.random().toString(36).substr(2, 5),
                design: 'jimikki',
                name: masterpieceNameDb['jimikki'] || 'Jimikki Earrings',
                specs: masterpieceSpecsDb['jimikki'] || 'Purity: 22K Yellow Gold | Est. Weight: 42.5g | Accents: Kemp Rubies & Diamonds',
                notes: `[Reference Photo: ${refPhoto}]`,
                image: `./jimiki/${refPhoto}`
            };

            cart.push(newItem);
            localStorage.setItem('ad_jewels_cart', JSON.stringify(cart));

            // Gold visual feedback: button glow + toast
            btnAddToVault.textContent = '✦ Added to Vault! ✦';
            btnAddToVault.style.background = '#fcf6ba';
            setTimeout(() => {
                btnAddToVault.textContent = '✦ Add to my Vault ✦';
                btnAddToVault.style.background = 'var(--text-gold)';
            }, 2000);

            showLuxuryToast(`✦ Heritage Reference Added to Your Vault!`);
        });
    }

    // Handle Bespoke Concierge Form Submission
    if (conciergeForm) {
        conciergeForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const nameVal = document.getElementById('conciergeName').value;
            const emailVal = document.getElementById('conciergeEmail').value;
            const phoneVal = document.getElementById('conciergePhone').value;
            const designVal = document.getElementById('conciergeDesign').value;
            const notesVal = document.getElementById('conciergeNotes').value;

            // Enforce YYYY-MM-DD placeholder date since endpoint requires it
            const today = new Date();
            const dateVal = today.toISOString().split('T')[0]; 

            const submitBtn = conciergeForm.querySelector('button[type="submit"]');
            const origText = submitBtn.textContent;
            submitBtn.textContent = 'Submitting Request...';
            submitBtn.disabled = true;

            // Securely append the currently active Heritage slide image reference to the notes
            let finalNotes = notesVal ? notesVal.trim() : '';
            if (designVal === 'jimikki') {
                const refPhoto = jimikkiArchives[activeArchiveIdx];
                finalNotes = `${finalNotes ? finalNotes + '\n' : ''}[Reference Photo: ${refPhoto}]`;
            }

            fetch('/api/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: nameVal,
                    email: emailVal,
                    phone: phoneVal,
                    date: dateVal,
                    design: designVal,
                    notes: finalNotes
                })
            })
            .then(res => res.json())
            .then(data => {
                submitBtn.textContent = origText;
                submitBtn.disabled = false;

                if (data.error) {
                    alert(`Submission failed: ${data.error}`);
                    return;
                }

                // Update success display elements using textContent for security
                const conciergeClientName = document.getElementById('conciergeClientName');
                const conciergeClientEmail = document.getElementById('conciergeClientEmail');
                const conciergeRefCode = document.getElementById('conciergeRefCode');

                if (conciergeClientName) conciergeClientName.textContent = data.clientName;
                if (conciergeClientEmail) conciergeClientEmail.textContent = data.clientEmail;
                if (conciergeRefCode) conciergeRefCode.textContent = data.refCode;

                conciergeForm.reset();
                // Ensure default view and design selection are recheck-initialized after form reset
                checkConciergeGallery();
                if (conciergeSuccessScreen) conciergeSuccessScreen.classList.add('active');
            })
            .catch(err => {
                submitBtn.textContent = origText;
                submitBtn.disabled = false;
                console.error("Concierge submit error:", err);
                alert("Vault communication error. Please ensure backend server is active.");
            });
        });
    }

    if (btnReturnToConcierge) {
        btnReturnToConcierge.addEventListener('click', () => {
            if (conciergeSuccessScreen) {
                conciergeSuccessScreen.classList.remove('active');
            }
        });
    }

    /* ==========================================================================
       4. HERITAGE ARCHIVES / COLLECTIONS CARD SHORTCUTS
       ========================================================================== */
    const viewShortcuts = document.querySelectorAll('.view-3d-shortcut');
    viewShortcuts.forEach(btn => {
        // Change text from "View in 3D" to premium "Enquire Selection ➔" since 3D viewport was removed
        btn.textContent = btn.textContent.replace('View', 'Enquire').replace('In 3D', '');

        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-target');
            const targetCard = document.querySelector(`.catalog-item[data-product-info="${target}"]`);
            if (targetCard) {
                targetCard.click();
                const gallerySection = document.getElementById('gallery');
                if (gallerySection) {
                    gallerySection.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });

    /* ==========================================================================
       5. ROYAL CONSULTATION SECURE BOOKING MODAL
       ========================================================================== */
    const bookingModal = document.getElementById('bookingModal');
    const openBookingBtn = document.getElementById('openBookingBtn');
    const mobileBookingBtn = document.getElementById('mobileBookingBtn');
    const closeBookingBtn = document.getElementById('closeBookingBtn');
    const bookingForm = document.getElementById('bookingForm');
    const modalSuccessScreen = document.getElementById('modalSuccessScreen');
    const closeSuccessBtn = document.getElementById('closeSuccessBtn');
    const clientNameMasked = document.getElementById('clientNameMasked');
    const clientEmailMasked = document.getElementById('clientEmailMasked');
    const bookingReferenceCode = document.getElementById('bookingReferenceCode');

    function openModal() {
        if (bookingModal) {
            bookingModal.classList.add('open');
            if (modalSuccessScreen) modalSuccessScreen.classList.remove('active');
            document.body.style.overflow = 'hidden'; // Lock screen scroll
        }
    }

    function closeModal() {
        if (bookingModal) {
            bookingModal.classList.remove('open');
            document.body.style.overflow = 'auto'; // Restore scroll
        }
    }

    if (openBookingBtn) openBookingBtn.addEventListener('click', openModal);
    if (mobileBookingBtn) mobileBookingBtn.addEventListener('click', openModal);
    if (closeBookingBtn) closeBookingBtn.addEventListener('click', closeModal);

    if (bookingModal) {
        bookingModal.addEventListener('click', (e) => {
            if (e.target === bookingModal) {
                closeModal();
            }
        });
    }

    if (bookingForm) {
        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const nameVal = document.getElementById('bookingName').value;
            const emailVal = document.getElementById('bookingEmail').value;
            const phoneVal = document.getElementById('bookingPhone').value;
            const notesVal = document.getElementById('bookingNotes').value;
            const designVal = document.getElementById('bookingDesign').value;
            const dateVal = document.getElementById('bookingDate').value;

            const submitBtn = bookingForm.querySelector('button[type="submit"]');
            const origBtnText = submitBtn.textContent;
            submitBtn.textContent = 'Requesting Invitation...';
            submitBtn.disabled = true;

            fetch('/api/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: nameVal,
                    email: emailVal,
                    phone: phoneVal,
                    date: dateVal,
                    design: designVal,
                    notes: notesVal
                })
            })
            .then(res => res.json())
            .then(data => {
                submitBtn.textContent = origBtnText;
                submitBtn.disabled = false;

                if (data.error) {
                    alert(`Booking failed: ${data.error}`);
                    return;
                }

                // Mask details securely using textContent
                if (clientNameMasked) clientNameMasked.textContent = data.clientName;
                if (clientEmailMasked) clientEmailMasked.textContent = data.clientEmail;
                if (bookingReferenceCode) bookingReferenceCode.textContent = data.refCode;

                bookingForm.reset();

                if (modalSuccessScreen) modalSuccessScreen.classList.add('active');
            })
            .catch(err => {
                submitBtn.textContent = origBtnText;
                submitBtn.disabled = false;
                console.error("Booking submit error:", err);
                alert("Secure server connection failed. Please ensure the backend is running.");
            });
        });
    }

    if (closeSuccessBtn) closeSuccessBtn.addEventListener('click', closeModal);

    /* ==========================================================================
       6. AMBIENT CLASSICAL MELODY SYNTHESIZER (WEB AUDIO API)
       ========================================================================== */
    const audioToggleBtn = document.getElementById('audioToggleBtn');
    let audioContext = null;
    let synthTimer = null;

    if (audioToggleBtn) {
        audioToggleBtn.addEventListener('click', () => {
            if (state.isPlayingSound) {
                stopHeritageMelody();
            } else {
                startHeritageMelody();
            }
        });
    }

    function startHeritageMelody() {
        try {
            // Setup Web Audio Context
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            // Resume context if suspended (browser security locks)
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }

            state.isPlayingSound = true;
            if (audioToggleBtn) audioToggleBtn.classList.add('playing');
            
            // Start synthesizing tambura drone & pentatonic flute melody
            playHeritageSynthLoop();
        } catch (e) {
            console.error("Web Audio API failed to load synthesizer:", e);
            state.isPlayingSound = false;
        }
    }

    function stopHeritageMelody() {
        state.isPlayingSound = false;
        if (audioToggleBtn) audioToggleBtn.classList.remove('playing');
        
        if (synthTimer) {
            clearTimeout(synthTimer);
            synthTimer = null;
        }
    }

    function playHeritageSynthLoop() {
        if (!state.isPlayingSound || !audioContext) return;

        const time = audioContext.currentTime;

        // Mohanam scales: classical pentatonic raga notes (C, D, E, G, A)
        const scaleFreqs = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
        const randomFreq = scaleFreqs[Math.floor(Math.random() * scaleFreqs.length)];

        // Soft bell-like synth
        const osc = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        osc.type = 'triangle'; // Soft organic woodwind timbre
        osc.frequency.setValueAtTime(randomFreq, time);

        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(0.06, time + 0.2); // Soft attack
        gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 3.0); // Gentle decay

        osc.connect(gainNode);
        gainNode.connect(audioContext.destination);

        osc.start(time);
        osc.stop(time + 3.2);

        // Ambient deep base tambura drone sound
        if (Math.random() > 0.6) {
            const droneOsc = audioContext.createOscillator();
            const droneGain = audioContext.createGain();
            const filter = audioContext.createBiquadFilter();

            droneOsc.type = 'sawtooth';
            droneOsc.frequency.setValueAtTime(Math.random() > 0.5 ? 65.41 : 98.00, time); // C2 or G2

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(120, time); // Filter out high buzz

            droneGain.gain.setValueAtTime(0, time);
            droneGain.gain.linearRampToValueAtTime(0.03, time + 0.8);
            droneGain.gain.exponentialRampToValueAtTime(0.0001, time + 4.5);

            droneOsc.connect(filter);
            filter.connect(droneGain);
            droneGain.connect(audioContext.destination);

            droneOsc.start(time);
            droneOsc.stop(time + 4.8);
        }

        synthTimer = setTimeout(playHeritageSynthLoop, 1800 + Math.random() * 1200);
    }

    /* ==========================================================================
       7. CLIENT SANCTUARY VAULT - SIGN IN & LOOKUP (SEPARATE FLOWS)
       ========================================================================== */
    
    /* --- Flow A: Account Sign In / Inner Circle --- */
    const signInModal = document.getElementById('signInModal');
    const navSignIn = document.getElementById('navSignIn');
    const mobileSignInBtn = document.getElementById('mobileSignInBtn');
    const closeSignInBtn = document.getElementById('closeSignInBtn');
    const btnTabSignIn = document.getElementById('btnTabSignIn');
    const btnTabRegister = document.getElementById('btnTabRegister');
    const signInForm = document.getElementById('signInForm');
    const registerForm = document.getElementById('registerForm');
    const signInSuccessScreen = document.getElementById('signInSuccessScreen');
    const btnAccountLogout = document.getElementById('btnAccountLogout');

    // Account success variables
    const accountClientName = document.getElementById('accountClientName');
    const accountClientEmail = document.getElementById('accountClientEmail');

    function openSignIn() {
        if (signInModal) {
            signInModal.classList.add('open');
            if (signInSuccessScreen) signInSuccessScreen.classList.remove('active');
            // Reset to Sign In tab by default
            if (btnTabSignIn) btnTabSignIn.click();
            document.body.style.overflow = 'hidden';
        }
    }

    function closeSignIn() {
        if (signInModal) {
            signInModal.classList.remove('open');
            document.body.style.overflow = 'auto';
        }
    }

    if (navSignIn) navSignIn.addEventListener('click', openSignIn);
    if (mobileSignInBtn) mobileSignInBtn.addEventListener('click', openSignIn);
    if (closeSignInBtn) closeSignInBtn.addEventListener('click', closeSignIn);

    if (signInModal) {
        signInModal.addEventListener('click', (e) => {
            if (e.target === signInModal) {
                closeSignIn();
            }
        });
    }

    // Toggle Sign In vs Register tabs
    if (btnTabSignIn && btnTabRegister) {
        btnTabSignIn.addEventListener('click', () => {
            btnTabSignIn.classList.add('active');
            btnTabRegister.classList.remove('active');
            if (signInForm) signInForm.style.display = 'block';
            if (registerForm) registerForm.style.display = 'none';
        });

        btnTabRegister.addEventListener('click', () => {
            btnTabRegister.classList.add('active');
            btnTabSignIn.classList.remove('active');
            if (registerForm) registerForm.style.display = 'block';
            if (signInForm) signInForm.style.display = 'none';
        });
    }

    // Handle User Sign In
    if (signInForm) {
        signInForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const emailVal = document.getElementById('signInEmail').value;
            const passwordVal = document.getElementById('signInPassword').value;

            const submitBtn = signInForm.querySelector('button[type="submit"]');
            const origText = submitBtn.textContent;
            submitBtn.textContent = 'Authenticating...';
            submitBtn.disabled = true;

            fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: emailVal,
                    password: passwordVal
                })
            })
            .then(res => res.json())
            .then(data => {
                submitBtn.textContent = origText;
                submitBtn.disabled = false;

                if (data.error) {
                    alert(`Login failed: ${data.error}`);
                    return;
                }

                // Show Sanctuary success dashboard safely using textContent
                if (accountClientName) accountClientName.textContent = data.user.name;
                if (accountClientEmail) accountClientEmail.textContent = data.user.email;

                signInForm.reset();
                if (signInSuccessScreen) signInSuccessScreen.classList.add('active');
            })
            .catch(err => {
                submitBtn.textContent = origText;
                submitBtn.disabled = false;
                console.error("Login submission error:", err);
                alert("Vault communication error. Please ensure backend server is active.");
            });
        });
    }

    // Handle User Registration
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const nameVal = document.getElementById('registerName').value;
            const emailVal = document.getElementById('registerEmail').value;
            const passwordVal = document.getElementById('registerPassword').value;

            const submitBtn = registerForm.querySelector('button[type="submit"]');
            const origText = submitBtn.textContent;
            submitBtn.textContent = 'Registering Account...';
            submitBtn.disabled = true;

            fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: nameVal,
                    email: emailVal,
                    password: passwordVal
                })
            })
            .then(res => res.json())
            .then(data => {
                submitBtn.textContent = origText;
                submitBtn.disabled = false;

                if (data.error) {
                    alert(`Registration failed: ${data.error}`);
                    return;
                }

                alert(`✦ Registration Confirmed! ✦\n\nWelcome to the Inner Circle, ${data.user.name}. You may now sign in using your credentials.`);
                registerForm.reset();
                if (btnTabSignIn) btnTabSignIn.click(); // Switch back to login form
            })
            .catch(err => {
                submitBtn.textContent = origText;
                submitBtn.disabled = false;
                console.error("Registration submission error:", err);
                alert("Vault communication error. Please ensure backend server is active.");
            });
        });
    }

    if (btnAccountLogout) {
        btnAccountLogout.addEventListener('click', () => {
            if (signInSuccessScreen) {
                signInSuccessScreen.classList.remove('active');
            }
            closeSignIn();
        });
    }


    /* --- Flow B: Booking Vault Lookup --- */
    const vaultModal = document.getElementById('vaultModal');
    const navVault = document.getElementById('navVault');
    const mobileVaultBtn = document.getElementById('mobileVaultBtn');
    const closeVaultBtn = document.getElementById('closeVaultBtn');
    const vaultForm = document.getElementById('vaultForm');
    const vaultSuccessScreen = document.getElementById('vaultSuccessScreen');
    const exitVaultBtn = document.getElementById('exitVaultBtn');

    // Dynamic fields to fill
    const vaultClientName = document.getElementById('vaultClientName');
    const vaultMasterpiece = document.getElementById('vaultMasterpiece');
    const vaultSpecs = document.getElementById('vaultSpecs');
    const vaultNotes = document.getElementById('vaultNotes');
    const vaultConsultDate = document.getElementById('vaultConsultDate');
    const vaultRefCode = document.getElementById('vaultRefCode');

    const masterpieceSpecsDb = {
        jimikki: "Purity: 22K Yellow Gold | Est. Weight: 42.5g | Accents: Kemp Rubies & Diamonds",
        kasumalai: "Purity: 22K Antique Gold | Est. Weight: 125.0g | Accents: Lakshmi reliefs & Kemp Rubies",
        vanki: "Purity: 22K Antique Gold | Est. Weight: 78.5g | Accents: Peacock engravings & Colombian emeralds",
        mangamalai: "Purity: 22K Yellow Gold | Est. Weight: 98.0g | Accents: Recurved mango settings & Kemp gems",
        oddiyanam: "Purity: 22K Yellow Gold | Est. Weight: 210.0g | Accents: Kemp Rubies & Carved Peacocks",
        nethichutti: "Purity: 22K Gold Filigree | Est. Weight: 28.5g | Accents: Kemp Rubies & Natural Pearls",
        mookuthi: "Purity: 22K Gold Setting | Est. Weight: 8.2g | Accents: Single Uncut Diamond & Kemp Rubies",
        valayal: "Purity: 22K Antique Gold | Est. Weight: 64.0g | Accents: Kemp Emeralds & Rubies",
        thusi: "Purity: 22K Gold Wirework | Est. Weight: 48.0g | Accents: Seed Pearls & Solitaire Diamonds",
        Stud: "Purity: 22K Gold Stud | Est. Weight: 12.0g | Accents: Solitaire Diamonds",
        Kolusu: "Purity: 22K Gold Wirework | Est. Weight: 38.0g | Accents: Dangling Gold Beads"
    };

    const masterpieceNameDb = {
        jimikki: "Jimikki Earrings",
        kasumalai: "Kasu Malai",
        vanki: "Vanki Armlet",
        mangamalai: "Manga Malai Choker",
        oddiyanam: "Gaja Lakshmi Oddiyanam",
        nethichutti: "Chola Nethi Chutti",
        mookuthi: "Solitaire Mookuthi",
        valayal: "Divine Dancer Valayal",
        thusi: "Royal Thusi Choker",
        Stud: "Stud Earrings",
        Kolusu: "Kolusu Anklet"
    };

    // Vault Cart & Tabs UI Elements
    const btnTabVaultCart = document.getElementById('btnTabVaultCart');
    const btnTabVaultLookup = document.getElementById('btnTabVaultLookup');
    const vaultCartView = document.getElementById('vaultCartView');
    const vaultLookupView = document.getElementById('vaultLookupView');

    const vaultCartItemsList = document.getElementById('vaultCartItemsList');
    const vaultCartSummary = document.getElementById('vaultCartSummary');
    const vaultCartEmptyState = document.getElementById('vaultCartEmptyState');
    const vaultCartCount = document.getElementById('vaultCartCount');
    const clearVaultCartBtn = document.getElementById('clearVaultCartBtn');
    const inquireAllCartBtn = document.getElementById('inquireAllCartBtn');
    const discoverVaultBtn = document.getElementById('discoverVaultBtn');
    const btnAddToCart = document.getElementById('btnAddToCart');

    // Luxury micro-animation Toast Notifications
    function showLuxuryToast(message) {
        const existingToast = document.querySelector('.luxury-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = 'luxury-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 3rem;
            left: 50%;
            transform: translate(-50%, 50px);
            background: rgba(14, 14, 18, 0.95);
            border: 1px solid var(--text-gold);
            color: var(--text-primary);
            padding: 1rem 2rem;
            border-radius: 4px;
            font-family: 'Cinzel', serif;
            font-size: 0.8rem;
            letter-spacing: 0.05em;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.6), var(--gold-glow-subtle);
            z-index: 2000;
            opacity: 0;
            transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease;
            pointer-events: none;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        // Animate In
        setTimeout(() => {
            toast.style.transform = 'translate(-50%, 0)';
            toast.style.opacity = '1';
        }, 50);

        // Animate Out
        setTimeout(() => {
            toast.style.transform = 'translate(-50%, -20px)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 400);
        }, 3200);
    }

    // Dynamic Render of Saved Cart Items
    function renderVaultCart() {
        if (!vaultCartItemsList) return;

        const cart = JSON.parse(localStorage.getItem('ad_jewels_cart')) || [];
        vaultCartItemsList.innerHTML = ''; // Clear prior elements safely

        if (cart.length === 0) {
            if (vaultCartEmptyState) vaultCartEmptyState.style.display = 'block';
            if (vaultCartSummary) vaultCartSummary.style.display = 'none';
            if (vaultCartCount) vaultCartCount.textContent = '0 Ornaments';
            return;
        }

        if (vaultCartEmptyState) vaultCartEmptyState.style.display = 'none';
        if (vaultCartSummary) vaultCartSummary.style.display = 'block';
        if (vaultCartCount) vaultCartCount.textContent = `${cart.length} Ornament${cart.length > 1 ? 's' : ''}`;


        cart.forEach(item => {
            const card = document.createElement('div');
            card.className = 'cart-item-card';
            card.style.cssText = `
                display: flex;
                gap: 1.2rem;
                align-items: flex-start;
                padding: 1.25rem;
                margin-bottom: 0.75rem;
                background: rgba(255,255,255,0.01);
                border: 1px solid rgba(191,149,63,0.1);
                border-radius: 6px;
                transition: border-color 0.3s ease, background-color 0.3s ease;
            `;

            // Left design thumbnail image
            const imgContainer = document.createElement('div');
            imgContainer.style.cssText = `
                width: 60px;
                height: 60px;
                flex-shrink: 0;
                border-radius: 4px;
                border: 1px solid rgba(191,149,63,0.25);
                overflow: hidden;
                background: #111;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            const thumbImg = document.createElement('img');
            thumbImg.style.cssText = `
                width: 100%;
                height: 100%;
                object-fit: cover;
            `;
            // Handle custom catalog reference image or standard fallback image safely
            let itemImageSrc = item.image;
            if (!itemImageSrc) {
                if (item.design === 'jimikki') {
                    itemImageSrc = 'jimikki.png';
                } else if (item.design === 'kasumalai') {
                    itemImageSrc = 'kasumalai.png';
                } else if (item.design === 'vanki') {
                    itemImageSrc = 'vanki.png';
                } else if (item.design === 'valayal') {
                    itemImageSrc = 'valayal.png';
                } else {
                    itemImageSrc = 'logo.png';
                }
            }
            thumbImg.src = itemImageSrc;
            thumbImg.alt = item.name;
            thumbImg.onerror = () => {
                thumbImg.src = "logo.png";
            };
            imgContainer.appendChild(thumbImg);
            card.appendChild(imgContainer);

            // Center description details
            const infoDiv = document.createElement('div');
            infoDiv.style.cssText = `
                flex-grow: 1;
                text-align: left;
            `;

            const nameHeader = document.createElement('h5');
            nameHeader.style.cssText = `
                font-size: 0.95rem;
                color: var(--text-primary);
                margin: 0 0 0.3rem 0;
                font-family: 'Cinzel', serif;
                letter-spacing: 0.03em;
            `;
            nameHeader.textContent = item.name;

            const specsPara = document.createElement('p');
            specsPara.style.cssText = `
                font-size: 0.75rem;
                color: var(--text-muted);
                margin: 0 0 0.6rem 0;
                font-weight: 300;
                line-height: 1.4;
            `;
            specsPara.textContent = item.specs;

            infoDiv.appendChild(nameHeader);
            infoDiv.appendChild(specsPara);

            // Custom craftsmanship request detail
            if (item.notes) {
                const notesDiv = document.createElement('div');
                notesDiv.style.cssText = `
                    font-size: 0.75rem;
                    color: var(--text-gold);
                    font-style: italic;
                    background: rgba(191,149,63,0.04);
                    padding: 0.4rem 0.6rem;
                    border-left: 2px solid var(--text-gold);
                    border-radius: 2px;
                    margin-bottom: 0.2rem;
                    word-break: break-word;
                    font-weight: 300;
                    white-space: pre-wrap;
                `;
                const notesTitle = document.createElement('strong');
                notesTitle.style.cssText = `font-style: normal; color: var(--text-gold); margin-right: 4px;`;
                notesTitle.textContent = "Bespoke Requests:";
                
                const notesText = document.createTextNode(item.notes);
                notesDiv.appendChild(notesTitle);
                notesDiv.appendChild(notesText);
                infoDiv.appendChild(notesDiv);
            }

            // Right item action controls
            const actionsDiv = document.createElement('div');
            actionsDiv.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 8px;
                align-items: flex-end;
            `;

            const btnEnquire = document.createElement('button');
            btnEnquire.style.cssText = `
                background: none;
                border: 1px solid var(--text-gold);
                color: var(--text-gold);
                font-size: 0.65rem;
                padding: 0.3rem 0.6rem;
                border-radius: 2px;
                cursor: pointer;
                font-family: 'Cinzel', serif;
                letter-spacing: 0.05em;
                transition: all 0.2s ease;
            `;
            btnEnquire.textContent = "Enquire Now";
            btnEnquire.addEventListener('mouseenter', () => {
                btnEnquire.style.background = 'var(--text-gold)';
                btnEnquire.style.color = '#0e0e12';
            });
            btnEnquire.addEventListener('mouseleave', () => {
                btnEnquire.style.background = 'none';
                btnEnquire.style.color = 'var(--text-gold)';
            });

            // Single item inquiry
            btnEnquire.addEventListener('click', () => {
                closeVault();
                const catalogItem = document.querySelector(`.catalog-item[data-product-info="${item.design}"]`);
                if (catalogItem) {
                    catalogItem.click();
                } else if (conciergeDesign) {
                    conciergeDesign.value = item.design;
                }
                
                const conciergeNotes = document.getElementById('conciergeNotes');
                if (conciergeNotes) {
                    conciergeNotes.value = item.notes;
                }

                const showroomSection = document.getElementById('showroom');
                if (showroomSection) {
                    showroomSection.scrollIntoView({ behavior: 'smooth' });
                }
            });

            const btnRemove = document.createElement('button');
            btnRemove.style.cssText = `
                background: none;
                border: none;
                color: #ff5252;
                font-size: 0.65rem;
                padding: 0.2rem 0.5rem;
                cursor: pointer;
                opacity: 0.7;
                transition: opacity 0.2s;
                font-family: 'Cinzel', serif;
                letter-spacing: 0.05em;
            `;
            btnRemove.textContent = "Remove";
            btnRemove.addEventListener('mouseenter', () => btnRemove.style.opacity = '1');
            btnRemove.addEventListener('mouseleave', () => btnRemove.style.opacity = '0.7');
            
            // Remove item
            btnRemove.addEventListener('click', () => {
                let currentCart = JSON.parse(localStorage.getItem('ad_jewels_cart')) || [];
                currentCart = currentCart.filter(i => i.id !== item.id);
                localStorage.setItem('ad_jewels_cart', JSON.stringify(currentCart));
                renderVaultCart();
            });

            actionsDiv.appendChild(btnEnquire);
            actionsDiv.appendChild(btnRemove);

            card.appendChild(infoDiv);
            card.appendChild(actionsDiv);

            vaultCartItemsList.appendChild(card);
        });
    }

    // Toggle Vault Tabs View
    if (btnTabVaultCart && btnTabVaultLookup) {
        btnTabVaultCart.addEventListener('click', () => {
            btnTabVaultCart.classList.add('active');
            btnTabVaultLookup.classList.remove('active');
            if (vaultCartView) vaultCartView.style.display = 'block';
            if (vaultLookupView) vaultLookupView.style.display = 'none';
        });

        btnTabVaultLookup.addEventListener('click', () => {
            btnTabVaultLookup.classList.add('active');
            btnTabVaultCart.classList.remove('active');
            if (vaultLookupView) vaultLookupView.style.display = 'block';
            if (vaultCartView) vaultCartView.style.display = 'none';
        });
    }

    // Add currently selected showroom concierge masterpiece to cart
    if (btnAddToCart) {
        btnAddToCart.addEventListener('click', () => {
            const designVal = document.getElementById('conciergeDesign').value;
            const notesVal = document.getElementById('conciergeNotes').value;

            if (!designVal) {
                alert("Please select a masterpiece first.");
                return;
            }

            let cart = JSON.parse(localStorage.getItem('ad_jewels_cart')) || [];

            // Securely append the currently active Heritage slide image reference to the notes
            let finalNotes = notesVal ? notesVal.trim() : '';
            if (designVal === 'jimikki') {
                const refPhoto = jimikkiArchives[activeArchiveIdx];
                finalNotes = `${finalNotes ? finalNotes + '\n' : ''}[Reference Photo: ${refPhoto}]`;
            }

            const defaultImages = {
                jimikki: "jimikki.png",
                kasumalai: "kasumalai.png",
                vanki: "vanki.png",
                valayal: "valayal.png"
            };
            let itemImage = defaultImages[designVal] || "";
            if (designVal === 'jimikki' && activeArchiveIdx !== undefined && jimikkiArchives[activeArchiveIdx]) {
                itemImage = `./jimiki/${jimikkiArchives[activeArchiveIdx]}`;
            }

            const newItem = {
                id: Date.now() + Math.random().toString(36).substr(2, 5),
                design: designVal,
                name: masterpieceNameDb[designVal] || designVal,
                specs: masterpieceSpecsDb[designVal] || "Purity: 22K Gold | Est. Weight: Standard | Accents: Traditional",
                notes: finalNotes,
                image: itemImage
            };

            cart.push(newItem);
            localStorage.setItem('ad_jewels_cart', JSON.stringify(cart));

            showLuxuryToast(`Added ${newItem.name} to your Vault Cart!`);

            // Clear special request notes on selection to let them customise others
            document.getElementById('conciergeNotes').value = '';

            renderVaultCart();
        });
    }

    // Clear Vault Cart
    if (clearVaultCartBtn) {
        clearVaultCartBtn.addEventListener('click', () => {
            if (confirm("Are you sure you want to clear your saved masterpieces in the vault?")) {
                localStorage.removeItem('ad_jewels_cart');
                renderVaultCart();
            }
        });
    }

    // Discover Masterpieces
    if (discoverVaultBtn) {
        discoverVaultBtn.addEventListener('click', () => {
            closeVault();
            const gallerySection = document.getElementById('gallery');
            if (gallerySection) {
                gallerySection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    // Inquire about all cart items at once
    if (inquireAllCartBtn) {
        inquireAllCartBtn.addEventListener('click', () => {
            const cart = JSON.parse(localStorage.getItem('ad_jewels_cart')) || [];
            if (cart.length === 0) return;

            let inquiryText = "Bespoke Cart Consultation Inquiry:\n";
            cart.forEach((item, index) => {
                const specWeight = item.specs.split('|')[1] ? item.specs.split('|')[1].trim() : "Standard weight";
                inquiryText += `${index + 1}. ${item.name} (${specWeight})\n`;
                if (item.notes) {
                    inquiryText += `   - Bespoke Request: "${item.notes}"\n`;
                }
            });

            closeVault();

            // Open booking modal
            if (bookingModal) {
                bookingModal.classList.add('open');
                document.body.style.overflow = 'hidden';
            }

            // Populate booking modal fields
            const bookingNotes = document.getElementById('bookingNotes');
            if (bookingNotes) {
                bookingNotes.value = inquiryText;
            }

            const bookingDesign = document.getElementById('bookingDesign');
            if (bookingDesign && cart.length > 0) {
                bookingDesign.value = cart[0].design;
            }
        });
    }

    // Modal Control wrappers
    function openVault() {
        if (vaultModal) {
            vaultModal.classList.add('open');
            if (vaultSuccessScreen) vaultSuccessScreen.classList.remove('active');
            
            // Default to Cart tab active
            if (btnTabVaultCart) {
                btnTabVaultCart.click();
            }
            renderVaultCart();

            document.body.style.overflow = 'hidden';
        }
    }

    function closeVault() {
        if (vaultModal) {
            vaultModal.classList.remove('open');
            document.body.style.overflow = 'auto';
        }
    }

    if (navVault) navVault.addEventListener('click', openVault);
    if (mobileVaultBtn) mobileVaultBtn.addEventListener('click', openVault);
    if (closeVaultBtn) closeVaultBtn.addEventListener('click', closeVault);
    if (exitVaultBtn) exitVaultBtn.addEventListener('click', closeVault);

    if (vaultModal) {
        vaultModal.addEventListener('click', (e) => {
            if (e.target === vaultModal) {
                closeVault();
            }
        });
    }

    if (vaultForm) {
        vaultForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const emailVal = document.getElementById('vaultEmail').value;
            const refCodeVal = document.getElementById('vaultRefCodeVal').value;

            const submitBtn = vaultForm.querySelector('button[type="submit"]');
            const origText = submitBtn.textContent;
            submitBtn.textContent = 'Unlocking Vault...';
            submitBtn.disabled = true;

            fetch('/api/bookings/lookup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: emailVal,
                    refCode: refCodeVal
                })
            })
            .then(res => res.json())
            .then(data => {
                submitBtn.textContent = origText;
                submitBtn.disabled = false;

                if (data.error) {
                    alert(`Vault lookup failed: ${data.error}`);
                    return;
                }

                const bk = data.booking;

                // Safely update details using textContent to prevent XSS
                if (vaultClientName) vaultClientName.textContent = bk.name;
                if (vaultMasterpiece) {
                    vaultMasterpiece.textContent = masterpieceNameDb[bk.design] || bk.design;
                }
                if (vaultSpecs) {
                    vaultSpecs.textContent = masterpieceSpecsDb[bk.design] || "Standard specifications.";
                }
                if (vaultNotes) {
                    vaultNotes.style.whiteSpace = 'pre-wrap';
                    vaultNotes.textContent = bk.notes || "No special craftsmanship requests recorded.";
                }
                if (vaultConsultDate) vaultConsultDate.textContent = bk.date;
                if (vaultRefCode) vaultRefCode.textContent = bk.id;

                vaultForm.reset();

                if (vaultSuccessScreen) vaultSuccessScreen.classList.add('active');
            })
            .catch(err => {
                submitBtn.textContent = origText;
                submitBtn.disabled = false;
                console.error("Vault lookup submission error:", err);
                alert("Vault communication error. Please ensure backend server is active.");
            });
        });
    }

    /* ==========================================================================
       6. AMBIENT SLOW FLOATING JEWELRY BACKGROUND EFFECT
       ========================================================================== */
    const bgParticles = document.getElementById('bgParticles');
    if (bgParticles) {
        // High-fidelity luxury vector drawings of South Indian royal jewelry elements
        const jewelrySVGs = [
            // 1. Jimikki Hanging Earring
            `<svg viewBox="0 0 100 100" style="width: 100%; height: 100%; fill: none; stroke: var(--text-gold); stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round;">
                <circle cx="50" cy="20" r="7" />
                <circle cx="50" cy="20" r="2.5" fill="var(--text-gold)" />
                <line x1="50" y1="27" x2="50" y2="39" />
                <path d="M25,58 C25,38 75,38 75,58 Z" fill="rgba(191,149,63,0.1)" />
                <line x1="25" y1="58" x2="75" y2="58" />
                <circle cx="30" cy="70" r="2.5" fill="var(--text-gold)" />
                <line x1="30" y1="58" x2="30" y2="67" />
                <circle cx="40" cy="74" r="2.5" fill="var(--text-gold)" />
                <line x1="40" y1="58" x2="40" y2="71" />
                <circle cx="50" cy="76" r="2.5" fill="var(--text-gold)" />
                <line x1="50" y1="58" x2="50" y2="73" />
                <circle cx="60" cy="74" r="2.5" fill="var(--text-gold)" />
                <line x1="60" y1="58" x2="60" y2="71" />
                <circle cx="70" cy="70" r="2.5" fill="var(--text-gold)" />
                <line x1="70" y1="58" x2="70" y2="67" />
            </svg>`,

            // 2. Kasu Malai Gold Coin Necklace
            `<svg viewBox="0 0 100 100" style="width: 100%; height: 100%; fill: none; stroke: var(--text-gold); stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round;">
                <path d="M15,25 C30,70 70,70 85,25" />
                <circle cx="28" cy="45" r="5.5" fill="rgba(191,149,63,0.15)" />
                <circle cx="38" cy="54" r="5.5" fill="rgba(191,149,63,0.15)" />
                <circle cx="50" cy="57" r="5.5" fill="rgba(191,149,63,0.15)" />
                <circle cx="62" cy="54" r="5.5" fill="rgba(191,149,63,0.15)" />
                <circle cx="72" cy="45" r="5.5" fill="rgba(191,149,63,0.15)" />
                <circle cx="28" cy="45" r="1.5" fill="var(--text-gold)" />
                <circle cx="38" cy="54" r="1.5" fill="var(--text-gold)" />
                <circle cx="50" cy="57" r="1.5" fill="var(--text-gold)" />
                <circle cx="62" cy="54" r="1.5" fill="var(--text-gold)" />
                <circle cx="72" cy="45" r="1.5" fill="var(--text-gold)" />
                <path d="M50,62.5 L46,70 L50,76 L54,70 Z" fill="var(--text-gold)" />
            </svg>`,

            // 3. Kolusu Royal Gold Anklet
            `<svg viewBox="0 0 100 100" style="width: 100%; height: 100%; fill: none; stroke: var(--text-gold); stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round;">
                <path d="M10,40 Q50,62 90,40" />
                <path d="M10,48 Q50,70 90,48" stroke-dasharray="2,3" />
                <circle cx="22" cy="49" r="3" fill="var(--text-gold)" />
                <circle cx="36" cy="57" r="3" fill="var(--text-gold)" />
                <circle cx="50" cy="60" r="3" fill="var(--text-gold)" />
                <circle cx="64" cy="57" r="3" fill="var(--text-gold)" />
                <circle cx="78" cy="49" r="3" fill="var(--text-gold)" />
            </svg>`,

            // 4. Vanki Royal Peacock Armlet / Ring
            `<svg viewBox="0 0 100 100" style="width: 100%; height: 100%; fill: none; stroke: var(--text-gold); stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round;">
                <ellipse cx="50" cy="72" rx="24" ry="10" />
                <line x1="36" y1="65" x2="50" y2="44" />
                <line x1="64" y1="65" x2="50" y2="44" />
                <path d="M26,44 L50,15 L74,44 Z" fill="rgba(191,149,63,0.1)" />
                <circle cx="50" cy="34" r="5" fill="var(--text-gold)" />
            </svg>`,

            // 5. Mookuthi Diamond Nose Stud
            `<svg viewBox="0 0 100 100" style="width: 100%; height: 100%; fill: none; stroke: var(--text-gold); stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round;">
                <polygon points="50,22 70,50 50,78 30,50" fill="rgba(191,149,63,0.15)" />
                <circle cx="50" cy="50" r="6" fill="var(--text-gold)" />
                <line x1="50" y1="50" x2="50" y2="10" />
                <circle cx="50" cy="10" r="3" fill="var(--text-gold)" />
                <line x1="50" y1="50" x2="50" y2="90" />
                <circle cx="50" cy="90" r="3" fill="var(--text-gold)" />
                <line x1="50" y1="50" x2="10" y2="50" />
                <circle cx="10" cy="50" r="3" fill="var(--text-gold)" />
                <line x1="50" y1="50" x2="90" y2="50" />
                <circle cx="90" cy="50" r="3" fill="var(--text-gold)" />
            </svg>`
        ];

        function spawnFloatingJewel() {
            const jewel = document.createElement('div');
            jewel.className = 'floating-jewel-particle';
            
            // Randomize SVG element
            const svgString = jewelrySVGs[Math.floor(Math.random() * jewelrySVGs.length)];
            jewel.innerHTML = svgString;

            // Randomize size: from 32px to 72px square
            const size = 32 + Math.floor(Math.random() * 40);
            
            // Randomize horizontal starting coordinate (0% to 95% left)
            const left = Math.floor(Math.random() * 95);

            // Randomize animation duration: 25s to 50s for a quiet, slow-motion, majestic effect
            const duration = 25 + Math.floor(Math.random() * 25);

            // Apply styles securely
            jewel.style.left = `${left}%`;
            jewel.style.width = `${size}px`;
            jewel.style.height = `${size}px`;
            jewel.style.animationDuration = `${duration}s`;

            // Soft blur and delay randomizations
            const blur = Math.floor(Math.random() * 2);
            if (blur > 0) {
                jewel.style.filter = `blur(${blur}px)`;
            }

            bgParticles.appendChild(jewel);

            // Automatically clean up element after animation completion
            setTimeout(() => {
                jewel.remove();
            }, duration * 1000);
        }

        // Spawn first batch of particles immediately at various heights to fill the screen on load
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                const initialJewel = document.createElement('div');
                initialJewel.className = 'floating-jewel-particle';
                const svgString = jewelrySVGs[Math.floor(Math.random() * jewelrySVGs.length)];
                initialJewel.innerHTML = svgString;
                const size = 32 + Math.floor(Math.random() * 40);
                const left = Math.floor(Math.random() * 95);
                const duration = 25 + Math.floor(Math.random() * 25);
                const opacity = (0.25 + Math.random() * 0.15).toFixed(2);

                initialJewel.style.left = `${left}%`;
                initialJewel.style.width = `${size}px`;
                initialJewel.style.height = `${size}px`;
                initialJewel.style.animationDuration = `${duration}s`;
                initialJewel.style.opacity = opacity;

                // Start them mid-way up the viewport randomly
                const initialTop = Math.floor(Math.random() * 90);
                initialJewel.style.top = `${initialTop}vh`;
                
                // Adjust animation keyframe on the fly or just override transform
                initialJewel.style.animationName = 'none'; 
                initialJewel.style.transform = `translateY(${initialTop}vh) rotate(${Math.floor(Math.random() * 360)}deg)`;
                
                // Let them fade out slowly
                initialJewel.style.transition = `transform ${duration}s linear, opacity ${duration}s ease`;
                bgParticles.appendChild(initialJewel);

                setTimeout(() => {
                    initialJewel.style.transform = `translateY(-10vh) rotate(${Math.floor(Math.random() * 360) + 360}deg)`;
                    initialJewel.style.opacity = '0';
                }, 50);

                setTimeout(() => initialJewel.remove(), duration * 1000);
            }, i * 400);
        }

        // Periodically spawn new elements to maintain ambient density (every 4 seconds)
        setInterval(spawnFloatingJewel, 4000);
    }
});
