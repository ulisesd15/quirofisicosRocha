/**
 * appointment.js
 *
 * Handles the appointment booking calendar page
 * - Instantiates a Calendar object and renders the weekly calendar on page load
 * - Provides UI logic to toggle between weekly and monthly calendar views
 * - Handles guest vs. authenticated user booking flows
 * - Submits appointment data to backend API
 * - Delegates all calendar rendering and slot-fetching logic to the Calendar class
 */

import { Calendar } from './calendar.js';

// Create a Calendar instance
const calendar = new Calendar();

// ============================================
// INITIALIZATION
// ============================================

/**
 * Sets up the page after DOM is loaded:
 * - Checks authentication status and shows/hides guest fields
 * - Renders the weekly calendar by default
 * - Initializes calendar view toggle and form submission
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('[appointment.js] Initializing...');
  
  // Check user login status to show/hide guest fields
  const authManager = new AuthManager();
  const guestFields = document.getElementById('guestFields');
  const guestName = document.getElementById('guestName');
  const guestPhone = document.getElementById('guestPhone');
  const guestEmail = document.getElementById('guestEmail');

  if (authManager.isLoggedIn()) {
    // User is logged in, hide guest fields and make them not required
    if (guestFields) guestFields.style.display = 'none';
    if (guestName) guestName.required = false;
    if (guestPhone) guestPhone.required = false;
    if (guestEmail) guestEmail.required = false;
    console.log('[appointment.js] User is logged in, guest fields hidden');
  } else {
    // User is a guest, show guest fields and make them required
    if (guestFields) guestFields.style.display = 'block';
    if (guestName) guestName.required = true;
    if (guestPhone) guestPhone.required = true;
    if (guestEmail) guestEmail.required = true;
    console.log('[appointment.js] User is guest, showing guest fields');
  }

  // Render the weekly calendar by default
  calendar.renderWeeklyCalendar('weeklyCalendar');
  
  // Setup calendar view toggle
  setupCalendarViewToggle();
  
  // Setup form submission handler
  setupFormSubmission();
  
  console.log('[appointment.js] Initialization complete');
});

// ============================================
// CALENDAR VIEW TOGGLE
// ============================================

/**
 * Sets up event listeners for toggling between week and month calendar views
 * Handles UI state and resets slot containers and selected date as needed
 */
function setupCalendarViewToggle() {
  const weekRadio = document.getElementById('weekView');
  const monthRadio = document.getElementById('monthView');
  const weekContainer = document.getElementById('weekViewContainer');
  const monthContainer = document.getElementById('monthViewContainer');
  
  if (!weekRadio || !monthRadio || !weekContainer || !monthContainer) {
    console.warn('[appointment.js] Calendar toggle elements not found');
    return;
  }
  
  // Switch to weekly view
  weekRadio.addEventListener('change', () => {
    if (weekRadio.checked) {
      console.log('[appointment.js] Switching to weekly view');
      weekContainer.style.display = '';
      monthContainer.style.display = 'none';
      
      // Reset containers
      const monthViewContainer = document.getElementById('monthViewContainer');
      if (monthViewContainer) monthViewContainer.innerHTML = '';
      
      const slotContainer = document.getElementById('timeCards');
      if (slotContainer) slotContainer.innerHTML = '';
      
      // Reset selected date
      calendar.selectedDate = null;
      
      // Re-render weekly calendar
      calendar.renderWeeklyCalendar('weeklyCalendar');
    }
  });
  
  // Switch to monthly view
  monthRadio.addEventListener('change', () => {
    if (monthRadio.checked) {
      console.log('[appointment.js] Switching to monthly view');
      
      // Reset to current month
      const today = new Date();
      calendar.currentMonth = today.getMonth();
      calendar.currentYear = today.getFullYear();
      
      weekContainer.style.display = 'none';
      monthContainer.style.display = '';
      
      // Reset slot container
      const slotContainer = document.getElementById('timeCards');
      if (slotContainer) slotContainer.innerHTML = '';
      
      // Reset selected date
      calendar.selectedDate = null;
      
      // Render monthly calendar after a brief delay to ensure DOM is ready
      setTimeout(() => {
        calendar.renderMonthlyCalendar('monthViewContainer');
      }, 50);
    }
  });
  
  console.log('[appointment.js] Calendar view toggle initialized');
}

