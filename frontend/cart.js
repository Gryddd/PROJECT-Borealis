document.addEventListener('DOMContentLoaded', () => {
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartSubtotalSpan = document.getElementById('cart-subtotal');
    const cartCountSpan = document.getElementById('cart-count');

    async function renderCart() {
        const cartItems = await fetchCartItems();

        cartItemsContainer.innerHTML = '';
        
        if (cartItems.length === 0) {
            cartItemsContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">Your cart is empty.</p>';
        } else {
            cartItems.forEach(item => {
                const cartItemHTML = `
                    <div class="cart-item">
                        <img src="${item.imageUrl}" alt="${item.name}" class="cart-item-image">
                        <div class="cart-item-details">
                            <h3>${item.name}</h3>
                            <p class="price">${item.price}</p>
                        </div>
                        <div class="cart-item-quantity">
                            <p>Quantity: ${item.quantity}</p>
                        </div>
                        <button class="btn-remove" data-item-id="${item._id}">Remove</button>
                    </div>
                `;
                cartItemsContainer.innerHTML += cartItemHTML;
            });
        }
        
        calculateSubtotal(cartItems);
        updateCartCount(cartItems);
    }

    async function fetchCartItems() {
        try {
            const response = await fetch('https://project-borealis.vercel.app/api/cart');
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch cart items:', error);
            return [];
        }
    }

    function calculateSubtotal(cartItems) {
        let total = 0;
        cartItems.forEach(item => {
            const price = parseFloat(item.price.replace('$', ''));
            total += price * item.quantity;
        });
        cartSubtotalSpan.textContent = `$${total.toFixed(2)}`;
    }

    async function removeFromCart(cartItemId) {
        try {
            const response = await fetch(`https://project-borealis.vercel.app/api/cart/${cartItemId}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                renderCart();
            } else {
                console.error('Failed to remove item from cart');
            }
        } catch (error) {
            console.error('Error removing item from cart:', error);
        }
    }

    cartItemsContainer.addEventListener('click', (event) => {
        if (event.target && event.target.matches('button.btn-remove[data-item-id]')) {
            const cartItemId = event.target.dataset.itemId;
            removeFromCart(cartItemId);
        }
    });

    function updateCartCount(cartItems) {
        const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        cartCountSpan.textContent = totalItems;
    }

    renderCart();
});