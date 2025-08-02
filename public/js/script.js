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
          <i class="fas fa-user-shield me-2"></i> Panel Admin
        </a></li>` : '';
      
      navItems.innerHTML = `
        <li><a href="/appointment.html" class="btn btn-primary w-100 mb-2">
          <i class="fas fa-calendar-plus me-2"></i> Agendar Cita
        </a></li>
        <li><a href="/mis-citas.html" class="btn btn-outline-info w-100 mb-2">
          <i class="fas fa-calendar-check me-2"></i> Mis Citas
        </a></li>
        <li><a href="/user-settings.html" class="btn btn-outline-secondary w-100 mb-2">
          <i class="fas fa-cog me-2"></i> Configuración
        </a></li>
        ${adminButton}
        <li><hr class="dropdown-divider"></li>
        <li><a href="#" id="logoutBtn" class="btn btn-danger w-100 mb-2">
          <i class="fas fa-sign-out-alt me-2"></i> Cerrar Sesión
        </a></li>
        <li><span class="text-muted small mt-2 d-block text-center">
          <i class="fas fa-user me-1"></i> Hola, ${localStorage.getItem('user_name') || 'Usuario'}
        </span></li>
      `;
    } else {
      navItems.innerHTML = `
        <li><a href="/login.html" class="btn btn-success w-100 mb-2">
          <i class="fas fa-sign-in-alt me-2"></i>Iniciar Sesión
        </a></li>
        <li><a href="/appointment.html?guest=true" class="btn btn-primary w-100 mb-2">
          <i class="fas fa-user me-2"></i>Agendar como Invitado
        </a></li>
        <li><a href="/register.html" class="btn btn-outline-secondary w-100 mb-2">
          <i class="fas fa-user-plus me-2"></i>Crear Cuenta
        </a></li>
      `;
    }

    // Re-attach logoutBtn listener after injecting it dynamically
    if (userId) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
          logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('user_id');
            localStorage.removeItem('user_role');
            localStorage.removeItem('user_name');
            alert('Sesión cerrada exitosamente.');
            window.location.href = '/index.html';
          });
        }
      }, 100);
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

// Load and display business hours
async function loadBusinessHours() {
  try {
    const response = await fetch('/api/business-hours');
    if (!response.ok) {
      throw new Error('Failed to load business hours');
    }
    
    const data = await response.json();
    const businessHours = data.business_hours;
    
    // Update info section
    const infoSection = document.getElementById('business-hours-info');
    if (infoSection) {
      infoSection.innerHTML = formatBusinessHoursForInfo(businessHours);
    }
    
    // Update footer section
    const footerSection = document.getElementById('business-hours-footer');
    if (footerSection) {
      footerSection.innerHTML = formatBusinessHoursForFooter(businessHours);
    }
    
  } catch (error) {
    console.error('Error loading business hours:', error);
    
    // Fallback to default hours if API fails
    const fallbackInfo = '<p class="mb-0">Lunes a Viernes<br>9:00 AM - 6:00 PM</p>';
    const fallbackFooter = `
      <p class="text-white-50 mb-1">Lunes - Viernes: 9:00 AM - 6:00 PM</p>
      <p class="text-white-50 mb-1">Sábados: 9:00 AM - 2:00 PM</p>
      <p class="text-white-50">Domingos: Cerrado</p>
    `;
    
    const infoSection = document.getElementById('business-hours-info');
    if (infoSection) infoSection.innerHTML = fallbackInfo;
    
    const footerSection = document.getElementById('business-hours-footer');
    if (footerSection) footerSection.innerHTML = fallbackFooter;
  }
}

function formatBusinessHoursForInfo(businessHours) {
  const openDays = businessHours.filter(day => day.is_open);
  
  if (openDays.length === 0) {
    return '<p class="mb-0">Actualmente cerrado</p>';
  }
  
  // Group consecutive days with same hours
  const groups = [];
  let currentGroup = null;
  
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayNames = {
    'Monday': 'Lunes',
    'Tuesday': 'Martes', 
    'Wednesday': 'Miércoles',
    'Thursday': 'Jueves',
    'Friday': 'Viernes',
    'Saturday': 'Sábado',
    'Sunday': 'Domingo'
  };
  
  dayOrder.forEach(day => {
    const dayData = businessHours.find(h => h.day_of_week === day);
    
    if (dayData && dayData.is_open) {
      const timeString = `${dayData.open_time} - ${dayData.close_time}`;
      
      if (currentGroup && currentGroup.time === timeString) {
        currentGroup.days.push(dayNames[day]);
      } else {
        if (currentGroup) groups.push(currentGroup);
        currentGroup = {
          days: [dayNames[day]],
          time: timeString
        };
      }
    } else {
      if (currentGroup) {
        groups.push(currentGroup);
        currentGroup = null;
      }
    }
  });
  
  if (currentGroup) groups.push(currentGroup);
  
  const lines = groups.map(group => {
    const daysText = group.days.length === 1 ? 
      group.days[0] : 
      group.days.length === 2 ? 
        group.days.join(' y ') :
        `${group.days.slice(0, -1).join(', ')} y ${group.days[group.days.length - 1]}`;
    
    return `${daysText}<br>${group.time}`;
  });
  
  return `<p class="mb-0">${lines.join('<br><br>')}</p>`;
}

function formatBusinessHoursForFooter(businessHours) {
  const dayNames = {
    'Monday': 'Lunes',
    'Tuesday': 'Martes', 
    'Wednesday': 'Miércoles',
    'Thursday': 'Jueves',
    'Friday': 'Viernes',
    'Saturday': 'Sábado',
    'Sunday': 'Domingo'
  };
  
  const lines = businessHours.map(day => {
    const dayName = dayNames[day.day_of_week];
    
    if (day.is_open) {
      return `<p class="text-white-50 mb-1">${dayName}: ${day.open_time} - ${day.close_time}</p>`;
    } else {
      return `<p class="text-white-50 mb-1">${dayName}: Cerrado</p>`;
    }
  });
  
  return lines.join('');
}

// Load business hours when page loads
loadBusinessHours();
