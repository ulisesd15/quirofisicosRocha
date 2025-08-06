/**
 * Quirofísicos Rocha - Appointment Reschedule System
 * Based on appointment booking system with reschedule modifications
 * 
 * Features:
 * - Responsive 7-day week view calendar
 * - Business hours integration with admin panel
 * - AM/PM time format for user-friendly display
 * - Timezone-safe date handling
 * - Current appointment display and prevention
 * - Real-time availability checking
 */

// ───────── DOM REFERENCES ─────────
let calendarEl, timeCardsEl, bookingForm, selectedDateInput, selectedTimeInput;
let currentAppointmentAlert, currentAppointmentInfo;

// ───────── APPOINTMENT DATA ─────────
let currentAppointment = null;
let appointmentId = null;

// ───────── TIME CONSTANTS ─────────
// This will be replaced by dynamic business hours from admin panel
let BUSINESS_HOURS = [];
let BUSINESS_DAYS = [];

// Timezone-safe date formatting function
const iso = d => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startOfWeek = (offset = 0) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  // Adjust to start from Monday (1) instead of Sunday (0)
  const dayOfWeek = d.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days, otherwise go to previous Monday
  d.setDate(d.getDate() + mondayOffset + (offset * 7));
  return d;
};

// ───────── USER LOGIC ─────────
let weekOffset = 0, currentDateISO = null;

// ───────── DOM INITIALIZATION ─────────
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
  
  // Wait for AuthManager
  if (window.authManager) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Load current appointment
  await loadCurrentAppointment();
  
  // Load business hours
  await loadBusinessHours();
  
  // Initialize calendar system
  initializeCalendarSystem();
  
  // Setup form submission
  setupFormSubmission();
  
  console.log('🔄 Reschedule system ready');
});

function initializeDOMReferences() {
  calendarEl = document.getElementById('calendar');
  timeCardsEl = document.getElementById('timeCards');
  bookingForm = document.getElementById('bookingForm');
  selectedDateInput = document.getElementById('selectedDate');
  selectedTimeInput = document.getElementById('selectedTime');
  currentAppointmentAlert = document.getElementById('currentAppointmentAlert');
  currentAppointmentInfo = document.getElementById('currentAppointmentInfo');
}

// ───────── CURRENT APPOINTMENT LOADING ─────────
async function loadCurrentAppointment() {
  try {
    console.log('🔄 Loading current appointment:', appointmentId);
    
    const authToken = window.authManager && window.authManager.isLoggedIn() 
      ? window.authManager.getToken() 
      : (localStorage.getItem('user_token') || localStorage.getItem('token'));
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await fetch(`/api/appointments-test/${appointmentId}`, {
      headers: headers
    });

    if (!response.ok) {
      throw new Error('Error loading appointment');
    }

    currentAppointment = await response.json();
    console.log('🔄 Current appointment loaded:', currentAppointment);
    
    displayCurrentAppointmentInfo();
    
  } catch (error) {
    console.error('🔄 Error loading current appointment:', error);
    showNotification('Error cargando la cita: ' + error.message, 'error');
  }
}

function displayCurrentAppointmentInfo() {
  if (!currentAppointment || !currentAppointmentInfo) return;
  
  try {
    const appointmentDate = new Date(currentAppointment.appointment_date + 'T' + currentAppointment.appointment_time);
    const formattedDate = appointmentDate.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = appointmentDate.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    currentAppointmentInfo.innerHTML = `
      <strong>Fecha actual:</strong> ${formattedDate}<br>
      <strong>Hora actual:</strong> ${formattedTime}<br>
      <strong>Servicio:</strong> ${currentAppointment.service_type || 'Consulta General'}
    `;
    
    console.log('🔄 Current appointment info displayed');
  } catch (error) {
    console.error('🔄 Error displaying appointment info:', error);
    currentAppointmentInfo.innerHTML = 'Error mostrando información de la cita';
  }
}

// ───────── BUSINESS HOURS LOADING ─────────
async function loadBusinessHours() {
  try {
    const response = await fetch('/api/business-hours');
    if (response.ok) {
      const data = await response.json();
      BUSINESS_HOURS = data.businessHours || [];
      BUSINESS_DAYS = BUSINESS_HOURS.filter(bh => bh.is_open).map(bh => bh.day_of_week);
      console.log('✅ Business hours loaded:', BUSINESS_HOURS);
    } else {
      console.warn('⚠️ Could not load business hours, using defaults');
      useDefaultBusinessHours();
    }
  } catch (error) {
    console.error('❌ Error loading business hours:', error);
    useDefaultBusinessHours();
  }
}

