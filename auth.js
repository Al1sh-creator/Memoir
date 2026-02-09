// Authentication System for Athenify
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        // Load current user from localStorage
        const userData = localStorage.getItem('memoir_current_user');
        if (userData) {
            this.currentUser = JSON.parse(userData);
        }
    }

    // Register a new user
    register(userData) {
        const users = this.getAllUsers();

        // Check if user already exists
        if (users.find(user => user.email === userData.email)) {
            throw new Error('User with this email already exists');
        }

        const newUser = {
            id: Date.now().toString(),
            name: userData.name,
            email: userData.email,
            password: userData.password, // In a real app, this would be hashed
            createdAt: new Date().toISOString(),
            settings: {
                theme: 'light',
                accent: '#0d6efd',
                compact: false,
                focusDuration: '25',
                displayName: userData.name
            },
            stats: {
                totalSessions: 0,
                totalTime: 0,
                currentStreak: 0,
                badges: []
            }
        };

        users.push(newUser);
        localStorage.setItem('memoir_users', JSON.stringify(users));

        // Auto login after registration
        this.login(userData.email, userData.password);
        return newUser;
    }

    // Login user
    login(email, password) {
        const users = this.getAllUsers();
        const user = users.find(u => u.email === email && u.password === password);

        if (!user) {
            throw new Error('Invalid email or password');
        }

        this.currentUser = user;
        localStorage.setItem('memoir_current_user', JSON.stringify(user));

        // Apply user settings
        this.applyUserSettings();
        return user;
    }

    // Logout user
    logout() {
        this.currentUser = null;
        localStorage.removeItem('memoir_current_user');
        // Redirect to login page
        window.location.href = 'login.html';
    }

    // Check if user is authenticated
    isAuthenticated() {
        return this.currentUser !== null;
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Update user data
    updateUser(updates) {
        if (!this.currentUser) return;

        Object.assign(this.currentUser, updates);
        localStorage.setItem('memoir_current_user', JSON.stringify(this.currentUser));

        // Update in users array
        const users = this.getAllUsers();
        const userIndex = users.findIndex(u => u.id === this.currentUser.id);
        if (userIndex !== -1) {
            users[userIndex] = this.currentUser;
            localStorage.setItem('memoir_users', JSON.stringify(users));
        }
    }

    // Apply user settings to the page
    applyUserSettings() {
        if (!this.currentUser || !this.currentUser.settings) return;

        const settings = this.currentUser.settings;

        // Apply theme
        if (settings.theme) {
            localStorage.setItem('memoir_theme', settings.theme);
            applyTheme(settings.theme);
        }

        // Apply accent
        if (settings.accent) {
            localStorage.setItem('memoir_accent', settings.accent);
            applyAccent(settings.accent);
        }

        // Apply compact mode
        if (settings.compact !== undefined) {
            localStorage.setItem('memoir_compact', settings.compact);
            document.body.classList.toggle('compact-mode', settings.compact);
        }

        // Apply display name
        if (settings.displayName) {
            localStorage.setItem('memoir_display_name', settings.displayName);
        }

        // Apply focus duration
        if (settings.focusDuration) {
            localStorage.setItem('memoir_focus_duration', settings.focusDuration);
        }
    }

    // Get all users (for admin purposes)
    getAllUsers() {
        return JSON.parse(localStorage.getItem('memoir_users') || '[]');
    }



    // Update user stats
    updateStats(stats) {
        if (!this.currentUser) return;

        Object.assign(this.currentUser.stats, stats);
        this.updateUser({ stats: this.currentUser.stats });
    }

    // Check authentication and redirect if needed
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    // Redirect to main app if authenticated
    redirectIfAuthenticated() {
        if (this.isAuthenticated()) {
            window.location.href = 'pg1.html';
            return true;
        }
        return false;
    }
}

// Global auth instance
const auth = new AuthManager();