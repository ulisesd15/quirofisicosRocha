/**
 * appointment.js
 *
 * Handles the initialization and view toggling logic for the appointment booking calendar page.
 * - Instantiates a Calendar object and renders the weekly calendar on page load.
 * - Provides UI logic to toggle between weekly and monthly calendar views.
 * - Resets slot containers and selected date when switching views.
 * - Delegates all calendar rendering and slot-fetching logic to the Calendar class (imported).
 */

import { Calendar } from './calendar.js';

// Create a Calendar instance
const calendar = new Calendar();

// --- Initialization ---
/**
 * Sets up the page after DOM is loaded:
 * - Renders the weekly calendar by default.
 * - Initializes the calendar view toggle logic.
 */
document.addEventListener('DOMContentLoaded', () => {
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
  } else {
    // User is a guest, show guest fields and make them required
    if (guestFields) guestFields.style.display = 'block';
    if (guestName) guestName.required = true;
    if (guestPhone) guestPhone.required = true;
    if (guestEmail) guestEmail.required = true;
  }

  // Render the calendar inside the correct container
  calendar.renderWeeklyCalendar('weeklyCalendar');
  // Setup form submission handler
  setupFormSubmission();

  // --- Calendar View Toggle Logic ---
  /**
   * Sets up event listeners for toggling between week and month calendar views.
   * Handles UI state and resets slot containers and selected date as needed.
   */
  function setupCalendarViewToggle() {
    const weekRadio = document.getElementById('weekView');
    const monthRadio = document.getElementById('monthView');
    const weekContainer = document.getElementById('weekViewContainer');
    const monthContainer = document.getElementById('monthViewContainer');
    if (!weekRadio || !monthRadio || !weekContainer || !monthContainer) return;
    weekRadio.addEventListener('change', () => {
      // Switch to weekly view, reset containers and selected date
      if (weekRadio.checked) {
        weekContainer.style.display = '';
        monthContainer.style.display = 'none';
        const monthViewContainer = document.getElementById('monthViewContainer');
        if (monthViewContainer) monthViewContainer.innerHTML = '';
        const slotContainer = document.getElementById('timeCards');
        if (slotContainer) slotContainer.innerHTML = '';
        calendar.selectedDate = null;
      }
    });
    monthRadio.addEventListener('change', () => {
      // Switch to monthly view, reset containers and selected date, then render month
      if (monthRadio.checked) {
        const today = new Date();
        calendar.currentMonth = today.getMonth();
        calendar.currentYear = today.getFullYear();
        weekContainer.style.display = 'none';
        monthContainer.style.display = '';
        const slotContainer = document.getElementById('timeCards');
        if (slotContainer) slotContainer.innerHTML = '';
        calendar.selectedDate = null;
        setTimeout(() => {
          calendar.renderMonthlyCalendar();
        }, 50);
      }
    });
  }
  setupCalendarViewToggle();
});

/**
 * Sets up the event listener for the appointment booking form submission.
 */
function setupFormSubmission() {
  const bookingForm = document.getElementById('appointment-form');
  if (!bookingForm) {
    console.error('Booking form not found!');
    return;
  }

  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = bookingForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Confirmando...';

    const authManager = new AuthManager();
    const selectedDate = document.getElementById('selected-date').value;
    const selectedTime = document.getElementById('selected-time').value;
    const note = document.getElementById('note').value;

    if (!selectedDate || !selectedTime) {
      showNotification('Por favor, selecciona una fecha y hora.', 'danger');
      return;
    }

    console.log('[appointment.js] Submitting form with -> date:', selectedDate, 'time:', selectedTime);

    let appointmentData = {
      date: selectedDate,
      time: selectedTime,
      note: note,
    };

    if (authManager.isLoggedIn()) {
      const user = authManager.getCurrentUser();
      appointmentData.user_id = user.id;
      appointmentData.full_name = user.full_name;
      appointmentData.email = user.email;
      appointmentData.phone = user.phone;
    } else {
      appointmentData.full_name = document.getElementById('guestName').value;
      appointmentData.email = document.getElementById('guestEmail').value;
      appointmentData.phone = document.getElementById('guestPhone').value;
    }

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointmentData),
      });

      const result = await response.json();

      if (response.ok) {
        showNotification('¡Cita agendada exitosamente! Serás redirigido.', 'success');
        setTimeout(() => {
          // Redirect to 'Mis Citas' if logged in, otherwise to a confirmation/home page
          window.location.href = authManager.isLoggedIn() ? 'mis-citas.html' : 'index.html';
        }, 2500);
      } else {
        throw new Error(result.message || 'No se pudo agendar la cita.');
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      showNotification(error.message, 'danger');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-calendar-check me-2"></i>Confirmar Cita';
    }
  });
}

/**
 * Shows a notification message at the top of the page.
 * @param {string} message The message to display.
 * @param {string} type The type of alert ('success', 'danger', 'info').
 */
function showNotification(message, type = 'info') {
  const container = document.getElementById('notification-container');
  if (!container) {
    console.error('Notification container not found!');
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
// (autoAdvanceIfNoAvailableSlots and fetchSlotsForWeek are now part of the Calendar class)