function useDefaultBusinessHours() {
  BUSINESS_HOURS = [
    { day_of_week: 'Monday', is_open: true, open_time: '09:00', close_time: '17:00' },
    { day_of_week: 'Tuesday', is_open: true, open_time: '09:00', close_time: '17:00' },
    { day_of_week: 'Wednesday', is_open: true, open_time: '09:00', close_time: '17:00' },
    { day_of_week: 'Thursday', is_open: true, open_time: '09:00', close_time: '17:00' },
    { day_of_week: 'Friday', is_open: true, open_time: '09:00', close_time: '17:00' },
    { day_of_week: 'Saturday', is_open: false, open_time: null, close_time: null },
    { day_of_week: 'Sunday', is_open: false, open_time: null, close_time: null }
  ];
  BUSINESS_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
}

// ───────── CALENDAR SYSTEM ─────────
function initializeCalendarSystem() {
  // Initialize week view first
  renderWeek();
  
  // Setup view switching
  const weekViewRadio = document.getElementById('weekView');
  const monthViewRadio = document.getElementById('monthView');
  const weekViewContainer = document.getElementById('weekViewContainer');
  const monthViewContainer = document.getElementById('monthViewContainer');
  
  if (weekViewRadio && monthViewRadio) {
    weekViewRadio.addEventListener('change', function() {
      if (this.checked) {
        weekViewContainer.style.display = 'block';
        monthViewContainer.style.display = 'none';
      }
    });
    
    monthViewRadio.addEventListener('change', function() {
      if (this.checked) {
        weekViewContainer.style.display = 'none';
        monthViewContainer.style.display = 'block';
        // Initialize monthly calendar if not already done
        if (typeof initMonthlyCalendar === 'function') {
          initMonthlyCalendar();
        }
      }
    });
  }
}

