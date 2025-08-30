const modalOverlay = document.getElementById('product-modal-overlay');
const modal = document.getElementById('product-modal');
const modalContent = document.getElementById('modal-content');

function openModal() {
    if (modalOverlay) modalOverlay.classList.add('active');
    if (modal) modal.classList.add('active');
}

function closeModal() {
    if (modalOverlay) modalOverlay.classList.remove('active');
    if (modal) modal.classList.remove('active');
}

async function displayProductInModal(productId) {
    if (!modalContent) {
        console.error("Modal content element not found on this page.");
        return;
    }
    modalContent.innerHTML = `<div class="spinner-container"><div class="spinner"></div></div>`;
    openModal();

    try {
        const response = await fetch(`https://project-borealis.vercel.app/api/products/${productId}`);
        if (!response.ok) throw new Error('Could not find product.');

        const product = await response.json();
        
        let addToCartButtonHTML;
        if (product.countInStock > 0) {
            addToCartButtonHTML = `<button class="btn-primary add-to-cart-btn" data-product='${JSON.stringify(product)}'>Add to Cart</button>`;
        } else {
            addToCartButtonHTML = `<button class="btn-primary" disabled style="background-color: #555; cursor: not-allowed;">Out of Stock</button>`;
        }
        
        modalContent.innerHTML = `
            <div class="product-detail-layout">
                <div class="product-image-section">
                    <img src="${product.imageUrl}" alt="${product.name}">
                </div>
                <div class="product-info-section">
                    <h2 class="product-title">${product.name}</h2>
                    <p class="product-price">${product.price}</p>
                    <p class="product-description">A timeless piece, crafted with care and designed to bring a touch of elegance to any space. Made from the highest quality materials, this item promises durability and lasting beauty.</p>
                    ${addToCartButtonHTML}
                </div>
            </div>`;
    } catch (error) {
        modalContent.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const productGrid = document.querySelector('.product-grid');
    const closeModalBtn = document.getElementById('modal-close-btn');

let notificationTimeout;
function showNotification(message) {
    // Clear any existing notification timeouts
    if (notificationTimeout) clearTimeout(notificationTimeout);

    // --- Mobile Notification Logic ---
    if (window.innerWidth <= 768) {
        // Remove any old toast that might exist
        const existingToast = document.querySelector('.mobile-notification-toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'mobile-notification-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        // Use a short timeout to allow the browser to apply the initial CSS before transitioning
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // Set a timeout to hide and then remove the toast
        notificationTimeout = setTimeout(() => {
            toast.classList.remove('show');
            // Remove the element from the DOM after the fade-out transition has finished
            setTimeout(() => toast.remove(), 500); 
        }, 3000);

    // --- Desktop Notification Logic (Original) ---
    } else {
        const cartAnchor = document.getElementById('cart-anchor');
        if (!cartAnchor) return;
        
        const existingNotification = cartAnchor.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        cartAnchor.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 10);

        notificationTimeout = setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }
}

    async function fetchAndDisplayProducts() {
        if (!productGrid) return;
        try {
            const response = await fetch('https://project-borealis.vercel.app/api/products');
            if (!response.ok) throw new Error('Failed to load products.');
            const products = await response.json();
            productGrid.innerHTML = '';
            products.forEach(product => {
                productGrid.innerHTML += `
                    <a class="product-card-link" data-product-id="${product._id}">
                        <div class="product-card">
                            <div class="card-image-wrapper"><img src="${product.imageUrl}" alt="${product.name}"></div>
                            <div class="card-content">
                                <h3>${product.name}</h3>
                                <p class="price">${product.price}</p>
                                <button class="btn-secondary">View Details</button>
                            </div>
                        </div>
                    </a>`;
            });
        } catch (error) {
            productGrid.innerHTML = `<p style="color: red; grid-column: 1 / -1;">Error: ${error.message}</p>`;
        }
    }
    
    async function addToCart(product) {
        const token = localStorage.getItem('authToken');
        
        if (token) {
            try {
                const response = await fetch('https://project-borealis.vercel.app/api/cart', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ productId: product._id })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Failed to add item.');
                showNotification('Added to Cart!');
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        } else {
            let guestCart = JSON.parse(localStorage.getItem('guestCart')) || [];
            const existingItemIndex = guestCart.findIndex(item => item.productId === product._id);

            if (existingItemIndex > -1) {
                guestCart[existingItemIndex].quantity++;
            } else {
                guestCart.push({
                    productId: product._id,
                    name: product.name,
                    price: product.price,
                    imageUrl: product.imageUrl,
                    quantity: 1,
                });
            }
            localStorage.setItem('guestCart', JSON.stringify(guestCart));
            showNotification('Added to Cart!');
        }

        closeModal();
        await updateCartCount();
    }


    function setupFadeInAnimations() {
        const fadeElements = document.querySelectorAll('.fade-in');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        fadeElements.forEach(el => observer.observe(el));
    }

    if (productGrid) {
        productGrid.addEventListener('click', (event) => {
            const cardLink = event.target.closest('.product-card-link');
            if (cardLink) {
                event.preventDefault();
                const productId = cardLink.dataset.productId;
                displayProductInModal(productId);
            }
        });
    }

    if (modalContent) {
        modalContent.addEventListener('click', (event) => {
            const addToCartBtn = event.target.closest('.add-to-cart-btn');
            if (addToCartBtn) {
                const product = JSON.parse(addToCartBtn.dataset.product);
                addToCart(product);
            }
        });
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', closeModal);

    fetchAndDisplayProducts();
    setupFadeInAnimations();
});