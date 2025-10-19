/**
 * reschedule.js
 *
 * Handles the appointment rescheduling page logic for Quirofísicos Rocha:
 * - Integrates the shared Calendar class for calendar and slot rendering.
 * - Loads and displays the current appointment.
 * - Prevents selecting the same date/time as the current appointment.
 * - Handles form submission for rescheduling.
 * - Provides user feedback and error handling.
 */

import { Calendar } from './calendar.js';

// ───────── DOM REFERENCES ─────────
let calendarEl, timeCardsEl, bookingForm, selectedDateInput, selectedTimeInput;
let currentAppointmentAlert, currentAppointmentInfo;

// ───────── APPOINTMENT DATA ─────────
let currentAppointment = null;
let appointmentId = null;
let currentDateISO = null;

// ───────── HELPER FUNCTIONS ─────────
/**
 * Returns the appointment date (ISO string) from an appointment object.
 */
function getAppointmentDate(appointment) {
  if (!appointment) return null;
  return appointment.appointment_date || appointment.date;
}
/**
 * Returns the appointment time from an appointment object.
 */
function getAppointmentTime(appointment) {
  if (!appointment) return null;
  return appointment.appointment_time || appointment.time;
}
/**
 * Returns the appointment date in ISO format (yyyy-mm-dd).
 */
function getAppointmentDateISO(appointment) {
  if (!appointment) return null;
  const dateStr = getAppointmentDate(appointment);
  if (!dateStr) return null;
  if (dateStr.includes('T')) {
    return dateStr.split('T')[0];
  }
  return dateStr;
}

// ───────── DOM INITIALIZATION ─────────
/**
 * Initializes the reschedule system on DOMContentLoaded:
 * - Loads appointment, calendar, and sets up event handlers.
 */
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🔄 Reschedule system loading...');

  // Get appointment ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  appointmentId = urlParams.get('id');

  if (!appointmentId) {
    showNotification('ID de cita no encontrado', 'error');
    setTimeout(() => {
      window.location.href = 'mis-citas.html';
    }, 2000);
    return;
  }

  // Initialize DOM references
  initializeDOMReferences();

  // Load current appointment
  await loadCurrentAppointment();

  // Initialize Calendar instance
  window.rescheduleCalendar = new Calendar();

  // Render weekly calendar in the reschedule context
  window.rescheduleCalendar.renderWeeklyCalendar('calendar');

  // Override slot selection to prevent current appointment date/time
  overrideCalendarSlotSelection();

  // Setup form submission
  setupFormSubmission();
  console.log('🔄 Reschedule system ready');
});

/**
 * Initializes DOM element references.
 */
function initializeDOMReferences() {
    calendarEl = document.getElementById('calendar');
    timeCardsEl = document.getElementById('timeCards');
    bookingForm = document.getElementById('bookingForm');
    selectedDateInput = document.getElementById('selectedDate');
    selectedTimeInput = document.getElementById('selectedTime');
    currentAppointmentAlert = document.getElementById('currentAppointmentAlert');
    currentAppointmentInfo = document.getElementById('currentAppointmentInfo');
    console.log('🔄 DOM references initialized');
}

/**
 * Overrides Calendar slot selection to prevent selecting the current appointment's date/time.
 */
function overrideCalendarSlotSelection() {
  const calendar = window.rescheduleCalendar;
  if (!calendar) return;
  // Patch the selectTimeSlot method
  const originalSelectTimeSlot = calendar.selectTimeSlot.bind(calendar);
  calendar.selectTimeSlot = function(time, btnElement) {
    // Prevent selecting the current appointment's date/time
    const selectedDate = this.selectedDate ? this.formatDate(this.selectedDate) : null;
    if (
      currentAppointment &&
      getAppointmentDateISO(currentAppointment) === selectedDate &&
      getAppointmentTime(currentAppointment) === time + ':00'
    ) {
      showNotification('No puedes seleccionar la misma fecha y hora de tu cita actual. Por favor elige otra.', 'warning');
      return;
    }
    originalSelectTimeSlot(time, btnElement);
    // Set the selected date/time in the form
    if (selectedDateInput) selectedDateInput.value = selectedDate;
    if (selectedTimeInput) selectedTimeInput.value = time;
    // Enable form submission
    const submitBtn = bookingForm?.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = false;
  };
}

