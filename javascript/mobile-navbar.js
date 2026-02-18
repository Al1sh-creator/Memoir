// Mobile Navbar Functionality - Memoir App
class MobileNavbar {
    constructor() {
        this.currentPage = this.detectCurrentPage();
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setActiveNav();
            this.updateSessionBadge();
            this.handleNavigation();
            
            // Listen for page changes
            window.addEventListener('beforeunload', () => {
                this.setActiveNav();
            });
        });

        // Update session count periodically
        setInterval(() => {
            this.updateSessionBadge();
        }, 5000);
    }

    /**
     * Detect current page from URL or page title
     */
    detectCurrentPage() {
        const path = window.location.pathname.toLowerCase();
        
        if (path.includes('pg1.html') || path.includes('dashboard')) return 'dashboard';
        if (path.includes('timer.html')) return 'timer';
        if (path.includes('sessions.html')) return 'sessions';
        if (path.includes('calendar.html')) return 'calendar';
        if (path.includes('subjects.html')) return 'subjects';
        if (path.includes('badges')) return 'badges';
        if (path.includes('analytics.html')) return 'analytics';
        if (path.includes('settings.html')) return 'settings';
        if (path.includes('shared.html')) return 'shared';
        
        return null;
    }

    /**
     * Set active navigation based on current page
     */
    setActiveNav() {
        const navLinks = document.querySelectorAll('.mobile-navbar a');
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            
            const href = link.getAttribute('href')?.toLowerCase();
            const currentPage = this.detectCurrentPage();
            
            if (href && currentPage) {
                if (
                    (currentPage === 'dashboard' && (href.includes('pg1') || href.includes('dashboard'))) ||
                    (currentPage === 'timer' && href.includes('timer')) ||
                    (currentPage === 'sessions' && href.includes('sessions')) ||
                    (currentPage === 'calendar' && href.includes('calendar')) ||
                    (currentPage === 'subjects' && href.includes('subjects')) ||
                    (currentPage === 'badges' && href.includes('badges')) ||
                    (currentPage === 'analytics' && href.includes('analytics')) ||
                    (currentPage === 'settings' && href.includes('settings')) ||
                    (currentPage === 'shared' && href.includes('shared'))
                ) {
                    link.classList.add('active');
                }
            }
        });
    }

    /**
     * Update session count badge
     */
    updateSessionBadge() {
        const sessions = JSON.parse(localStorage.getItem('sessions') || '[]');
        const sessionCount = sessions.length;
        
        const badges = document.querySelectorAll('[data-sessions-badge]');
        badges.forEach(badge => {
            if (sessionCount > 0) {
                badge.textContent = sessionCount;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        });
    }

    /**
     * Handle navigation with smooth transitions
     */
    handleNavigation() {
        const navLinks = document.querySelectorAll('.mobile-navbar a');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                
                // Allow normal link behavior
                if (href && !href.startsWith('#')) {
                    // Add transition effect
                    document.body.style.opacity = '1';
                    document.body.style.transition = 'opacity 0.3s ease-out';
                    
                    setTimeout(() => {
                        window.location.href = href;
                    }, 100);
                }
            });
        });
    }

    /**
     * Highlight current active nav item
     */
    highlightNav(pageName) {
        const navLinks = document.querySelectorAll('.mobile-navbar a');
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            
            if (link.getAttribute('href')?.toLowerCase().includes(pageName.toLowerCase())) {
                link.classList.add('active');
            }
        });
    }

    /**
     * Get current active nav item
     */
    getActiveNav() {
        return document.querySelector('.mobile-navbar a.active');
    }

    /**
     * Check if navbar should be visible (not on auth/landing pages)
     */
    shouldShowNavbar() {
        const body = document.body;
        
        // Hide on auth and landing pages
        if (body.classList.contains('auth-body') || body.classList.contains('landing-body')) {
            return false;
        }
        
        return true;
    }
}

// Initialize Mobile Navbar
const mobileNavbar = new MobileNavbar();

// Auto-setup on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        mobileNavbar.setActiveNav();
    });
} else {
    mobileNavbar.setActiveNav();
}

// Listen for orientation changes
window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        mobileNavbar.setActiveNav();
    }, 100);
});

// Listen for visibility changes (user returns to app)
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        mobileNavbar.updateSessionBadge();
        mobileNavbar.setActiveNav();
    }
});