function renderWeek() {
  if (!calendarEl) return;
  
  const startDate = startOfWeek(weekOffset);
  let calendarHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <button type="button" class="btn btn-outline-secondary btn-sm" onclick="changeWeek(-1)">
        <i class="fas fa-chevron-left"></i> Anterior
      </button>
      <h6 class="mb-0">Semana del ${startDate.toLocaleDateString('es-ES')}</h6>
      <button type="button" class="btn btn-outline-secondary btn-sm" onclick="changeWeek(1)">
        Siguiente <i class="fas fa-chevron-right"></i>
      </button>
    </div>
    <div class="row g-2">
  `;
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    
    const dayName = date.toLocaleDateString('es-ES', { weekday: 'short' });
    const dayNumber = date.getDate();
    const monthName = date.toLocaleDateString('es-ES', { month: 'short' });
    const isToday = date.toDateString() === new Date().toDateString();
    const isPast = date < new Date().setHours(0, 0, 0, 0);
    const dayOfWeek = getDayOfWeekString(date);
    const isBusinessDay = BUSINESS_DAYS.includes(dayOfWeek);
    const dateISO = iso(date);
    
    // Check if this is the current appointment date
    const isCurrentAppointmentDate = currentAppointment && 
      currentAppointment.appointment_date === dateISO;
    
    let dayClass = 'calendar-day text-center p-3 border rounded cursor-pointer';
    if (isToday) dayClass += ' border-primary fw-bold';
    if (isPast) dayClass += ' text-muted bg-light';
    if (!isBusinessDay) dayClass += ' text-muted bg-light';
    if (isCurrentAppointmentDate) dayClass += ' bg-warning text-dark border-warning';
    
    const clickable = !isPast && isBusinessDay;
    const onclick = clickable ? `onclick="selectDate('${dateISO}')"` : '';
    
    calendarHTML += `
      <div class="col">
        <div class="${dayClass}" ${onclick} ${!clickable ? 'style="cursor: not-allowed;"' : ''}>
          <div class="small text-uppercase">${dayName}</div>
          <div class="h5 mb-0">${dayNumber}</div>
          <div class="small">${monthName}</div>
          ${isCurrentAppointmentDate ? '<div class="small text-dark"><i class="fas fa-star"></i> Actual</div>' : ''}
          ${!isBusinessDay ? '<div class="small">Cerrado</div>' : ''}
        </div>
      </div>
    `;
  }
  
  calendarHTML += '</div>';
  calendarEl.innerHTML = calendarHTML;
}

// ───────── DATE SELECTION ─────────
async function selectDate(dayISO) {
  console.log('🔄 Date selected:', dayISO);
  
  // Check if this is the current appointment date
  if (currentAppointment && currentAppointment.appointment_date === dayISO) {
    showNotification('No puedes seleccionar la misma fecha de tu cita actual. Por favor elige una fecha diferente.', 'warning');
    return;
  }
  
  currentDateISO = dayISO;
  selectedDateInput.value = dayISO;
  
  // Update visual selection
  document.querySelectorAll('.calendar-day').forEach(day => {
    day.classList.remove('selected', 'bg-primary', 'text-white');
  });
  event.target.closest('.calendar-day').classList.add('selected', 'bg-primary', 'text-white');
  
  // Load time slots
  await loadTimeSlots(dayISO);
}

// ───────── TIME SLOTS ─────────
async function loadTimeSlots(dayISO) {
  if (!timeCardsEl) return;
  
  try {
    timeCardsEl.innerHTML = '<div class="col-12"><p class="text-muted mb-0">Cargando horarios disponibles...</p></div>';
    
    // Get available slots
    const availableSlots = await fetchAvailableSlots(dayISO);
    
    if (availableSlots.length === 0) {
      timeCardsEl.innerHTML = '<div class="col-12"><p class="text-muted mb-0">No hay horarios disponibles para esta fecha</p></div>';
      return;
    }
    
    let timeSlotsHTML = '';
    availableSlots.forEach(timeSlot => {
      // Check if this is the current appointment time
      const isCurrentAppointmentTime = currentAppointment && 
        currentAppointment.appointment_date === dayISO && 
        currentAppointment.appointment_time === timeSlot + ':00';
      
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
                  onclick="selectTime('${timeSlot}')"
                  ${disabled}>
            ${formatTime(timeSlot)}${warningText}
          </button>
        </div>
      `;
    });
    
    timeCardsEl.innerHTML = timeSlotsHTML;
    console.log('🔄 Time slots loaded');
    
  } catch (error) {
    console.error('🔄 Error loading time slots:', error);
    timeCardsEl.innerHTML = '<div class="col-12"><p class="text-danger mb-0">Error cargando horarios disponibles</p></div>';
  }
}

function selectTime(timeSlot) {
  // Check if this is the current appointment time
  if (currentAppointment && 
      currentAppointment.appointment_date === currentDateISO && 
      currentAppointment.appointment_time === timeSlot + ':00') {
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
  event.target.classList.remove('btn-outline-primary');
  event.target.classList.add('btn-primary');
  
  // Enable form submission
  const submitBtn = bookingForm.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = false;
  }
}

// ───────── AVAILABILITY FETCHING ─────────
async function fetchAvailableSlots(dayISO) {
  try {
    const response = await fetch(`/api/available-slots?date=${dayISO}`);
    if (!response.ok) {
      console.error('Error fetching available slots, falling back to basic method');
      return await fetchBasicAvailability(dayISO);
    }
    
    const data = await response.json();
    return data.slots || [];
  } catch (error) {
    console.error('Error fetching available slots:', error);
    return await fetchBasicAvailability(dayISO);
  }
}

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

async function fetchAppointments(dayISO) {
  try {
    const response = await fetch(`/api/appointments/date/${dayISO}`);
    if (!response.ok) return [];
    
    const data = await response.json();
    return data.appointments?.map(apt => apt.appointment_time?.substring(0, 5)) || [];
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return [];
  }
}

// ───────── FORM SUBMISSION ─────────
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

// ───────── UTILITY FUNCTIONS ─────────
function changeWeek(direction) {
  weekOffset += direction;
  renderWeek();
}

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

function getDayOfWeekString(date) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

function formatTime(timeString) {
  const [hours, minutes] = timeString.split(':');
  const hour24 = parseInt(hours);
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  return `${hour12}:${minutes} ${ampm}`;
}

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