// ============================================
// FORM SUBMISSION
// ============================================

/**
 * Sets up the event listener for the appointment booking form submission
 * Validates form data, constructs appointment object, and sends to backend
 */
function setupFormSubmission() {
  const bookingForm = document.getElementById('appointment-form');
  if (!bookingForm) {
    console.error('[appointment.js] Booking form not found!');
    return;
  }

  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = bookingForm.querySelector('button[type="submit"]');
    if (!submitBtn) return;
    
    // Disable button and show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Confirmando...';

    // Get form values
    const authManager = new AuthManager();
    const selectedDate = document.getElementById('selected-date')?.value;
    const selectedTime = document.getElementById('selected-time')?.value;
    const note = document.getElementById('note')?.value || '';

    // Validate date and time
    if (!selectedDate || !selectedTime) {
      showNotification('Por favor, selecciona una fecha y hora.', 'danger');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-calendar-check me-2"></i>Confirmar Cita';
      return;
    }

    console.log('[appointment.js] Submitting appointment:', {
      date: selectedDate,
      time: selectedTime,
      note: note
    });

    // Construct appointment data
    let appointmentData = {
      date: selectedDate,
      time: selectedTime,
      note: note,
    };

    // Add user info (authenticated or guest)
    if (authManager.isLoggedIn()) {
      const user = authManager.getCurrentUser();
      appointmentData.userId = user.id;
      appointmentData.fullName = user.fullName;
      appointmentData.email = user.email;
      appointmentData.phone = user.phone;
      console.log('[appointment.js] Booking for authenticated user:', user.fullName);
    } else {
      appointmentData.fullName = document.getElementById('guestName')?.value;
      appointmentData.email = document.getElementById('guestEmail')?.value;
      appointmentData.phone = document.getElementById('guestPhone')?.value;
      console.log('[appointment.js] Booking for guest:', appointmentData.fullName);
    }

    try {
      // Submit to backend
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointmentData),
      });

      const result = await response.json();

      if (response.ok) {
        console.log('[appointment.js] Appointment created successfully:', result);
        showNotification('¡Cita agendada exitosamente! Serás redirigido.', 'success');
        
        // Redirect after success
        setTimeout(() => {
          window.location.href = authManager.isLoggedIn() ? 'mis-citas.html' : 'index.html';
        }, 2500);
      } else {
        throw new Error(result.message || 'No se pudo agendar la cita.');
      }
    } catch (error) {
      console.error('[appointment.js] Error booking appointment:', error);
      showNotification(error.message, 'danger');
      
      // Re-enable button
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-calendar-check me-2"></i>Confirmar Cita';
    }
  });
  
  console.log('[appointment.js] Form submission handler initialized');
}

// ============================================
// NOTIFICATION SYSTEM
// ============================================

/**
 * Shows a notification message at the top of the page
 * @param {string} message The message to display
 * @param {string} type The type of alert ('success', 'danger', 'info', 'warning')
 */
function showNotification(message, type = 'info') {
  const container = document.getElementById('notification-container');
  if (!container) {
    console.error('[appointment.js] Notification container not found!');
    return;
  }

  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.role = 'alert';
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;

  container.innerHTML = ''; // Clear previous alerts
  container.appendChild(alertDiv);

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    const bsAlert = bootstrap.Alert.getOrCreateInstance(alertDiv);
    if (bsAlert) {
      bsAlert.close();
    }
  }, 5000);
}

console.log('[appointment.js] Module loaded');
