// API Configuration
const API_BASE_URL = 'http://localhost:3000/api/auth';

// Utility Functions
const showError = (elementId, message) => {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.style.display = 'block';
    
    // Scroll to error
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

const clearError = (elementId) => {
    const element = document.getElementById(elementId);
    element.textContent = '';
    element.style.display = 'none';
};

const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

const validatePassword = (password) => {
    return password.length >= 8;
};

const validatePhone = (phone) => {
    const re = /^\+?[\d\s-]{10,}$/;
    return re.test(phone);
};

// Login Form Handling
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Clear previous errors
        clearError('emailError');
        clearError('passwordError');
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const remember = document.getElementById('remember').checked;
        
        // Validate inputs
        if (!validateEmail(email)) {
            showError('emailError', 'Please enter a valid email address');
            return;
        }
        
        if (!validatePassword(password)) {
            showError('passwordError', 'Password must be at least 8 characters long');
            return;
        }
        
        const submitButton = loginForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        
        try {
            // Show loading state
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            submitButton.disabled = true;
            
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password, remember })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Store token in localStorage if remember is checked
                if (remember && data.token) {
                    localStorage.setItem('authToken', data.token);
                }
                
                // Redirect to dashboard
                window.location.href = 'receiver-dashboard.html';
            } else {
                showError('passwordError', data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            showError('passwordError', 'An error occurred. Please try again.');
        } finally {
            // Reset button state
            submitButton.innerHTML = originalButtonText;
            submitButton.disabled = false;
        }
    });
}

// Registration Form Handling
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    // Show/hide organization name field based on role
    const roleSelect = document.getElementById('role');
    const orgNameGroup = document.getElementById('orgNameGroup');
    
    roleSelect.addEventListener('change', () => {
        orgNameGroup.style.display = roleSelect.value === 'NGO' ? 'block' : 'none';
    });
    
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Clear previous errors
        clearError('nameError');
        clearError('emailError');
        clearError('phoneError');
        clearError('roleError');
        clearError('orgNameError');
        clearError('passwordError');
        clearError('confirmPasswordError');
        clearError('termsError');
        
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        const role = document.getElementById('role').value;
        const organization_name = document.getElementById('organization_name').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const terms = document.getElementById('terms').checked;
        
        // Validate inputs
        if (!name) {
            showError('nameError', 'Please enter your name');
            return;
        }
        
        if (!validateEmail(email)) {
            showError('emailError', 'Please enter a valid email address');
            return;
        }
        
        if (!validatePhone(phone)) {
            showError('phoneError', 'Please enter a valid phone number');
            return;
        }
        
        if (!role) {
            showError('roleError', 'Please select a role');
            return;
        }
        
        if (role === 'NGO' && !organization_name) {
            showError('orgNameError', 'Please enter organization name');
            return;
        }
        
        if (!validatePassword(password)) {
            showError('passwordError', 'Password must be at least 8 characters long');
            return;
        }
        
        if (password !== confirmPassword) {
            showError('confirmPasswordError', 'Passwords do not match');
            return;
        }
        
        if (!terms) {
            showError('termsError', 'You must agree to the terms and conditions');
            return;
        }
        
        const submitButton = registerForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        
        try {
            // Show loading state
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';
            submitButton.disabled = true;
            
            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    email,
                    phone,
                    role,
                    organization_name: role === 'NGO' ? organization_name : null,
                    password
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Show success message and redirect to login
                alert('Registration successful! Please check your email for verification.');
                window.location.href = 'receiver-login.html';
            } else {
                // Show specific error message from server
                const errorMessage = data.message || 'Registration failed. Please try again.';
                showError('emailError', errorMessage);
                
                // Log the error for debugging
                console.error('Registration failed:', {
                    status: response.status,
                    message: errorMessage,
                    data: data
                });
            }
        } catch (error) {
            // Log the full error for debugging
            console.error('Registration error:', error);
            
            // Show user-friendly error message
            let errorMessage = 'An error occurred during registration. ';
            if (error.message.includes('Failed to fetch')) {
                errorMessage += 'Unable to connect to the server. Please check if the server is running.';
            } else if (error.message.includes('NetworkError')) {
                errorMessage += 'Network error. Please check your internet connection.';
            } else {
                errorMessage += 'Please try again later.';
            }
            
            showError('emailError', errorMessage);
        } finally {
            // Reset button state
            submitButton.innerHTML = originalButtonText;
            submitButton.disabled = false;
        }
    });
}