// ───────── CURRENT APPOINTMENT LOADING ─────────
/**
 * Loads the current appointment from the backend and displays info.
 */
async function loadCurrentAppointment() {
  try {
    const response = await fetch(`/api/appointments/${appointmentId}`, {
      headers: window.authManager ? window.authManager.getAuthHeaders() : {}
    });
    if (!response.ok) throw new Error('Error al cargar la cita actual');
    
    const data = await response.json();
    currentAppointment = data;
    console.log('🔄 Current appointment loaded:', currentAppointment);
    
    // Display appointment info
    displayCurrentAppointmentInfo();
    
    // Pre-fill date and time if rescheduling
    if (currentAppointment) {
      const dateISO = getAppointmentDateISO(currentAppointment);
      const time = getAppointmentTime(currentAppointment);
      selectedDateInput.value = dateISO;
      selectedTimeInput.value = time;
      
      // Select the date in the calendar
      selectDate(dateISO);
      
      // Load available time slots for the current appointment date
      await loadTimeSlots(dateISO);
    }
  } catch (error) {
    console.error('🔄 Error loading current appointment:', error);
    showNotification('Error cargando la cita actual: ' + error.message, 'error');
  }
}
/**
 * Displays the current appointment info in the UI.
 */
function displayCurrentAppointmentInfo() {
  if (!currentAppointmentInfo) return;
  
  try {
    const date = new Date(getAppointmentDate(currentAppointment));
    const time = getAppointmentTime(currentAppointment);
    const formattedDate = date.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    const formattedTime = formatTime(time);
    
    currentAppointmentInfo.innerHTML = `
      <strong>Fecha actual:</strong> ${formattedDate}<br>
      <strong>Hora actual:</strong> ${formattedTime}<br>
      <strong>Servicio:</strong> ${currentAppointment.service_type || 'Consulta General'}<br>
    `;
    
    console.log('🔄 Current appointment info displayed');
    console.log('🔄 Formatted time:', formattedTime);
  } catch (error) {
    console.error('🔄 Error displaying appointment info:', error);
    currentAppointmentInfo.innerHTML = 'Error mostrando información de la cita';
  }
}

// ───────── FORM SUBMISSION ─────────
/**
 * Sets up the form submission handler for rescheduling.
 */
function setupFormSubmission() {
  if (!bookingForm) return;
  
  bookingForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const selectedDate = selectedDateInput?.value;
    const selectedTime = selectedTimeInput?.value;
    const note = document.getElementById('note')?.value || '';
    
    if (!selectedDate || !selectedTime) {
      showNotification('Por favor selecciona fecha y hora', 'error');
      return;
    }
    
    console.log('🔄 Submitting reschedule:', { selectedDate, selectedTime, note });
    
    try {
      const submitBtn = bookingForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Reagendando...';
      
      const authToken = window.authManager && window.authManager.isLoggedIn() 
        ? window.authManager.getToken() 
        : (localStorage.getItem('user_token') || localStorage.getItem('token'));
      
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
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
      console.log('🔄 Reschedule successful:', result);
      
      showNotification('¡Cita reagendada exitosamente!', 'success');
      
      setTimeout(() => {
        window.location.href = 'mis-citas.html';
      }, 2000);
      
    } catch (error) {
      console.error('🔄 Reschedule error:', error);
      showNotification('Error reagendando la cita: ' + error.message, 'error');
      
      const submitBtn = bookingForm.querySelector('button[type="submit"]');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-calendar-check me-2"></i>Confirmar Reagendamiento';
    }
  });
}

// ───────── DATE SELECTION ─────────
/**
 * Handles selecting a date in the calendar and loads available slots.
 */
