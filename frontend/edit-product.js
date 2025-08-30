document.addEventListener('DOMContentLoaded', () => {
    const formTitle = document.getElementById('form-title');
    const productForm = document.getElementById('product-form');
    const errorMessageDiv = document.getElementById('error-message');
    const nameInput = document.getElementById('name');
    const priceInput = document.getElementById('price');
    const imageUrlInput = document.getElementById('imageUrl');
    const token = localStorage.getItem('authToken');

    if (!token) {
        window.location.href = 'login.html';
        return;
    }


    if (!formTitle || !productForm || !nameInput || !priceInput || !imageUrlInput) {
        console.error('A critical form element is missing from the HTML.');
        if(errorMessageDiv) {
            errorMessageDiv.textContent = 'Error: Page structure is broken. Please contact support.';
            errorMessageDiv.style.display = 'block';
        }
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');
    const isEditMode = productId != null;

    async function initializePage() {
        if (isEditMode) {
            formTitle.textContent = 'Edit Product';
            try {
                const response = await fetch(`https://project-borealis.vercel.app/api/products/${productId}`);
                if (!response.ok) throw new Error('Could not fetch product data.');
                
                const product = await response.json();
                nameInput.value = product.name;
                priceInput.value = product.price;
                imageUrlInput.value = product.imageUrl;
            } catch (error) {
                errorMessageDiv.textContent = error.message;
                errorMessageDiv.style.display = 'block';
            }
        } else {
            formTitle.textContent = 'Add New Product';
        }
    }

    productForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if(errorMessageDiv) errorMessageDiv.style.display = 'none';

        const productData = {
            name: nameInput.value,
            price: priceInput.value,
            imageUrl: imageUrlInput.value,
        };

        try {
            let response;
            const url = isEditMode ? `https://project-borealis.vercel.app/api/products/${productId}` : 'https://project-borealis.vercel.app/api/products';
            const method = isEditMode ? 'PUT' : 'POST';

            response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(productData)
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || `Failed to ${method === 'PUT' ? 'update' : 'create'} product.`);
            }

            window.location.href = 'admin.html';

        } catch (error) {
            errorMessageDiv.textContent = error.message;
            errorMessageDiv.style.display = 'block';
        }
    });

    initializePage();
});