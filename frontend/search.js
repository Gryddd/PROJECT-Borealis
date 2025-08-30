document.addEventListener('DOMContentLoaded', () => {
    const productGrid = document.querySelector('.product-grid');
    const resultsTitle = document.getElementById('search-results-title');
    
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');

    if (!query) {
        resultsTitle.textContent = 'Please enter a search term.';
        return;
    }

    resultsTitle.textContent = `Search results for "${query}"`;

    async function fetchSearchResults() {
        try {
            const response = await fetch(`https://project-borealis.vercel.app/api/products/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) {
                throw new Error('Search failed to load.');
            }

            const products = await response.json();
            productGrid.innerHTML = ''; 

            if (products.length === 0) {
                productGrid.innerHTML = `<p style="grid-column: 1 / -1; text-align: center;">No products found matching your search.</p>`;
                return;
            }

            products.forEach(product => {
                const productCard = `
                    <a class="product-card-link" data-product-id="${product._id}">
                        <div class="product-card">
                            <div class="card-image-wrapper">
                                <img src="${product.imageUrl}" alt="${product.name}">
                            </div>
                            <div class="card-content">
                                <h3>${product.name}</h3>
                                <p class="price">${product.price}</p>
                                <button class="btn-secondary">View Details</button>
                            </div>
                        </div>
                    </a>
                `;
                productGrid.innerHTML += productCard;
            });

        } catch (error) {
            productGrid.innerHTML = `<p style="color: red; grid-column: 1 / -1;">Error: ${error.message}</p>`;
        }
    }

    fetchSearchResults();
});