async function selectDate(dayISO) {
  console.log('🔄 Date selected:', dayISO);
  
  // Check if this is the current appointment date
  if (currentAppointment && getAppointmentDateISO(currentAppointment) === dayISO) {
    showNotification('No puedes seleccionar la misma fecha de tu cita actual. Por favor elige una fecha diferente.', 'warning');
    return;
  }
  
  currentDateISO = dayISO;
  selectedDateInput.value = dayISO;
  
  // Update visual selection - use the new button structure
  document.querySelectorAll('.calendar-day-btn').forEach(btn => {
    btn.classList.remove('selected', 'btn-primary');
    if (!btn.disabled && !btn.classList.contains('bg-warning')) {
      btn.classList.add('btn-outline-primary');
    }
  });
  
  // Find and select the clicked button
  const selectedBtn = document.querySelector(`[data-date="${dayISO}"]`);
  if (selectedBtn && !selectedBtn.disabled) {
    selectedBtn.classList.remove('btn-outline-primary');
    selectedBtn.classList.add('selected', 'btn-primary');
  }
  
  // Load time slots
  await loadTimeSlots(dayISO);
}

// ───────── TIME SLOTS ─────────
/**
 * Loads available time slots for a given date.
 */
async function loadTimeSlots(dayISO) {
  if (!timeCardsEl) {
    console.error('🔄 timeCardsEl not found');
    return;
  }
  
  console.log('🔄 Loading time slots for:', dayISO);
  
  try {
    timeCardsEl.innerHTML = '<div class="col-12"><p class="text-muted mb-0">Cargando horarios disponibles...</p></div>';
    
    // Get available slots
    const availableSlots = await fetchAvailableSlots(dayISO);
    console.log('🔄 Available slots received:', availableSlots);
    
    if (availableSlots.length === 0) {
      timeCardsEl.innerHTML = '<div class="col-12"><p class="text-muted mb-0">No hay horarios disponibles para esta fecha</p></div>';
      return;
    }
    
    let timeSlotsHTML = '';
    availableSlots.forEach(timeSlot => {
      console.log('🔄 Processing time slot:', timeSlot);
      
      // Check if this is the current appointment time
      const isCurrentAppointmentTime = currentAppointment && 
        getAppointmentDateISO(currentAppointment) === dayISO && 
        getAppointmentTime(currentAppointment) === timeSlot + ':00';
      
      let btnClass = 'btn btn-outline-primary';
      let disabled = '';
      let warningText = '';
      
      if (isCurrentAppointmentTime) {
        btnClass = 'btn btn-warning';
        disabled = 'disabled';
        warningText = '<br><small>Hora actual</small>';
      }
      
      timeSlotsHTML += `
        <div class="col-6 col-md-4 col-lg-3">
          <button type="button" 
                  class="${btnClass} w-100 time-slot"
                  data-time="${timeSlot}"
                  ${disabled}>
            ${formatTime(timeSlot)}${warningText}
          </button>
        </div>
      `;
    });
    
    timeCardsEl.innerHTML = timeSlotsHTML;
    timeCardsEl.querySelectorAll('.time-slot').forEach(btn => {
        if (!btn.disabled) {
            btn.addEventListener('click', (e) => selectTime(e.target.dataset.time, e.target));
        }
    });
    console.log('🔄 Time slots loaded, HTML updated:', timeSlotsHTML);
    
  } catch (error) {
    console.error('🔄 Error loading time slots:', error);
    timeCardsEl.innerHTML = '<div class="col-12"><p class="text-danger mb-0">Error cargando horarios disponibles</p></div>';
  }
}
/**
 * Handles selecting a time slot.
 */
function selectTime(timeSlot, buttonElement) {
  // Check if this is the current appointment time
  if (currentAppointment && 
      getAppointmentDateISO(currentAppointment) === currentDateISO && 
      getAppointmentTime(currentAppointment) === timeSlot + ':00') {
    showNotification('No puedes seleccionar la misma hora de tu cita actual. Por favor elige una hora diferente.', 'warning');
    return;
  }
  
  console.log('🔄 Time selected:', timeSlot);
  
  selectedTimeInput.value = timeSlot;
  
  // Update visual selection
  document.querySelectorAll('.time-slot').forEach(btn => {
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-outline-primary');
  });
  buttonElement.classList.remove('btn-outline-primary');
  buttonElement.classList.add('btn-primary');
  
  // Enable form submission
  const submitBtn = bookingForm.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = false;
  }
}

