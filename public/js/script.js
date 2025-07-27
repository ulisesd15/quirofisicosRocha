document.addEventListener('DOMContentLoaded', () => {
  // DOM references
  const guestBtn = document.getElementById('guestBtn');
  const registerBtn = document.getElementById('registerBtn');
  const loginBtn = document.getElementById('loginBtn');
  const bABtn = document.getElementById('bABtn');
  const navItems = document.getElementById('nav-items');
  const menuToggle = document.getElementById('menu_toggle');
  const offcanvas = document.getElementById('sideNav');
  const signOutBtn = document.getElementById('logoutBtn');

  const userId = localStorage.getItem('user_id');
  const userRole = localStorage.getItem('user_role');

  // Navigation menu
  if (navItems) {
    if (userId) {
      const adminButton = userRole === 'admin' ? 
        `<li><a href="/admin/adminOptions.html" class="btn btn-warning w-100 mb-2">
          <i class="fas fa-user-shield"></i> Panel Admin
        </a></li>` : '';
      
      navItems.innerHTML = `
        <li><a href="/appointment.html" class="btn btn-outline-primary w-100 mb-2">Agendar Cita</a></li>
        ${adminButton}
        <li><a href="#" id="logoutBtn" class="btn btn-danger w-100 mb-2">Cerrar Sesión</a></li>
        <li><span class="text-muted small">Hola, ${localStorage.getItem('user_name') || 'Usuario'}</span></li>
      `;
    } else {
      navItems.innerHTML = `
        <li><a href="/login.html" class="btn btn-outline-success w-100 mb-2">Iniciar Sesión</a></li>
        <li><a href="/appointment.html?guest=true" class="btn btn-outline-primary w-100 mb-2">Agendar como Invitado</a></li>
        <li><a href="/register.html" class="btn btn-outline-secondary w-100 mb-2">Crear Cuenta</a></li>
      `;
    }

    // Re-attach logoutBtn listener after injecting it dynamically
    if (userId) {
      const logoutBtn = document.getElementById('logoutBtn');
      logoutBtn?.addEventListener('click', () => {
        localStorage.removeItem('user_id');
        alert('Sesión cerrada exitosamente.');
        window.location.href = '/index.html';
      });
    }
  }

  // UI control visibility
  if (userId) {
    guestBtn?.style?.setProperty('display', 'none');
    registerBtn?.style?.setProperty('display', 'none');
    loginBtn?.style?.setProperty('display', 'none');
    signOutBtn?.style?.setProperty('display', 'block');
    bABtn?.style?.setProperty('display', 'block');
  } else {
    guestBtn?.style?.setProperty('display', 'block');
    registerBtn?.style?.setProperty('display', 'block');
    loginBtn?.style?.setProperty('display', 'block');
    signOutBtn?.style?.setProperty('display', 'none');
    bABtn?.style?.setProperty('display', 'none');
  }

  // Button click listeners
  registerBtn?.addEventListener('click', () => {
    window.location.href = 'register.html';
  });

  loginBtn?.addEventListener('click', () => {
    window.location.href = 'login.html';
  });

  guestBtn?.addEventListener('click', () => {
    window.location.href = 'appointment.html?guest=true';
  });

  bABtn?.addEventListener('click', () => {
    window.location.href = 'appointment.html';
  });

  signOutBtn?.addEventListener('click', () => {
    localStorage.removeItem('user_id');
    window.location.href = '/index.html';
  });

  // Offcanvas toggle visibility
  if (offcanvas && menuToggle) {
    offcanvas.addEventListener('show.bs.offcanvas', () => {
      menuToggle.style.display = 'none';
    });

    offcanvas.addEventListener('hidden.bs.offcanvas', () => {
      menuToggle.style.display = 'block';
    });
  }

  // Initialize Google Maps
  if (window.MapsManager) {
    const mapsManager = new MapsManager();
    mapsManager.initializeMap();
  }

  // Load and display announcements
  loadAnnouncements();
});

// Announcements Management
async function loadAnnouncements() {
  try {
    const response = await fetch('/api/announcements/public');
    if (!response.ok) return; // Silently fail if no announcements

    const announcements = await response.json();
    if (announcements.length > 0) {
      displayAnnouncements(announcements);
    }
  } catch (error) {
    console.log('No announcements to display'); // Silently handle errors
  }
}

function displayAnnouncements(announcements) {
  const container = document.getElementById('announcements-banner');
  if (!container) return;

  const announcementsHtml = announcements.map(announcement => {
    const typeClass = getAnnouncementTypeClass(announcement.announcement_type);
    const icon = getAnnouncementIcon(announcement.announcement_type);
    const priorityClass = announcement.priority === 'high' || announcement.priority === 'urgent' ? 'announcement-priority-high' : '';
    
    return `
      <div class="announcement-banner ${typeClass} ${priorityClass}" data-id="${announcement.id}">
        <div class="announcement-content">
          <div class="announcement-text">
            <i class="fas ${icon} announcement-icon"></i>
            <div>
              <div class="announcement-title">${announcement.title}</div>
              <div class="announcement-message">${announcement.message}</div>
              ${announcement.end_date ? `<div class="announcement-dates">Válido hasta: ${formatDate(announcement.end_date)}</div>` : ''}
            </div>
          </div>
          <button class="announcement-close" onclick="dismissAnnouncement(${announcement.id})" aria-label="Cerrar anuncio">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = announcementsHtml;
  container.style.display = 'block';
}

function getAnnouncementTypeClass(type) {
  const classes = {
    'info': 'info',
    'warning': 'warning', 
    'success': 'success',
    'danger': 'danger'
  };
  return classes[type] || 'info';
}

function getAnnouncementIcon(type) {
  const icons = {
    'info': 'fa-info-circle',
    'warning': 'fa-exclamation-triangle',
    'success': 'fa-check-circle',
    'danger': 'fa-exclamation-circle'
  };
  return icons[type] || 'fa-info-circle';
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function dismissAnnouncement(id) {
  const banner = document.querySelector(`[data-id="${id}"]`);
  if (banner) {
    banner.style.transform = 'translateX(100%)';
    banner.style.opacity = '0';
    setTimeout(() => {
      banner.remove();
      
      // Hide container if no announcements left
      const container = document.getElementById('announcements-banner');
      if (container && !container.querySelector('.announcement-banner')) {
        container.style.display = 'none';
      }
    }, 300);
  }
  
  // Store dismissed announcement to avoid showing again during this session
  const dismissed = JSON.parse(localStorage.getItem('dismissedAnnouncements') || '[]');
  if (!dismissed.includes(id)) {
    dismissed.push(id);
    localStorage.setItem('dismissedAnnouncements', JSON.stringify(dismissed));
  }
}
