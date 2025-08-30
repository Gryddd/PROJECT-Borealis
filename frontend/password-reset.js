document.addEventListener('DOMContentLoaded', () => {
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const resetPasswordForm = document.getElementById('reset-password-form');
    const messageDiv = document.getElementById('message');

    // --- FORGOT PASSWORD PAGE LOGIC ---
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const submitButton = forgotPasswordForm.querySelector('button[type="submit"]');
            
            submitButton.textContent = 'Sending...';
            submitButton.disabled = true;

            try {
                const response = await fetch('https://project-borealis.vercel.app/api/auth/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                });

                const data = await response.json();
                
                messageDiv.style.backgroundColor = '#28a745'; // Green for success
                messageDiv.textContent = data.message;
                messageDiv.style.display = 'block';

            } 
            catch (error) {
                messageDiv.style.backgroundColor = '#dc3545'; // Red for error
                messageDiv.textContent = 'An error occurred. Please try again.';
                messageDiv.style.display = 'block';
            } finally {
                submitButton.textContent = 'Send Reset Link';
                submitButton.disabled = false;
            }
        });
    }

    if (resetPasswordForm) {
        // Get the token from the URL
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        if (!token) {
            messageDiv.style.backgroundColor = '#dc3545';
            messageDiv.textContent = 'No reset token found. Please request a new reset link.';
            messageDiv.style.display = 'block';
            resetPasswordForm.style.display = 'none'; // Hide form if no token
        }

        resetPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('password').value;
            const submitButton = resetPasswordForm.querySelector('button[type="submit"]');

            submitButton.textContent = 'Resetting...';
            submitButton.disabled = true;

            try {
                const response = await fetch(`https://project-borealis.vercel.app/api/auth/reset-password/${token}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password }),
                });

                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.error || 'Failed to reset password.');
                }

                messageDiv.style.backgroundColor = '#28a745'; // Green
                messageDiv.textContent = data.message + ' Redirecting to login...';
                messageDiv.style.display = 'block';

                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);

            } catch (error) {
                messageDiv.style.backgroundColor = '#dc3545'; // Red
                messageDiv.textContent = error.message;
                messageDiv.style.display = 'block';
                submitButton.textContent = 'Reset Password';
                submitButton.disabled = false;
            }
        });
    }
});