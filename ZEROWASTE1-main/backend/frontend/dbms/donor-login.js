document.addEventListener('DOMContentLoaded', function() {
    // Handle password visibility toggle
    const togglePassword = document.querySelector('.toggle-password');
    const passwordInput = document.querySelector('#password');

    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.querySelector('i').classList.toggle('fa-eye');
        this.querySelector('i').classList.toggle('fa-eye-slash');
    });

    // Handle form submission
    const loginForm = document.querySelector('#loginForm');
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.querySelector('#email').value;
        const password = document.querySelector('#password').value;
        const role = document.querySelector('input[name="role"]:checked').value;
        const rememberMe = document.querySelector('input[name="remember"]').checked;

        // Here you would typically validate credentials with your server
        console.log({
            email,
            password,
            role,
            rememberMe
        });

        // For demonstration purposes, simulate successful login and redirect
        // In a real application, this would happen after server validation
        simulateSuccessfulLogin(email);
    });

    function simulateSuccessfulLogin(email) {
        // Store user info in sessionStorage (for demo purposes)
        const userInfo = {
            email: email,
            name: email.split('@')[0], // Simple way to generate a display name
            avatar: 'https://via.placeholder.com/40' // Default avatar
        };
        sessionStorage.setItem('userInfo', JSON.stringify(userInfo));

        // Show success message and redirect
        const successMessage = document.createElement('div');
        successMessage.className = 'alert alert-success';
        successMessage.style.position = 'fixed';
        successMessage.style.top = '20px';
        successMessage.style.left = '50%';
        successMessage.style.transform = 'translateX(-50%)';
        successMessage.style.padding = '1rem 2rem';
        successMessage.style.borderRadius = '8px';
        successMessage.style.backgroundColor = '#4CAF50';
        successMessage.style.color = 'white';
        successMessage.textContent = 'Login successful! Redirecting to dashboard...';
        document.body.appendChild(successMessage);

        // Redirect after a short delay
        setTimeout(() => {
            window.location.href = 'donor-dashboard.html';
        }, 1500);
    }

    // Handle role selection animation
    const roleOptions = document.querySelectorAll('.role-option input');
    roleOptions.forEach(option => {
        option.addEventListener('change', function() {
            const card = this.nextElementSibling;
            const icon = card.querySelector('i');
            
            // Add animation to the icon
            icon.style.transform = 'scale(1.2) rotate(360deg)';
            setTimeout(() => {
                icon.style.transform = '';
            }, 300);
        });
    });

    // Handle OAuth buttons
    const oauthButtons = document.querySelectorAll('.oauth-btn');
    oauthButtons.forEach(button => {
        button.addEventListener('click', function() {
            const provider = this.classList.contains('google') ? 'Google' : 'Facebook';
            // Here you would typically initiate OAuth flow
            console.log(`Initiating ${provider} OAuth flow`);
            
            // For demonstration, simulate OAuth login
            simulateSuccessfulLogin(`demo.user@${provider.toLowerCase()}.com`);
        });
    });
}); 