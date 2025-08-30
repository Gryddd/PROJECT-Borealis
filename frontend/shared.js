function parseJwt(token) {
    if (!token) { return null; }
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) { return null; }
}

function setupHeader() {
    const authLinks = document.getElementById('auth-links');
    const userActions = document.getElementById('user-actions');
    const adminLink = document.getElementById('admin-link');
    const token = localStorage.getItem('authToken');
    const user = parseJwt(token);
    if (token && user) {
        if (authLinks) authLinks.style.display = 'none';
        if (userActions) userActions.style.display = 'flex';
        const adminSeparator = document.getElementById('admin-separator');
        if (adminLink && adminSeparator) {
            const isAdmin = user.role === 'admin';
            adminLink.style.display = isAdmin ? 'inline' : 'none';
            adminSeparator.style.display = isAdmin ? 'inline' : 'none';
        }
    } else {
        if (authLinks) authLinks.style.display = 'flex';
        if (userActions) userActions.style.display = 'none';
    }
    const logoutButton = document.getElementById('logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('guestCart');
            window.location.href = 'index.html';
        });
    }
}

function setupHeaderScrollEffect() {
    const header = document.getElementById('main-header');
    if (!header) return;
    window.addEventListener('scroll', () => {
        header.classList.toggle('scrolled', window.scrollY > 50);
    });
}

