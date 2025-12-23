/**
 * script.js
 *
 * Handles the main landing page and shared UI logic for Quirofísicos Rocha:
 * - Initializes Google Maps, announcements, business hours, and clinic info.
 * - Manages navigation and button events for login, register, and guest access.
 * - Loads and displays announcements and business hours in the UI.
 * - Updates the footer with clinic and business info.
 * - Provides utility functions for formatting and displaying data.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Google Maps
  if (window.MapsManager) {
    const mapsManager = new MapsManager();
    mapsManager.initializeMap();
  }

  // Load and display announcements
  loadAnnouncements();

  // Load business hours
  loadBusinessHours();

  // Load and display clinic settings in the footer
  loadClinicSettingsFooter();

  // Remove guestBtn, loginBtn, and registerBtn if user is logged in
  const isLoggedIn = localStorage.getItem('token') || localStorage.getItem('userToken');
  if (isLoggedIn) {
    const guestBtn = document.getElementById('guestBtn');
    if (guestBtn) guestBtn.remove();
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) loginBtn.remove();
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) registerBtn.remove();
  }

  // Add event listeners for landing page buttons
  document.getElementById('registerBtn')?.addEventListener('click', () => {
    window.location.href = '/register.html';
  });
  document.getElementById('loginBtn')?.addEventListener('click', () => {
    window.location.href = '/login.html';
  });
  document.getElementById('guestBtn')?.addEventListener('click', () => {
    // Example: continue as guest, maybe redirect or show guest view
    window.location.href = '/appointment.html';
  });
  document.getElementById('bABtn')?.addEventListener('click', () => {
    window.location.href = '/appointment.html';
  });
});

/**
 * Fetches and displays clinic settings in the footer.
 */
async function loadClinicSettingsFooter() {
  try {
    const response = await fetch('/api/clinic-settings');
    console.log('Clinic settings fetch response:', response);
    if (!response.ok) throw new Error('No se pudo cargar la información de la clínica');
    const settings = await response.json();
    console.log('Clinic settings JSON:', settings);
  const name = settings.clinicName || 'Quirofísicos Rocha';
  const address = settings.clinicAddress || 'Plaza Johnson, Av. Josefa Ortiz de Domínguez 1993, Independencia, 22055 Tijuana, B.C., México';
  const phone = settings.clinicPhone || '664-123-4567';
  const email = settings.clinicEmail || 'info@quirofisicosrocha.com';
  const description = settings.clinicDescription || '';

  // Update footer fields
  const nameEl = document.querySelector('footer h5.text-white');
  if (nameEl) nameEl.textContent = name;
  const addressIcon = document.querySelector('footer .fa-map-marker-alt');
  const addressEl = addressIcon ? addressIcon.parentElement : null;
  if (addressEl) addressEl.innerHTML = `<i class="fas fa-map-marker-alt me-2"></i>${address}`;

  const phoneIcon = document.querySelector('footer .fa-phone');
  const phoneEl = phoneIcon ? phoneIcon.parentElement : null;
  if (phoneEl) phoneEl.innerHTML = `<i class="fas fa-phone me-2"></i>${phone}`;

  const emailIcon = document.querySelector('footer .fa-envelope');
  const emailEl = emailIcon ? emailIcon.parentElement : null;
  if (emailEl) emailEl.innerHTML = `<i class="fas fa-envelope me-2"></i>${email}`;
  const descEl = document.getElementById('clinic-description');
  if (descEl) descEl.textContent = description;
  } catch (error) {
    console.error('Error loading clinic settings for footer:', error);
  }
}

/**
 * Loads and displays public announcements.
 */
async function loadAnnouncements() {
  try {
  const response = await fetch('/api/announcements/active');
    if (!response.ok) return; // Silently fail if no announcements

    const announcements = await response.json();
    if (announcements.length > 0) {
      displayAnnouncements(announcements);
    }
  } catch (error) {
    console.log('No announcements to display'); // Silently handle errors
  }
}

