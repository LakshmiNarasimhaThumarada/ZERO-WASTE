document.addEventListener('DOMContentLoaded', function() {
    const startButton = document.querySelector('.start-button');    
    if (startButton) {
        startButton.addEventListener('click', function() {
            window.location.href = 'main.html';
        });
    }

    // Logo click handler
    const logo = document.querySelector('.nav-logo');
    if (logo) {
        logo.addEventListener('click', function(e) {
            e.preventDefault(); // Prevent default anchor behavior
            window.location.reload(); // Refresh the page
        });
    }

    // Initialize stats counter animation
    const stats = document.querySelectorAll('.stat-number');
    if (stats) {
        stats.forEach(stat => {
            const target = parseInt(stat.textContent);
            let count = 0;
            const duration = 2000; // 2 seconds
            const increment = target / (duration / 16); // 60 FPS

            const updateCount = () => {
                if (count < target) {
                    count += increment;
                    stat.textContent = Math.round(count).toLocaleString();
                    requestAnimationFrame(updateCount);
                } else {
                    stat.textContent = target.toLocaleString();
                }
            };

            updateCount();
        });
    }

    // Add smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Enhanced scroll reveal animation
    function handleScrollAnimation() {
        const wasteSection = document.querySelector('.waste-info-section');
        const stats = wasteSection?.querySelectorAll('.waste-stat');
        
        if (wasteSection) {
            const triggerBottom = window.innerHeight * 0.8;
            const sectionTop = wasteSection.getBoundingClientRect().top;
            
            if (sectionTop < triggerBottom) {
                wasteSection.classList.add('reveal-section');
                
                // Add animation delays to stats
                stats?.forEach((stat, index) => {
                    stat.style.setProperty('--stat-index', index);
                });
            }
        }
    }

    // Throttle scroll event for better performance
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        if (!scrollTimeout) {
            scrollTimeout = setTimeout(() => {
                handleScrollAnimation();
                scrollTimeout = null;
            }, 50);
        }
    });

    // Initial check
    handleScrollAnimation();

    // Infinite scroll functionality
    const container = document.getElementById('infinite-scroll-container');
    const loadingSpinner = document.getElementById('loading-spinner');
    let page = 1;
    let isLoading = false;

    // Sample data for food waste facts

    // Create a single item
    function createScrollItem(index) {
        const delay = (index % 6) * 0.1;
        const fact = facts[index % facts.length];
        const preventablePercent = Math.floor(Math.random() * 90 + 10);
        const wastedTons = Math.floor(Math.random() * 100 + 50);
    
    }

    // Load more content
    function loadMoreContent() {

        // Simulate API call with setTimeout
        setTimeout(() => {
            const fragment = document.createDocumentFragment();
            const itemsPerPage = 6;
            const startIndex = (page - 1) * itemsPerPage;

            for (let i = 0; i < itemsPerPage; i++) {
                const itemHtml = createScrollItem(startIndex + i);
                const temp = document.createElement('div');
                temp.innerHTML = itemHtml;
                fragment.appendChild(temp.firstElementChild);
            }

            container.appendChild(fragment);
            page++;
            isLoading = false;
            loadingSpinner.classList.remove('visible');
        }, 800); // Simulate network delay
    }

    // Set up Intersection Observer
    const options = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !isLoading) {
                loadMoreContent();
            }
        });
    }, options);

    // Observe the loading spinner
    observer.observe(loadingSpinner);

    // Load initial content
    loadMoreContent();

    // Scroll to top functionality
    const scrollTopBtn = document.getElementById('scroll-top-btn');
    let lastScrollTop = 0;

    function handleScroll() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;

        // Show/hide scroll button based on scroll position
        if (scrollTop > windowHeight / 2) {
            scrollTopBtn.classList.add('visible');
        } else {
            scrollTopBtn.classList.remove('visible');
        }

        // Handle scroll direction
        if (scrollTop > lastScrollTop) {
            // Scrolling down
            scrollTopBtn.style.transform = 'translateY(20px)';
        } else {
            // Scrolling up
            scrollTopBtn.style.transform = 'translateY(0)';
        }

        lastScrollTop = scrollTop;

        // Check if reached bottom for infinite scroll
        if (scrollTop + windowHeight >= documentHeight - 100) {
            loadMoreContent();
        }
    }

    // Throttle scroll event
    window.addEventListener('scroll', () => {
        if (!scrollTimeout) {
            scrollTimeout = setTimeout(() => {
                handleScroll();
                scrollTimeout = null;
            }, 50);
        }
    });

    // Scroll to top when button is clicked
    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // Initial check for scroll position
    handleScroll();
}); 