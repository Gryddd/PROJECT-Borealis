document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const errorMessageDiv = document.getElementById('error-message');

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            errorMessageDiv.style.display = 'none';
            console.log("Login form submitted.");

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('https://project-borealis.vercel.app/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });

                const data = await response.json();
                if (!response.ok) { throw new Error(data.error || 'Login failed'); }
                
                if (data.token) {
                    console.log("Login successful. Token received.");
                    localStorage.setItem('authToken', data.token);

                    // --- DEBUGGING THE MERGE PROCESS ---
                    const guestCart = JSON.parse(localStorage.getItem('guestCart'));
                    
                    if (guestCart && guestCart.length > 0) {
                        console.log("%cGuest cart found in localStorage. Attempting to merge...", "color: yellow; font-weight: bold;", guestCart);

                        try {
                            const mergeResponse = await fetch('https://project-borealis.vercel.app/api/cart/merge', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${data.token}`
                                },
                                body: JSON.stringify({ cartItems: guestCart })
                            });
                            
                            if (mergeResponse.ok) {
                                console.log("%cServer responded OK to merge request. Deleting local guest cart.", "color: green;");
                                localStorage.removeItem('guestCart');
                            } else {
                                const errorData = await mergeResponse.json();
                                console.error("%cServer responded with an error during merge:", "color: red;", errorData);
                            }
                        } catch (error) {
                            console.error("%cFETCH FAILED: Could not send merge request to the server.", "color: red;", error);
                        }
                        
                    } else {
                        console.log("No guest cart found in localStorage. Skipping merge.");
                    }

                    // --- REDIRECT LOGIC ---
                    const redirectUrl = localStorage.getItem('redirectAfterLogin') || 'index.html';
                    console.log(`Redirecting to: ${redirectUrl}`);
                    if (redirectUrl === 'checkout.html') {
                         localStorage.removeItem('redirectAfterLogin');
                    }
                    window.location.href = redirectUrl;
                }

            } catch (error) {
                errorMessageDiv.textContent = error.message;
                errorMessageDiv.style.display = 'block';
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            errorMessageDiv.style.display = 'none';
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            try {
                const response = await fetch('https://project-borealis.vercel.app/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password }),
                });
                const data = await response.json();
                if (!response.ok) { throw new Error(data.error || 'Registration failed'); }
                localStorage.removeItem('authToken');
                localStorage.removeItem('guestCart');
                alert('Registration successful! Please log in to continue.');
                window.location.href = 'login.html';
            } catch (error) {
                errorMessageDiv.textContent = error.message;
                errorMessageDiv.style.display = 'block';
            }
        });
    }
});