/**
 * Formats a date string (YYYY-MM-DD) into a more readable format.
 */
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00'); // Treat as local date
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Renders the announcements banner in the UI.
 */
function displayAnnouncements(announcements) {
  const container = document.getElementById('announcements-banner');
  if (!container) return;

  const announcementsHtml = announcements.map(announcement => {
    const typeClass = getAnnouncementTypeClass(announcement.announcementType);
    const icon = getAnnouncementIcon(announcement.announcementType);
    const priorityClass = announcement.priority === 'high' || announcement.priority === 'urgent' ? 'announcement-priority-high' : '';
    
    return `
      <div class="announcement-banner ${typeClass} ${priorityClass}" data-id="${announcement.id}">
        <div class="announcement-content">
          <div class="announcement-text">
            <i class="fas ${icon} announcement-icon"></i>
            <div>
              <div class="announcement-title">${announcement.title}</div>
              <div class="announcement-message">${announcement.message}</div>
              ${announcement.endDate ? `<div class="announcement-dates">Válido hasta: ${formatDate(announcement.endDate)}</div>` : ''}
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

/**
 * Returns the CSS class for an announcement type.
 */
function getAnnouncementTypeClass(type) {
  const classes = {
    'info': 'info',
    'warning': 'warning', 
    'success': 'success',
    'danger': 'danger'
  };
  return classes[type] || 'info';
}

/**
 * Returns the icon class for an announcement type.
 */
function getAnnouncementIcon(type) {
  const icons = {
    'info': 'fa-info-circle',
    'warning': 'fa-exclamation-triangle',
    'success': 'fa-check-circle',
    'danger': 'fa-exclamation-circle'
  };
  return icons[type] || 'fa-info-circle';
}

/**
 * Dismisses an announcement banner and hides the container if empty.
 */
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

/**
 * Loads and displays business hours in the info and footer sections.
 */
async function loadBusinessHours() {
  try {
  const response = await fetch('/api/business-hours', {
      headers: window.authManager ? window.authManager.getAuthHeaders() : {}
    });
    if (!response.ok) {
      throw new Error('Failed to load business hours');
    }
    const data = await response.json();
    console.log('Business hours API response:', data); // Debug log
    let businessHours = Array.isArray(data.business_hours)
      ? data.business_hours
      : Array.isArray(data.businessHours)
        ? data.businessHours
        : [];
    if (!Array.isArray(data.businessHours) && !Array.isArray(data.businessHours)) {
      console.warn('API did not return business_hours or businessHours as an array:', data);
    }
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

/**
 * Formats business hours for the info section.
 */
function formatBusinessHoursForInfo(businessHours) {
  if (!Array.isArray(businessHours)) {
    console.error('formatBusinessHoursForInfo: businessHours is not an array', businessHours);
    return '<p class="mb-0">Actualmente cerrado</p>';
  }
  const openDays = businessHours.filter(day => day.isOpen);
  
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
    const dayData = businessHours.find(h => h.dayOfWeek === day);
    
    if (dayData && dayData.isOpen) {
      const timeString = `${dayData.openTime} - ${dayData.closeTime}`;
      
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

/**
 * Formats business hours for the footer section.
 */
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
  if (!Array.isArray(businessHours)) {
    console.error('formatBusinessHoursForFooter: businessHours is not an array', businessHours);
    return '';
  }
  const lines = businessHours.map(day => {
    const dayName = dayNames[day.dayOfWeek];
    // Remove trailing ':00' if present
    const formatTime = t => t ? t.replace(/:00$/, '') : '';
    if (day.isOpen) {
      return `<p class="text-white-50 mb-1">${dayName}: ${formatTime(day.openTime)} - ${formatTime(day.closeTime)}</p>`;
    } else {
      return `<p class="text-white-50 mb-1">${dayName}: Cerrado</p>`;
    }
  });
  return lines.join('');
}

// Load business hours when page loads
loadBusinessHours();