async function updateCartCount() {
    const cartCountSpan = document.getElementById('cart-count');
    const token = localStorage.getItem('authToken');
    if (!cartCountSpan) return;

    let totalItems = 0;

    if (token) {
        try {
            const response = await fetch('https://project-borealis.vercel.app/api/cart', { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.ok) {
                const cartItems = await response.json();
                totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
            }
        } catch (error) {
            console.error('Failed to update cart count from API:', error);
        }
    } else {
        const guestCart = JSON.parse(localStorage.getItem('guestCart')) || [];
        totalItems = guestCart.reduce((sum, item) => sum + item.quantity, 0);
    }
    
    cartCountSpan.textContent = totalItems;
}

function setupCartModal() {
    const cartModalOverlay = document.getElementById('cart-modal-overlay');
    const cartModal = document.getElementById('cart-modal');
    const openCartBtn = document.getElementById('open-cart-btn');
    const closeCartBtn = document.getElementById('cart-modal-close-btn');
    const cartModalContent = document.getElementById('cart-modal-content');
    const cartModalSubtotal = document.getElementById('cart-modal-subtotal');
    
    if (!cartModal || !openCartBtn) return;

    async function openCart() {
        await renderCartModal();
        if (cartModalOverlay) cartModalOverlay.classList.add('active');
        if (cartModal) cartModal.classList.add('active');
    }

    function closeCart() {
        if (cartModalOverlay) cartModalOverlay.classList.remove('active');
        if (cartModal) cartModal.classList.remove('active');
    }
    
    async function refreshCart() {
        await renderCartModal();
        await updateCartCount();
    }

    async function renderCartModal() {
        const token = localStorage.getItem('authToken');
        if (!cartModalContent || !cartModalSubtotal) return;

        cartModalContent.innerHTML = `<div class="spinner-container"><div class="spinner"></div></div>`;
        
        let items = [];
        const isGuest = !token;

        if (!isGuest) {
            try {
                const response = await fetch('https://project-borealis.vercel.app/api/cart', { headers: { 'Authorization': `Bearer ${token}` } });
                if (!response.ok) throw new Error('Could not fetch cart.');
                items = await response.json();
            } catch(error) {
                cartModalContent.innerHTML = `<p style="color:red; text-align: center;">${error.message}</p>`;
                return;
            }
        } else {
            items = JSON.parse(localStorage.getItem('guestCart')) || [];
        }

        cartModalContent.innerHTML = ''; 
        if (items.length === 0) {
            cartModalContent.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Your cart is empty.</p>';
            cartModalSubtotal.textContent = '$0.00';
            return;
        }

        let subtotal = 0;
        items.forEach(item => {
            const price = parseFloat(item.price.replace('$', ''));
            subtotal += price * item.quantity;
            
            const uniqueId = isGuest ? item.productId : item._id;

            cartModalContent.innerHTML += `
                <div class="cart-item">
                    <img src="${item.imageUrl}" alt="${item.name}" class="cart-item-image">
                    <div class="cart-item-details">
                        <h3>${item.name}</h3>
                        <p class="price">${item.price}</p>
                    </div>
                    <div class="cart-item-quantity">
                        <button class="btn-qty btn-qty-decrease" data-item-id="${uniqueId}" aria-label="Decrease quantity">-</button>
                        <span class="quantity-display">${item.quantity}</span>
                        <button class="btn-qty btn-qty-increase" data-item-id="${uniqueId}" aria-label="Increase quantity">+</button>
                    </div>
                </div>`;
        });
        cartModalSubtotal.textContent = `$${subtotal.toFixed(2)}`;
    }

    async function updateQuantity(itemId, change) {
        const token = localStorage.getItem('authToken');
        if (token) {
            const url = change > 0 
                ? `https://project-borealis.vercel.app/api/cart/${itemId}/increment`
                : `https://project-borealis.vercel.app/api/cart/${itemId}`;
            const method = change > 0 ? 'PUT' : 'DELETE';
            
            try {
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Failed to update quantity on server.');
            } catch (error) {
                console.error(error);
                alert('There was an error updating your cart.');
            }
        } else {
            let guestCart = JSON.parse(localStorage.getItem('guestCart')) || [];
            const itemIndex = guestCart.findIndex(i => i.productId === itemId);
            if (itemIndex > -1) {
                guestCart[itemIndex].quantity += change;
                if (guestCart[itemIndex].quantity <= 0) {
                    guestCart.splice(itemIndex, 1);
                }
            }
            localStorage.setItem('guestCart', JSON.stringify(guestCart));
        }
        await refreshCart();
    }
    
    openCartBtn.addEventListener('click', openCart);
    if(closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
    if(cartModalOverlay) cartModalOverlay.addEventListener('click', closeCart);

    if(cartModalContent) {
        cartModalContent.addEventListener('click', (event) => {
            const decreaseBtn = event.target.closest('.btn-qty-decrease');
            const increaseBtn = event.target.closest('.btn-qty-increase');
            if (decreaseBtn) updateQuantity(decreaseBtn.dataset.itemId, -1);
            if (increaseBtn) updateQuantity(increaseBtn.dataset.itemId, 1);
        });
    }
}

function setupSearch() {
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const resultsDropdown = document.getElementById('search-results-dropdown');
    if (!searchForm || !searchInput || !resultsDropdown) return;
    let isDropdownVisible = false;

    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => { func.apply(this, args); }, delay);
        };
    };

    const performSearch = async (query) => {
        if (query.length < 1) {
            hideDropdown();
            return;
        }

        const startTime = Date.now();
        showLoadingState();

        try {
            const response = await fetch(`https://project-borealis.vercel.app/api/products/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error('Search request failed');
            
            const products = await response.json();
            
            const elapsedTime = Date.now() - startTime;
            const minimumTime = 300;
            const remainingTime = minimumTime - elapsedTime;

            const displayResults = () => {
                if (searchInput.value.trim() !== query) {
                    hideDropdown();
                    return;
                }
                renderSearchResults(products, query);
            };

            if (remainingTime > 0) {
                setTimeout(displayResults, remainingTime);
            } else {
                displayResults();
            }

        } catch (error) {
            console.error('Search failed:', error);
            hideDropdown();
        }
    };

    const renderSearchResults = (products, query) => {
        resultsDropdown.innerHTML = '';
        if (products.length === 0) {
            resultsDropdown.innerHTML = `<div class="no-results"><i class="fas fa-search"></i><p>No products found for "${query}"</p></div>`;
        } else {
            products.forEach(product => {
                const itemLink = document.createElement('a');
                itemLink.className = 'suggestion-item-link';
                itemLink.href = `#`; 
                itemLink.dataset.productId = product._id;

                const highlightedName = highlightMatch(product.name, query);
                itemLink.innerHTML = `<div class="suggestion-item"><div class="suggestion-content"><span class="product-name">${highlightedName}</span><span class="product-price">${product.price}</span></div><i class="fas fa-arrow-right suggestion-arrow"></i></div>`;
                
                itemLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    const productId = e.currentTarget.dataset.productId;
                    if (typeof displayProductInModal === 'function') {
                        displayProductInModal(productId);
                        hideDropdown();
                    } else {
                        window.location.href = `search.html?q=${encodeURIComponent(product.name)}`;
                    }
                });

                resultsDropdown.appendChild(itemLink);
            });

            const viewAllLink = document.createElement('a');
            viewAllLink.className = 'suggestion-item-link view-all-link';
            viewAllLink.href = `search.html?q=${encodeURIComponent(query)}`;
            viewAllLink.innerHTML = `<div class="suggestion-item view-all"><i class="fas fa-search"></i><span>View all results for "${query}"</span></div>`;
            resultsDropdown.appendChild(viewAllLink);
        }
        showDropdown();
    };

    const highlightMatch = (text, query) => {
        if (!query) return text;
        const regex = new RegExp(`^(${query})`, 'i');
        return text.replace(regex, '<strong class="search-highlight">$1</strong>');
    };

    const showLoadingState = () => {
        resultsDropdown.innerHTML = `<div class="suggestion-item loading-state"><i class="fas fa-spinner fa-spin"></i><span>Searching...</span></div>`;
        showDropdown();
    };

    const showDropdown = () => {
        if (!resultsDropdown.style.display || resultsDropdown.style.display === 'none') {
            resultsDropdown.style.display = 'block';
        }
        isDropdownVisible = true;
        searchInput.setAttribute('aria-expanded', 'true');
    };

    const hideDropdown = () => {
        resultsDropdown.style.display = 'none';
        isDropdownVisible = false;
        searchInput.setAttribute('aria-expanded', 'false');
    };

    searchInput.addEventListener('input', debounce((event) => { performSearch(event.target.value.trim()); }, 200));
    searchInput.addEventListener('focus', () => { if (searchInput.value.trim().length > 0 && !isDropdownVisible) { performSearch(searchInput.value.trim()); } });
    searchInput.addEventListener('keydown', (event) => { if (event.key === 'Escape') { hideDropdown(); } });
    searchForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const query = searchInput.value.trim();
        if (query) { window.location.href = `search.html?q=${encodeURIComponent(query)}`; }
    });
    document.addEventListener('click', (event) => { if (!searchForm.contains(event.target)) { hideDropdown(); } });
}
function setupMobileMenu() {
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const mobileNav = document.getElementById('mobile-nav');
    const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
    const mobileOpenCartBtn = document.getElementById('mobile-open-cart-btn');
    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
    const mobileAuthLinks = document.getElementById('mobile-auth-links');
    const mobileUserActions = document.getElementById('mobile-user-actions');
    const mobileAdminLink = document.getElementById('mobile-admin-link');
    const mobileCartCount = document.getElementById('mobile-cart-count');
    const logo = document.querySelector('.logo');
    
    if (!hamburgerMenu || !mobileNav) return;
    
    let scrollPosition = 0;
    
    function toggleMobileMenu() {
        const isOpening = !hamburgerMenu.classList.contains('active');
        hamburgerMenu.classList.toggle('active');
        mobileNav.classList.toggle('active');
        mobileNavOverlay.classList.toggle('active');
        
        if (logo) {
            logo.style.zIndex = isOpening ? '1' : '999';
            logo.style.opacity = isOpening ? '0.3' : '1';
            logo.style.pointerEvents = isOpening ? 'none' : 'auto';
        }
        
        if (isOpening) {
            updateMobileAuthUI();
            scrollPosition = window.pageYOffset;
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            document.body.style.top = `-${scrollPosition}px`;
        } else {
            document.documentElement.style.scrollBehavior = 'auto';
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
            document.body.style.top = '';
            window.scrollTo(0, scrollPosition);
            setTimeout(() => {
                document.documentElement.style.scrollBehavior = '';
            }, 0);
        }
    }
    
    function closeMobileMenu() {
        if (!hamburgerMenu.classList.contains('active')) return;

        hamburgerMenu.classList.remove('active');
        mobileNav.classList.remove('active');
        mobileNavOverlay.classList.remove('active');
        
        if (logo) {
            logo.style.zIndex = '999';
            logo.style.opacity = '1';
            logo.style.pointerEvents = 'auto';
        }
        
        document.documentElement.style.scrollBehavior = 'auto';
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.top = '';
        window.scrollTo(0, scrollPosition);
        setTimeout(() => {
            document.documentElement.style.scrollBehavior = '';
        }, 0);
    }
    
    function updateMobileAuthUI() {
        const token = localStorage.getItem('authToken');
        const user = parseJwt(token);
        
        if (token && user) {
            if (mobileAuthLinks) mobileAuthLinks.style.display = 'none';
            if (mobileUserActions) mobileUserActions.style.display = 'flex';
            if (mobileAdminLink) {
                mobileAdminLink.style.display = user.role === 'admin' ? 'block' : 'none';
            }
        } else {
            if (mobileAuthLinks) mobileAuthLinks.style.display = 'flex';
            if (mobileUserActions) mobileUserActions.style.display = 'none';
        }
    }
    
    hamburgerMenu.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleMobileMenu();
    });
    
    mobileNavOverlay.addEventListener('click', closeMobileMenu);
    
    const mobileNavLinks = mobileNav.querySelectorAll('.mobile-nav-menu > a');
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const targetHref = link.getAttribute('href');
            closeMobileMenu();
            
            // Allow the menu to fully close before navigating
            setTimeout(() => {
                 if (targetHref && targetHref.startsWith('#')) {
                    const targetElement = document.getElementById(targetHref.substring(1));
                    if (targetElement) {
                         targetElement.scrollIntoView({ behavior: 'smooth' });
                    }
                 } else if (targetHref) {
                    window.location.href = targetHref;
                 }
            }, 300); 
        });
    });
    
    if (mobileOpenCartBtn) {
        mobileOpenCartBtn.addEventListener('click', function(e) {
            e.preventDefault();
            closeMobileMenu();
            setTimeout(() => {
                const openCartBtn = document.getElementById('open-cart-btn');
                if (openCartBtn) openCartBtn.click();
            }, 300);
        });
    }
    
    if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            closeMobileMenu();
            localStorage.removeItem('authToken');
            localStorage.removeItem('guestCart');
            window.location.href = 'index.html';
        });
    }
    
    function updateMobileCartCount(count) {
        if (mobileCartCount) {
            mobileCartCount.textContent = count;
        }
    }
    
    window.updateCartCount = async function() {
        const cartCountSpan = document.getElementById('cart-count');
        const token = localStorage.getItem('authToken');
        let totalItems = 0;

        try {
            if (token) {
                const response = await fetch('https://project-borealis.vercel.app/api/cart', { 
                    headers: { 'Authorization': `Bearer ${token}` } 
                });
                if (response.ok) {
                    const cartItems = await response.json();
                    totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
                }
            } else {
                const guestCart = JSON.parse(localStorage.getItem('guestCart')) || [];
                totalItems = guestCart.reduce((sum, item) => sum + item.quantity, 0);
            }
        } catch (error) {
            console.error('Failed to update cart count:', error);
        }
        
        if (cartCountSpan) cartCountSpan.textContent = totalItems;
        updateMobileCartCount(totalItems);
    };
    
    updateMobileAuthUI();
    
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            closeMobileMenu();
        }
    });
    
    mobileNav.addEventListener('touchmove', (e) => {
        e.stopPropagation();
    }, { passive: false });
    
    window.addEventListener('storage', (e) => {
        if (e.key === 'authToken') {
            updateMobileAuthUI();
        }
    });
}
function setupGracefulVideoLoop() {
    const video1 = document.querySelector('[data-video-player="1"]');
    const video2 = document.querySelector('[data-video-player="2"]');

    if (!video1 || !video2) return; // Don't run if videos aren't on the page

    // The duration in seconds to start the crossfade before the video ends
    const FADE_TIME = 1.5; 

    const players = {
        current: video1,
        next: video2,
    };

    // Start the first video
    players.current.play().catch(e => console.error("Video autoplay failed:", e));

    const swapPlayers = () => {
        players.next.classList.add('is-visible');
        players.current.classList.remove('is-visible');

        // Swap roles for the next loop
        [players.current, players.next] = [players.next, players.current];
    };

    const onTimeUpdate = (event) => {
        const video = event.target;
        if (video.duration - video.currentTime <= FADE_TIME) {
            video.removeEventListener('timeupdate', onTimeUpdate); // Prevent multiple triggers
            players.next.play().catch(e => console.error("Video autoplay failed:", e));
            swapPlayers();
        }
    };

    const onEnded = (event) => {
        const video = event.target;
        // Reset the video that just finished
        video.currentTime = 0;
        // Re-attach the listener for its next turn
        video.addEventListener('timeupdate', onTimeUpdate);
    };

    video1.addEventListener('timeupdate', onTimeUpdate);
    video2.addEventListener('timeupdate', onTimeUpdate);
    video1.addEventListener('ended', onEnded);
    video2.addEventListener('ended', onEnded);
}

document.addEventListener('DOMContentLoaded', () => {
    setupHeader();
    setupHeaderScrollEffect();
    updateCartCount();
    setupCartModal();
    setupSearch();
    setupMobileMenu();
    setupGracefulVideoLoop();
});