// Check authentication status
const checkAuth = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return false;
    
    try {
        const response = await fetch(`${API_BASE_URL}/verify-token`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        return response.ok;
    } catch (error) {
        return false;
    }
};

// Logout function
const logout = async () => {
    try {
        await fetch(`${API_BASE_URL}/logout`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        localStorage.removeItem('authToken');
        window.location.href = 'receiver-login.html';
    }
};

// Add logout event listener if logout button exists
const logoutBtn = document.querySelector('.logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
}

document.addEventListener('DOMContentLoaded', () => {
    // Smooth scroll functionality
    const authBox = document.querySelector('.auth-box');
    let isScrolling = false;
    let scrollTimeout;

    // Add smooth scroll behavior
    authBox.addEventListener('scroll', () => {
        isScrolling = true;
        clearTimeout(scrollTimeout);
        
        // Add scroll indicator
        const scrollIndicator = document.querySelector('.scroll-indicator') || createScrollIndicator();
        updateScrollIndicator(scrollIndicator);

        scrollTimeout = setTimeout(() => {
            isScrolling = false;
            scrollIndicator.style.opacity = '0';
        }, 1000);
    });

    // Create scroll indicator
    function createScrollIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'scroll-indicator';
        indicator.innerHTML = `
            <div class="scroll-indicator-content">
                <i class="fas fa-chevron-up"></i>
                <span>Scroll</span>
                <i class="fas fa-chevron-down"></i>
            </div>
        `;
        document.querySelector('.auth-container').appendChild(indicator);
        return indicator;
    }

    // Update scroll indicator position
    function updateScrollIndicator(indicator) {
        const scrollPercentage = (authBox.scrollTop / (authBox.scrollHeight - authBox.clientHeight)) * 100;
        indicator.style.opacity = '1';
        indicator.style.transform = `translateY(${scrollPercentage}%)`;
    }

    // Form validation and submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Clear previous errors
            clearErrors();

            // Get form data
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const remember = document.getElementById('remember').checked;

            // Validate email
            if (!validateEmail(email)) {
                showError('emailError', 'Please enter a valid email address');
                return;
            }

            // Validate password
            if (password.length < 6) {
                showError('passwordError', 'Password must be at least 6 characters long');
                return;
            }

            try {
                // Show loading state
                const submitButton = loginForm.querySelector('button[type="submit"]');
                const originalText = submitButton.innerHTML;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
                submitButton.disabled = true;

                // Send login request
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password, remember }),
                    credentials: 'include'
                });

                const data = await response.json();

                if (response.ok) {
                    // Redirect to dashboard
                    window.location.href = 'receiver_dashboad.html';
                } else {
                    showError('emailError', data.message || 'Login failed');
                }
            } catch (error) {
                showError('emailError', 'An error occurred. Please try again.');
            } finally {
                // Reset button state
                submitButton.innerHTML = originalText;
                submitButton.disabled = false;
            }
        });
    }

    // Helper functions
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    function showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        // Scroll to error
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function clearErrors() {
        document.querySelectorAll('.error-message').forEach(error => {
            error.style.display = 'none';
        });
    }

    // Add smooth scroll to links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Add keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const scrollAmount = e.key === 'ArrowUp' ? -100 : 100;
            authBox.scrollBy({
                top: scrollAmount,
                behavior: 'smooth'
            });
        }
    });
}); 