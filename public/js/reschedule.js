/**
 * reschedule.js
 *
 * Handles the appointment rescheduling page for Quirofísicos Rocha:
 * - Integrates the shared Calendar class for calendar and slot rendering
 * - Loads and displays the current appointment details
 * - Prevents selecting the same date/time as the current appointment
 * - Handles form submission for rescheduling via backend API
 * - Provides user feedback and error handling
 */

import { Calendar } from './calendar.js';

// ============================================
// GLOBAL STATE
// ============================================

let calendar = null;
let currentAppointment = null;
let appointmentId = null;

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initializes the reschedule system on DOMContentLoaded:
 * - Loads appointment details
 * - Sets up calendar with restricted slot selection
 * - Initializes form handlers
 */
document.addEventListener('DOMContentLoaded', async function() {
  console.log('[reschedule.js] Initializing...');

  // Get appointment ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  appointmentId = urlParams.get('id');
  console.log('[reschedule.js] Appointment ID:', appointmentId);

  if (!appointmentId) {
    showNotification('ID de cita no encontrado', 'error');
    setTimeout(() => {
      window.location.href = 'mis-citas.html';
    }, 2000);
    return;
  }

  // Load current appointment details
  await loadCurrentAppointment();

  // Initialize Calendar instance
  calendar = new Calendar();
  
  // Override slot selection to prevent selecting current appointment
  overrideCalendarSlotSelection();

  // Render weekly calendar
  await calendar.renderWeeklyCalendar('calendar');

  // Setup form submission
  setupFormSubmission();
  
  console.log('[reschedule.js] Initialization complete');
});

// ============================================
// CURRENT APPOINTMENT LOADING
// ============================================

/**
 * Loads the current appointment from the backend and displays info
 */
async function loadCurrentAppointment() {
  try {
    console.log(`[reschedule.js] Fetching appointment ${appointmentId}`);

    const response = await fetch(`/api/appointments/${appointmentId}`, {
      headers: window.authManager ? window.authManager.getAuthHeaders() : {}
    });

    if (!response.ok) {
      throw new Error('Error al cargar la cita actual');
    }
    
    const data = await response.json();
    console.log('[reschedule.js] Appointment loaded:', data);

    currentAppointment = data;
    
    // Display appointment info in UI
    displayCurrentAppointmentInfo();
    
  } catch (error) {
    console.error('[reschedule.js] Error loading appointment:', error);
    showNotification('Error cargando la cita actual: ' + error.message, 'error');
  }
}

/**
 * Displays the current appointment info in the UI
 */
