// Navigation Component for all public pages
class NavigationManager {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.initializeNavigation();
    }

    getCurrentPage() {
        const path = window.location.pathname;
        if (path === '/' || path === '/index.html') return 'home';
        if (path.includes('login')) return 'login';
        if (path.includes('register')) return 'register';
        if (path.includes('appointment')) return 'appointment';
        return 'other';
    }

    createNavbar() {
        return `
            <nav class="navbar navbar-expand-lg main-navbar">
                <div class="container">
                    <a class="navbar-brand" href="/index.html">
                        <div class="brand-logo">
                            <i class="fas fa-spine"></i>
                        </div>
                        Quiroprácticos Rocha
                    </a>
                    
                    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNavbar">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                    
                    <div class="collapse navbar-collapse" id="mainNavbar">
                        <ul class="navbar-nav ms-auto">
                            <li class="nav-item">
                                <a class="nav-link main-nav-link ${this.currentPage === 'home' ? 'active' : ''}" href="/index.html">
                                    <i class="fas fa-home me-1"></i>Inicio
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link main-nav-link ${this.currentPage === 'appointment' ? 'active' : ''}" href="/appointment.html">
                                    <i class="fas fa-calendar-plus me-1"></i>Agendar Cita
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link main-nav-link" href="#services" onclick="this.scrollToSection('services')">
                                    <i class="fas fa-hand-holding-medical me-1"></i>Servicios
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link main-nav-link" href="#contact" onclick="this.scrollToSection('contact')">
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

            <!-- Mobile Sidebar Overlay -->
            <div class="mobile-sidebar-overlay" id="sidebarOverlay" onclick="this.closeMobileSidebar()"></div>
            
            <!-- Mobile Sidebar -->
            <div class="mobile-sidebar" id="mobileSidebar">
                <div class="sidebar-header">
                    <i class="fas fa-spine me-2"></i>Navegación
                </div>
                <div class="sidebar-nav">
                    <a href="/index.html" class="sidebar-nav-item ${this.currentPage === 'home' ? 'active' : ''}">
                        <i class="fas fa-home"></i>Página Principal
                    </a>
                    <a href="/appointment.html" class="sidebar-nav-item ${this.currentPage === 'appointment' ? 'active' : ''}">
                        <i class="fas fa-calendar-plus"></i>Agendar Cita
                    </a>
                    <a href="/index.html#services" class="sidebar-nav-item">
                        <i class="fas fa-hand-holding-medical"></i>Nuestros Servicios
                    </a>
                    <a href="/index.html#about" class="sidebar-nav-item">
                        <i class="fas fa-info-circle"></i>Acerca de Nosotros
                    </a>
                    <a href="/index.html#contact" class="sidebar-nav-item">
                        <i class="fas fa-phone"></i>Contacto
                    </a>
                    <div class="sidebar-nav" style="border-top: 1px solid #e9ecef; margin-top: 1rem; padding-top: 1rem;">
                        ${this.getMobileAuthItems()}
                    </div>
                </div>
            </div>
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
                        ${isAdmin ? `
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item" href="/admin/adminOptions.html">
                                <i class="fas fa-cog me-2"></i>Panel Admin
                            </a></li>
                        ` : ''}
                        <li><hr class="dropdown-divider"></li>
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
                <a href="/mis-citas.html" class="sidebar-nav-item">
                    <i class="fas fa-calendar-check"></i>Mis Citas
                </a>
                ${isAdmin ? `
                    <a href="/admin/adminOptions.html" class="sidebar-nav-item">
                        <i class="fas fa-cog"></i>Panel Admin
                    </a>
                ` : ''}
                <a href="#" class="sidebar-nav-item" onclick="window.authManager.logout(); window.location.reload();">
                    <i class="fas fa-sign-out-alt"></i>Cerrar Sesión
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
            element.scrollIntoView({ behavior: 'smooth' });
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
            document.addEventListener('DOMContentLoaded', () => this.renderNavigation());
        } else {
            this.renderNavigation();
        }
    }

    init() {
        this.renderNavigation();
    }

    renderNavigation() {
        // Create navbar container if it doesn't exist
        let navContainer = document.getElementById('main-navigation');
        if (!navContainer) {
            navContainer = document.createElement('div');
            navContainer.id = 'main-navigation';
            document.body.insertBefore(navContainer, document.body.firstChild);
        }
        
        navContainer.innerHTML = this.createNavbar();
        
        // Add mobile sidebar toggle functionality
        const toggler = document.querySelector('.navbar-toggler');
        if (toggler) {
            toggler.addEventListener('click', () => this.toggleMobileSidebar());
        }
        
        // Update auth nav item periodically
        setInterval(() => this.updateAuthNavigation(), 5000);
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
