// DEBUG: Log if navbar disappears
setInterval(() => {
    const nav = document.getElementById('main-navigation');
    if (nav && (nav.offsetHeight === 0 || nav.offsetParent === null || window.getComputedStyle(nav).display === 'none')) {
        console.warn('DEBUG: #main-navigation is hidden or removed!');
    }
}, 1000);
// Navigation Component for all public pages
class NavigationManager {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.initializeNavigation();
    }

    // Get the current page based on the URL
    getCurrentPage() {
        const path = window.location.pathname;
        if (path === '/' || path.endsWith('/index.html')) return 'home';
        if (path.includes('login')) return 'login';
        if (path.includes('register')) return 'register';
        if (path.includes('appointment')) return 'appointment';
        return 'other';
    }

    // Create the navigation bar
    createNavbar() {
        return `
            <nav class="navbar navbar-expand-lg main-navbar shadow-sm bg-white py-3 custom-navbar">
                <div class="container">
                    <a class="navbar-brand d-flex align-items-center gap-2 fw-bold fs-3 text-primary" href="/index.html">
                        <span class="brand-logo bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2" style="width:48px;height:48px;">
                            <i class="fas fa-spine fa-lg"></i>
                        </span>
                        <span class="brand-title">Quiroprácticos Rocha</span>
                    </a>
                    <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#mainNavbar">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                    <div class="collapse navbar-collapse" id="mainNavbar">
                        <ul class="navbar-nav ms-auto align-items-center gap-3">
                            <li class="nav-item">
                                <a class="nav-link main-nav-link ${this.currentPage !== 'home' ? 'active' : ''}" href="/index.html">
                                    <i class="fas fa-home me-1"></i>Inicio
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link main-nav-link ${this.currentPage === 'appointment' ? 'active' : ''}" href="/appointment.html">
                                    <i class="fas fa-calendar-plus me-1"></i>Agendar Cita
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link main-nav-link" href="#ubicacion-section" data-scroll="ubicacion-section">
                                    <i class="fas fa-map-marker-alt me-1"></i>Ubicación
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link main-nav-link" href="#contacto-section" data-scroll="contacto-section">
                                    <i class="fas fa-phone me-1"></i>Contacto
                                </a>
                            </li>
                            <li class="nav-item" id="authNavItem">
                                ${this.getAuthNavItem()}
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>
        `;
    }

    getAuthNavItem() {
        if (window.authManager && typeof window.authManager.isLoggedIn === 'function' && window.authManager.isLoggedIn()) {
            const user = window.authManager.getCurrentUser();
            const isAdmin = window.authManager.isAdmin();
            return `
                <div class="dropdown">
                    <a class="nav-link main-nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                        <i class="fas fa-user me-1"></i>${user?.full_name || 'Usuario'}
                    </a>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li><a class="dropdown-item" href="/mis-citas.html">
                            <i class="fas fa-calendar-check me-2"></i>Mis Citas
                        </a></li>
                        <li><a class="dropdown-item" href="/user-settings.html">
                            <i class="fas fa-user-cog me-2"></i>Configuración
                        </a></li>
                        ${isAdmin ? `<li><hr class="dropdown-divider"></li><li><a class="dropdown-item" href="/admin/adminOptions.html"><i class="fas fa-cog me-2"></i>Panel Admin</a></li>` : ''}
                        <li><a class="dropdown-item" href="#" onclick="window.authManager.logout(); window.location.reload();">
                            <i class="fas fa-sign-out-alt me-2"></i>Cerrar Sesión
                        </a></li>
                    </ul>
                </div>
            `;
        } else {
            return `
                <a class="nav-link main-nav-link ${this.currentPage === 'login' ? 'active' : ''}" href="/login.html">
                    <i class="fas fa-sign-in-alt me-1"></i>Iniciar Sesión
                </a>
            `;
        }
    }

    getMobileAuthItems() {
        if (window.authManager && typeof window.authManager.isLoggedIn === 'function' && window.authManager.isLoggedIn()) {
            const user = window.authManager.getCurrentUser();
            const isAdmin = window.authManager.isAdmin();
            
            return `
                <div class="sidebar-user-info d-flex align-items-center gap-2 mb-3 px-2 py-2 rounded bg-light">
                    <span class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style="width:32px;height:32px;">
                        <i class="fas fa-user"></i>
                    </span>
                    <span class="fw-semibold">${user?.full_name || 'Usuario'}</span>
                </div>
                <a href="/mis-citas.html" class="sidebar-nav-item">
                    <i class="fas fa-calendar-check me-2"></i>Mis Citas
                </a>
                <a href="/user-settings.html" class="sidebar-nav-item">
                    <i class="fas fa-user-cog me-2"></i>Configuración
                </a>
                ${isAdmin ? `
                    <a href="/admin/adminOptions.html" class="sidebar-nav-item">
                        <i class="fas fa-cog me-2"></i>Panel Admin
                    </a>
                ` : ''}
                <hr class="my-2">
                <a href="#" class="sidebar-nav-item text-danger" onclick="window.authManager.logout(); window.location.reload();">
                    <i class="fas fa-sign-out-alt me-2"></i>Cerrar Sesión
                </a>
            `;
        } else {
            return `
                <a href="/login.html" class="sidebar-nav-item ${this.currentPage === 'login' ? 'active' : ''}">
                    <i class="fas fa-sign-in-alt"></i>Iniciar Sesión
                </a>
                <a href="/register.html" class="sidebar-nav-item ${this.currentPage === 'register' ? 'active' : ''}">
                    <i class="fas fa-user-plus"></i>Registrarse
                </a>
            `;
        }
    }

    scrollToSection(sectionId) {
        // If we're not on the home page, navigate there first
        if (this.currentPage !== 'home') {
            window.location.href = `/index.html#${sectionId}`;
            return;
        }
        
        // If we're on the home page, scroll to the section
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    handleScrollLinks() {
        // Handle scroll links in navigation
        document.addEventListener('click', (e) => {
            const scrollLink = e.target.closest('[data-scroll]');
            if (scrollLink) {
                e.preventDefault();
                const sectionId = scrollLink.getAttribute('data-scroll');
                
                // Close mobile sidebar if open
                this.closeMobileSidebar();
                
                this.scrollToSection(sectionId);
            }
        });

        // Handle hash on page load
        if (window.location.hash) {
            setTimeout(() => {
                const sectionId = window.location.hash.substring(1);
                this.scrollToSection(sectionId);
            }, 100);
        }
    }

    toggleMobileSidebar() {
        const sidebar = document.getElementById('mobileSidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        sidebar.classList.toggle('show');
        overlay.classList.toggle('show');
    }

    closeMobileSidebar() {
        const sidebar = document.getElementById('mobileSidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        sidebar.classList.remove('show');
        overlay.classList.remove('show');
    }

    initializeNavigation() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupNavigationVisibility());
        } else {
            this.setupNavigationVisibility();
        }
    }

    setupNavigationVisibility() {
        this.renderNavigation();
        const navContainer = document.getElementById('main-navigation');
        if (navContainer) {
            navContainer.classList.add('visible');
            navContainer.classList.remove('pop-in');
        }
    }

    renderNavigation() {
        // Render the main navbar as before
        const navContainer = document.getElementById('main-navigation');
        if (navContainer) {
            navContainer.innerHTML = this.createNavbar();
        }

        // Add sidebar markup if not present
        if (!document.getElementById('sidebarOverlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'sidebarOverlay';
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
        }
        if (!document.getElementById('mobileSidebar')) {
            const sidebar = document.createElement('nav');
            sidebar.id = 'mobileSidebar';
            sidebar.className = 'mobile-sidebar';
            sidebar.innerHTML = `
                <div class="sidebar-header">
                    <button id="closeSidebarBtn" class="btn btn-link text-dark p-0 ms-auto" aria-label="Cerrar menú">
                        <i class="fas fa-times fa-lg"></i>
                    </button>
                </div>
                <ul class="sidebar-nav list-unstyled mt-4">
                    <li><a href="/index.html"><i class="fas fa-home me-2"></i>Inicio</a></li>
                    <li><a href="/appointment.html"><i class="fas fa-calendar-plus me-2"></i>Agendar Cita</a></li>
                    <li><a href="#ubicacion-section"><i class="fas fa-map-marker-alt me-2"></i>Ubicación</a></li>
                    <li><a href="#contacto-section"><i class="fas fa-phone me-2"></i>Contacto</a></li>
                </ul>
            `;
            document.body.appendChild(sidebar);
        }

        // Add hamburger button to body if not present (always accessible)
        if (!document.getElementById('sidebarHamburger')) {
            const hamburger = document.createElement('button');
            hamburger.id = 'sidebarHamburger';
            hamburger.setAttribute('aria-label', 'Abrir menú');
            hamburger.innerHTML = `
                <span class="hamburger-lines">
                    <span class="hamburger-line"></span>
                    <span class="hamburger-line"></span>
                    <span class="hamburger-line"></span>
                </span>
            `;
            document.body.appendChild(hamburger);
        }

        // Hamburger click opens sidebar
        const hamburgerBtn = document.getElementById('sidebarHamburger');
        hamburgerBtn.onclick = () => {
            document.getElementById('mobileSidebar').classList.add('show');
            document.getElementById('sidebarOverlay').classList.add('show');
            hamburgerBtn.classList.add('hide-when-open');
        };
        // Overlay click closes sidebar
        document.getElementById('sidebarOverlay').onclick = closeSidebar;
        document.getElementById('closeSidebarBtn').onclick = closeSidebar;
        function closeSidebar() {
            document.getElementById('mobileSidebar').classList.remove('show');
            document.getElementById('sidebarOverlay').classList.remove('show');
            hamburgerBtn.classList.remove('hide-when-open');
        }

        // Initialize scroll link handlers
        this.handleScrollLinks();
        // Update auth nav item periodically
        this.authNavInterval = setInterval(() => this.updateAuthNavigation(), 5000);
    }

    updateAuthNavigation() {
        const authNavItem = document.getElementById('authNavItem');
        if (authNavItem) {
            authNavItem.innerHTML = this.getAuthNavItem();
        }
    }
}

// Initialize navigation when the script loads
window.navigationManager = new NavigationManager();