function displayCurrentAppointmentInfo() {
  const currentAppointmentInfo = document.getElementById('currentAppointmentInfo');
  if (!currentAppointmentInfo) return;
  
  try {
    const dateStr = getAppointmentDate(currentAppointment);
    const timeStr = getAppointmentTime(currentAppointment);
    
    const date = new Date(dateStr);
    const formattedDate = date.toLocaleDateString('es-MX', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const formattedTime = formatTime(timeStr);
    
    currentAppointmentInfo.innerHTML = `
      <strong>Fecha actual:</strong> ${formattedDate}<br>
      <strong>Hora actual:</strong> ${formattedTime}<br>
      <strong>Servicio:</strong> ${currentAppointment.serviceType || 'Consulta General'}<br>
    `;
    
    console.log('[reschedule.js] Displayed current appointment info');
  } catch (error) {
    console.error('[reschedule.js] Error displaying appointment info:', error);
    currentAppointmentInfo.innerHTML = 'Error mostrando información de la cita';
  }
}

// ============================================
// CALENDAR SLOT SELECTION OVERRIDE
// ============================================

/**
 * Overrides Calendar slot selection to prevent selecting the current appointment's date/time
 */
function overrideCalendarSlotSelection() {
  if (!calendar) return;
  
  // Store original method
  const originalSelectTimeSlot = calendar.selectTimeSlot.bind(calendar);
  
  // Override with validation
  calendar.selectTimeSlot = function(time, btnElement) {
    const selectedDate = this.selectedDate ? this.formatDate(this.selectedDate) : null;
    const currentDate = getAppointmentDateISO(currentAppointment);
    const currentTime = getAppointmentTime(currentAppointment);
    
    // Check if trying to select current appointment's slot
    if (currentAppointment && currentDate === selectedDate && currentTime === time + ':00') {
      showNotification(
        'No puedes seleccionar la misma fecha y hora de tu cita actual. Por favor elige otra.',
        'warning'
      );
      return;
    }
    
    // Call original method
    originalSelectTimeSlot(time, btnElement);
    
    // Update form fields
    const selectedDateInput = document.getElementById('selectedDate');
    const selectedTimeInput = document.getElementById('selectedTime');
    
    if (selectedDateInput) selectedDateInput.value = selectedDate;
    if (selectedTimeInput) selectedTimeInput.value = time;
    
    // Enable submit button
    const submitBtn = document.querySelector('#bookingForm button[type="submit"]');
    if (submitBtn) submitBtn.disabled = false;
    
    console.log('[reschedule.js] Slot selected:', { date: selectedDate, time });
  };
}

// ============================================
// FORM SUBMISSION
// ============================================

/**
 * Sets up the form submission handler for rescheduling
 */
function setupFormSubmission() {
  const bookingForm = document.getElementById('bookingForm');
  if (!bookingForm) {
    console.warn('[reschedule.js] Booking form not found');
    return;
  }
  
  bookingForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const selectedDate = document.getElementById('selectedDate')?.value;
    const selectedTime = document.getElementById('selectedTime')?.value;
    const note = document.getElementById('note')?.value || '';
    
    // Validate inputs
    if (!selectedDate || !selectedTime) {
      showNotification('Por favor selecciona fecha y hora', 'error');
      return;
    }
    
    console.log('[reschedule.js] Submitting reschedule:', {
      appointmentId,
      newDate: selectedDate,
      newTime: selectedTime,
      note
    });
    
    const submitBtn = bookingForm.querySelector('button[type="submit"]');
    if (!submitBtn) return;
    
    try {
      // Disable button and show loading
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Reagendando...';
      
      // Get auth token
      const authToken = window.authManager && window.authManager.isLoggedIn() 
        ? window.authManager.getToken() 
        : (localStorage.getItem('userToken') || localStorage.getItem('token'));
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      // Submit reschedule request
      const response = await fetch(`/api/appointments/${appointmentId}/reschedule`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          newDate: selectedDate,
          newTime: selectedTime,
          note: note
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error reagendando la cita');
      }
      
      const result = await response.json();
      console.log('[reschedule.js] Reschedule successful:', result);
      
      showNotification('¡Cita reagendada exitosamente!', 'success');
      
      // Redirect to appointments page
      setTimeout(() => {
        window.location.href = 'mis-citas.html';
      }, 2000);
      
    } catch (error) {
      console.error('[reschedule.js] Reschedule error:', error);
      showNotification('Error reagendando la cita: ' + error.message, 'error');
      
      // Re-enable button
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-calendar-check me-2"></i>Confirmar Reagendamiento';
      }
    }
  });
  
  console.log('[reschedule.js] Form submission handler initialized');
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Returns the appointment date from an appointment object
 */
function getAppointmentDate(appointment) {
  if (!appointment) return null;
  return appointment.appointmentDate || appointment.date;
}

/**
 * Returns the appointment time from an appointment object
 */
function getAppointmentTime(appointment) {
  if (!appointment) return null;
  return appointment.appointmentTime || appointment.time;
}

/**
 * Returns the appointment date in ISO format (yyyy-mm-dd)
 */
function getAppointmentDateISO(appointment) {
  if (!appointment) return null;
  const dateStr = getAppointmentDate(appointment);
  if (!dateStr) return null;
  
  // If already in ISO format
  if (dateStr.includes('T')) {
    return dateStr.split('T')[0];
  }
  
  return dateStr;
}

/**
 * Formats a time string as AM/PM
 * @param {string} timeString Time in HH:MM or HH:MM:SS format
 */
function formatTime(timeString) {
  if (!timeString) return '';
  
  const [hours, minutes] = timeString.split(':');
  const hour24 = parseInt(hours);
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  
  return `${hour12}:${minutes} ${ampm}`;
}

// ============================================
// NOTIFICATION SYSTEM
// ============================================

/**
 * Shows a notification message in the UI
 * @param {string} message The message to display
 * @param {string} type The type ('error', 'success', 'warning', 'info')
 */
function showNotification(message, type = 'info') {
  console.log(`[reschedule.js] Notification (${type}): ${message}`);
  
  // Create or update notification div
  let notificationDiv = document.getElementById('notificationDiv');
  if (!notificationDiv) {
    notificationDiv = document.createElement('div');
    notificationDiv.id = 'notificationDiv';
    notificationDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      max-width: 400px;
    `;
    document.body.appendChild(notificationDiv);
  }
  
  const alertClass = type === 'error' ? 'alert-danger' : 
                     type === 'success' ? 'alert-success' : 
                     type === 'warning' ? 'alert-warning' : 'alert-info';
  
  notificationDiv.innerHTML = `
    <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    notificationDiv.innerHTML = '';
  }, 5000);
}

console.log('[reschedule.js] Module loaded');
