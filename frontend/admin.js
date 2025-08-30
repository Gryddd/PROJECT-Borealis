document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const tabs = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');
    const productList = document.getElementById('product-list');
    const orderList = document.getElementById('order-list');
    const userList = document.getElementById('user-list');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const tabName = tab.dataset.tab;
            document.getElementById(`${tabName}-content`).classList.add('active');
        });
    });

    async function fetchAndDisplayProducts() {
        try {
            const response = await fetch('https://project-borealis.vercel.app/api/products');
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            const products = await response.json();
            
            productList.innerHTML = '';
            if (products.length === 0) {
                productList.innerHTML = '<p>No products found.</p>';
                return;
            }
            products.forEach(product => {
                productList.innerHTML += `
                    <div class="admin-list-item product-row">
                        <span>${product.name || 'N/A'}</span>
                        <span>${product.price || 'N/A'}</span>
                        <div class="product-actions">
                            <a href="edit-product.html?id=${product._id}" class="btn-edit">Edit</a>
                            <button class="btn-delete" data-product-id="${product._id}">Delete</button>
                        </div>
                    </div>`;
            });
        } catch (error) {
            console.error('Failed to fetch products:', error);
            productList.innerHTML = '<p class="error-message">Could not load products.</p>';
        }
    }

    async function fetchAndDisplayOrders() {
        try {
            const response = await fetch('https://project-borealis.vercel.app/api/admin/orders', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Could not fetch orders.');
            const orders = await response.json();

            orderList.innerHTML = '';
            if (orders.length === 0) {
                orderList.innerHTML = '<p>No orders found.</p>';
                return;
            }
            orders.forEach(order => {
                const orderDate = new Date(order.createdAt).toLocaleDateString();
                const trackingInput = `<input type="text" class="tracking-input" value="${order.trackingNumber || ''}" placeholder="Add tracking #">`;
                orderList.innerHTML += `
                    <div class="admin-list-item order-row">
                        <div class="order-main-info">
                            <span class="order-id">${order._id}</span>
                            <span class="order-customer">${order.userDetails.name}</span>
                            <span class="order-date">${orderDate}</span>
                        </div>
                        <div class="order-details-expanded">
                            <p><strong>Address:</strong> ${order.shippingAddress.address}, ${order.shippingAddress.city}</p>
                            <p><strong>Phone:</strong> ${order.shippingAddress.phoneNumber}</p>
                        </div>
                        <div class="order-status-management">
                            <select class="status-select" data-order-id="${order._id}">
                                <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
                                <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                                <option value="Completed" ${order.status === 'Completed' ? 'selected' : ''}>Completed</option>
                                <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                            </select>
                            ${trackingInput}
                        </div>
                        <div class="order-actions">
                            <span class="order-total">$${order.totalPrice}</span>
                            <button class="btn-save-order" data-order-id="${order._id}">Save</button>
                        </div>
                    </div>`;
            });
        } catch (error) {
            console.error('Failed to fetch orders:', error);
            orderList.innerHTML = '<p class="error-message">Could not load orders.</p>';
        }
    }

    async function fetchAndDisplayUsers() {
        try {
            const response = await fetch('https://project-borealis.vercel.app/api/admin/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Could not fetch users.');
            const users = await response.json();

            userList.innerHTML = '';
            if (users.length === 0) {
                userList.innerHTML = '<p>No users found.</p>';
                return;
            }
            users.forEach(user => {
                const joinDate = new Date(user.createdAt).toLocaleDateString();
                userList.innerHTML += `
                    <div class="admin-list-item user-row">
                        <span>${user.name}</span>
                        <span>${user.email}</span>
                        <span class="user-role">${user.role}</span>
                        <span>Joined: ${joinDate}</span>
                    </div>`;
            });
        } catch (error) {
            console.error('Failed to fetch users:', error);
            userList.innerHTML = '<p class="error-message">Could not load users.</p>';
        }
    }

    productList.addEventListener('click', async (event) => {
        const deleteButton = event.target.closest('button.btn-delete');
        if (deleteButton) {
            const productId = deleteButton.dataset.productId;
            if (confirm('Are you sure you want to delete this product?')) {
                try {
                    const response = await fetch(`https://project-borealis.vercel.app/api/products/${productId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!response.ok) throw new Error('Failed to delete product.');
                    await fetchAndDisplayProducts();
                } catch (error) {
                    console.error('Error deleting product:', error);
                    alert('Error: Could not delete product.');
                }
            }
        }
    });

    orderList.addEventListener('click', async (event) => {
        const saveButton = event.target.closest('button.btn-save-order');
        if (saveButton) {
            const orderId = saveButton.dataset.orderId;
            const orderRow = saveButton.closest('.order-row');
            const status = orderRow.querySelector('.status-select').value;
            const trackingNumber = orderRow.querySelector('.tracking-input').value;

            try {
                const response = await fetch(`https://project-borealis.vercel.app/api/admin/orders/${orderId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ status, trackingNumber })
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to update order.');
                }
                
                saveButton.textContent = 'Saved!';
                saveButton.style.backgroundColor = '#28a745';
                setTimeout(() => {
                    saveButton.textContent = 'Save';
                    saveButton.style.backgroundColor = '';
                }, 2000);

            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        }
    });

    fetchAndDisplayProducts();
    fetchAndDisplayOrders();
    fetchAndDisplayUsers();
});