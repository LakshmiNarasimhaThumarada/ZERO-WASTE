document.addEventListener('DOMContentLoaded', function() {
    const adminLoginForm = document.getElementById('adminLoginForm');
    const togglePassword = document.querySelector('.toggle-password');
    const passwordInput = document.getElementById('password');

    // Handle password visibility toggle
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.querySelector('i').classList.toggle('fa-eye');
        this.querySelector('i').classList.toggle('fa-eye-slash');
    });

    // Handle form submission
    adminLoginForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = passwordInput.value;

        // Placeholder authentication (replace with actual authentication logic)
        if (username === 'admin' && password === 'admin123') {
            // Store admin session info
            sessionStorage.setItem('adminInfo', JSON.stringify({
                username: username,
                role: 'admin',
                isAuthenticated: true
            }));

            // Show success message
            showMessage('Login successful! Redirecting to dashboard...', 'success');

            // Redirect to Admin_dashboard.html after a short delay
            setTimeout(() => {
                window.location.href = 'Admin_dashboard.html';
            }, 1500);
        } else {
            showMessage('Invalid username or password', 'error');
        }
    });

    // Function to show messages
    function showMessage(message, type) {
        // Remove any existing message
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create new message element
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        messageElement.textContent = message;

        // Style the message
        Object.assign(messageElement.style, {
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '1rem 2rem',
            borderRadius: '8px',
            backgroundColor: type === 'success' ? '#4CAF50' : '#f44336',
            color: 'white',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            zIndex: '1000',
            animation: 'slideDown 0.3s ease-out'
        });

        // Add animation keyframes
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideDown {
                from {
                    transform: translate(-50%, -100%);
                    opacity: 0;
                }
                to {
                    transform: translate(-50%, 0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);

        // Add message to the page
        document.body.appendChild(messageElement);

        // Remove message after 3 seconds for error messages
        if (type === 'error') {
            setTimeout(() => {
                messageElement.remove();
                style.remove();
            }, 3000);
        }
    }
}); 