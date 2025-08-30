document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('authToken');
    const checkoutLayout = document.querySelector('.checkout-layout');
    const guestPrompt = document.getElementById('guest-checkout-prompt');

    if (!token) {
        if(checkoutLayout) checkoutLayout.style.display = 'none';
        if(guestPrompt) guestPrompt.style.display = 'block';
        const guestLoginBtn = document.getElementById('guest-login-btn');
        if (guestLoginBtn) {
            guestLoginBtn.addEventListener('click', () => {
                localStorage.setItem('redirectAfterLogin', 'checkout.html');
            });
        }
        return;
    }

    const messageContainer = document.querySelector("#payment-message");
    function showMessage(messageText) {
        if (!messageContainer) return;
        messageContainer.style.display = "block";
        messageContainer.textContent = messageText;
        setTimeout(() => { messageContainer.style.display = "none"; messageContainer.textContent = ""; }, 4000);
    }

    const submitButton = document.querySelector("#submit");
    const spinner = document.querySelector("#spinner");
    const buttonText = document.querySelector("#button-text");
    function setLoading(isLoading) {
        if (!submitButton || !spinner || !buttonText) return;
        submitButton.disabled = isLoading;
        spinner.style.display = isLoading ? "inline" : "none";
        buttonText.style.display = isLoading ? "none" : "inline";
    }

    async function populateSummaryAndInitialize() {
        const summaryItemsContainer = document.getElementById('summary-items-container');
        const summaryTotalSpan = document.getElementById('summary-total');
        if (!summaryItemsContainer || !summaryTotalSpan) return;

        try {
            const response = await fetch('https://project-borealis.vercel.app/api/cart', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to load your cart.');
            
            const cartItems = await response.json();
            
            if (cartItems.length === 0) {
                if(checkoutLayout) checkoutLayout.innerHTML = `<div class="auth-container" style="text-align: center;"><p>Your cart is empty. Nothing to check out.</p><br/><a href="index.html" class="btn-primary">Continue Shopping</a></div>`;
                return;
            }
            
            summaryItemsContainer.innerHTML = '';
            let total = 0;
            cartItems.forEach(item => {
                const price = parseFloat(item.price.replace('$', ''));
                total += price * item.quantity;
                summaryItemsContainer.innerHTML += `
                    <div class="summary-item">
                        <img src="${item.imageUrl}" alt="${item.name}" class="summary-item-image">
                        <div class="summary-item-details">
                            <span class="summary-product-name">${item.name}</span>
                            <span class="summary-product-quantity">(x${item.quantity})</span>
                        </div>
                        <span class="summary-item-price">$${(price * item.quantity).toFixed(2)}</span>
                    </div>`;
            });
            summaryTotalSpan.textContent = `$${total.toFixed(2)}`;

            await initializeStripe();

        } catch (error) {
            if(checkoutLayout) checkoutLayout.innerHTML = `<p style="color:red; text-align: center;">${error.message}</p>`;
        }
    }

    let elements;
    const stripe = Stripe('pk_test_51QVxEfIs95dfMCGuSUatAOoBUP8ztPHPUyFsyrbIYVvMQPDDGuXOnPfzaXGYFnitx6pkPjaxcdPWjOAxCLmEgwQe00DkjDGMbo');

    async function initializeStripe() {
        const response = await fetch('https://project-borealis.vercel.app/api/create-payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Could not initialize payment.');
        }

        const { clientSecret } = await response.json();
        const appearance = { theme: 'night', variables: { colorPrimary: '#D4AF37', colorBackground: '#181818', colorText: '#EAEAEA', borderRadius: '4px' } };
        elements = stripe.elements({ appearance, clientSecret });

        const linkAuthenticationElement = elements.create("linkAuthentication");
        linkAuthenticationElement.mount("#link-authentication-element");
        
        const paymentElement = elements.create("payment");
        paymentElement.mount("#payment-element");
    }

    const paymentForm = document.getElementById("payment-form");
    if(paymentForm) {
        paymentForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            setLoading(true);

            if (!elements) {
                showMessage("Payment form is not ready. Please wait a moment.");
                setLoading(false);
                return;
            }

            const { error: stripeError } = await stripe.confirmPayment({
                elements,
                confirmParams: { return_url: `${window.location.origin}/confirmation.html` },
                redirect: "if_required"
            });

            if (stripeError) {
                showMessage(stripeError.type === "card_error" || stripeError.type === "validation_error" ? stripeError.message : "An unexpected error occurred.");
                setLoading(false);
                return;
            }

            await submitOrder();
        });
    }

    async function submitOrder() {
        const shippingAddress = {
            fullName: document.getElementById('fullName').value,
            phoneNumber: document.getElementById('phoneNumber').value,
            address: document.getElementById('address').value,
            city: document.getElementById('city').value,
            postalCode: document.getElementById('postalCode').value,
        };

        try {
            const response = await fetch('https://project-borealis.vercel.app/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ shippingAddress })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Could not place order after payment.');
            window.location.href = `confirmation.html?orderId=${data.orderId}`;
        } catch (error) {
            showMessage(error.message);
            setLoading(false);
        }
    }

    populateSummaryAndInitialize();
});