// ───────── AVAILABILITY FETCHING ─────────
/**
 * Fetches available slots for a given date from the backend.
 */
async function fetchAvailableSlots(dayISO) {
  try {
    console.log('🔄 Fetching available slots for:', dayISO);
    const response = await fetch(`/api/available-slots/${dayISO}`);
    if (!response.ok) {
      console.error('Error fetching available slots, falling back to basic method');
      return await fetchBasicAvailability(dayISO);
    }
    
    const data = await response.json();
    console.log('🔄 Available slots response:', data);
    return data.availableSlots || [];
  } catch (error) {
    console.error('Error fetching available slots:', error);
    return await fetchBasicAvailability(dayISO);
  }
}
/**
 * Fallback: fetches available slots using basic logic if backend fails.
 */
async function fetchBasicAvailability(dayISO) {
  const selectedDate = new Date(dayISO);
  const dayOfWeek = getDayOfWeekString(selectedDate);
  
  const businessDay = BUSINESS_HOURS.find(bh => bh.day_of_week === dayOfWeek);
  
  if (!businessDay || !businessDay.is_open) {
    return [];
  }

  const allSlots = generateTimeSlots(businessDay.open_time, businessDay.close_time);
  const taken = await fetchAppointments(dayISO);
  let available = allSlots.filter(t => !taken.includes(t));
  
  // Filter out slots that are less than 30 minutes from now (only for today)
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const thirtyMinutesFromNow = new Date(now.getTime() + (30 * 60 * 1000));
  
  if (dayISO === today) {
    available = available.filter(timeSlot => {
      const slotDateTime = new Date(`${dayISO}T${timeSlot}:00`);
      return slotDateTime >= thirtyMinutesFromNow;
    });
  }
  
  return available;
}
/**
 * Fetches all appointments for a given date.
 */
async function fetchAppointments(dayISO) {
  try {
    const response = await fetch(`/api/appointments/date/${dayISO}`);
    if (!response.ok) return [];
    
    const data = await response.json();
    return data.appointments?.map(apt => {
      const timeStr = apt.appointment_time || apt.time;
      return timeStr?.substring(0, 5);
    }) || [];
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return [];
  }
}

// ───────── UTILITY FUNCTIONS ─────────
/**
 * Generates 30-minute time slots between open and close times.
 */
function generateTimeSlots(openTime, closeTime) {
  const slots = [];
  const [openHour, openMinute] = openTime.split(':').map(Number);
  const [closeHour, closeMinute] = closeTime.split(':').map(Number);
  
  let currentHour = openHour;
  let currentMinute = openMinute;
  
  while (currentHour < closeHour || (currentHour === closeHour && currentMinute < closeMinute)) {
    const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    slots.push(timeString);
    
    currentMinute += 30;
    if (currentMinute >= 60) {
      currentMinute = 0;
      currentHour++;
    }
  }
  
  return slots;
}
/**
 * Returns the day of week string for a JS Date.
 */
function getDayOfWeekString(date) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}
/**
 * Formats a time string as AM/PM.
 */
function formatTime(timeString) {
  const [hours, minutes] = timeString.split(':');
  const hour24 = parseInt(hours);
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  return `${hour12}:${minutes} ${ampm}`;
}
/**
 * Shows a notification message in the UI.
 */
function showNotification(message, type = 'info') {
  console.log(`🔄 Notification (${type}):`, message);
  
  // Create or update notification div
  let notificationDiv = document.getElementById('notificationDiv');
  if (!notificationDiv) {
    notificationDiv = document.createElement('div');
    notificationDiv.id = 'notificationDiv';
    notificationDiv.style.position = 'fixed';
    notificationDiv.style.top = '20px';
    notificationDiv.style.right = '20px';
    notificationDiv.style.zIndex = '9999';
    notificationDiv.style.maxWidth = '400px';
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

console.log('🔄 Reschedule.js loaded and ready');
