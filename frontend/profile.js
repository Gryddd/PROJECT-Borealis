document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');
    const profileMemberSince = document.getElementById('profile-member-since');
    const orderHistoryContainer = document.getElementById('order-history');

    async function fetchProfileData() {
        try {
            const response = await fetch('https://project-borealis.vercel.app/api/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                localStorage.removeItem('authToken');
                window.location.href = 'login.html';
                throw new Error('Session expired.');
            }
            const user = await response.json();
            profileName.textContent = user.name;
            profileEmail.textContent = user.email;
            const joinDate = new Date(user.createdAt);
            profileMemberSince.textContent = joinDate.toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
        } catch (error) {
            console.error('Failed to fetch profile:', error);
            profileName.textContent = "Error";
            profileEmail.textContent = "Could not load profile.";
            profileMemberSince.textContent = "-";
        }
    }

async function fetchOrderHistory() {
    try {
        const response = await fetch('https://project-borealis.vercel.app/api/orders', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Could not load order history.');
        
        const orders = await response.json();

        orderHistoryContainer.innerHTML = `<h2 style="font-family: var(--font-heading); margin-bottom: 1.5rem;">Order History</h2>`;

        if (orders.length === 0) {
            orderHistoryContainer.innerHTML += '<p style="color: var(--text-secondary);">You have not placed any orders yet.</p>';
            return;
        }

        orders.forEach(order => {
            const orderDate = new Date(order.createdAt).toLocaleDateString();
            const orderElement = document.createElement('div');
            orderElement.className = 'order-history-item';

            const statusBadge = `<span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span>`;
            const trackingHtml = order.trackingNumber 
                ? `<div class="tracking-info">
                     <span class="order-label">Tracking #</span>
                     <span class="tracking-number">${order.trackingNumber}</span>
                   </div>`
                : '';
            const itemsHtml = order.items.map(item => `<li class="order-product-item">${item.name} (x${item.quantity})</li>`).join('');

            orderElement.innerHTML = `
                <div class="order-header">
                    <div>
                        <span class="order-label">Order ID</span>
                        <span class="order-id">${order._id}</span>
                    </div>
                    ${statusBadge}
                </div>
                <div class="order-details">
                    <div class="order-products">
                        <ul>${itemsHtml}</ul>
                    </div>
                    <div class="order-summary">
                        ${trackingHtml}
                        <span class="order-label">Total</span>
                        <span class="order-total">$${order.totalPrice}</span>
                    </div>
                </div>
            `;
            orderHistoryContainer.appendChild(orderElement);
        });

    } catch (error) {
        console.error('Failed to fetch order history:', error);
        orderHistoryContainer.innerHTML = '<p style="color: red;">Could not load order history.</p>';
    }
}

    fetchProfileData();
    fetchOrderHistory();
});