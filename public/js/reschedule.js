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

// ───────── HELPER FUNCTIONS ─────────
function getAppointmentDate(appointment) {
  if (!appointment) return null;
  return appointment.appointment_date || appointment.date;
}

function getAppointmentTime(appointment) {
  if (!appointment) return null;
  return appointment.appointment_time || appointment.time;
}

function getAppointmentDateISO(appointment) {
  if (!appointment) return null;
  const dateStr = getAppointmentDate(appointment);
  if (!dateStr) return null;
  
  // If it's already an ISO string with time, extract just the date part
  if (dateStr.includes('T')) {
    return dateStr.split('T')[0];
  }
  return dateStr;
}

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
  
  // Auto-select today's date for better UX (unless it's the current appointment date)
  const today = new Date();
  const todayISO = iso(today);
  const currentAppointmentDate = currentAppointment ? getAppointmentDateISO(currentAppointment) : null;
  
  // If today isn't the current appointment date, auto-select it
  if (todayISO !== currentAppointmentDate) {
    setTimeout(() => {
      const todayBtn = document.querySelector(`[data-date="${todayISO}"]`);
      if (todayBtn && !todayBtn.disabled) {
        console.log('🔄 Auto-selecting today:', todayISO);
        selectDate(todayISO);
      }
    }, 1000);
  }
  
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
    console.log('🔄 Appointment date field:', currentAppointment.date);
    console.log('🔄 Appointment time field:', currentAppointment.time);
    
    displayCurrentAppointmentInfo();
    
  } catch (error) {
    console.error('🔄 Error loading current appointment:', error);
    showNotification('Error cargando la cita: ' + error.message, 'error');
  }
}

function displayCurrentAppointmentInfo() {
  console.log('🔄 Attempting to display appointment info');
  console.log('🔄 currentAppointment:', currentAppointment);
  console.log('🔄 currentAppointmentInfo element:', currentAppointmentInfo);
  
  if (!currentAppointment) {
    console.log('🔄 No current appointment data');
    if (currentAppointmentInfo) {
      currentAppointmentInfo.innerHTML = 'No se pudo cargar la información de la cita';
    }
    return;
  }
  
  if (!currentAppointmentInfo) {
    console.log('🔄 currentAppointmentInfo element not found');
    return;
  }
  
  try {
    // Handle different field names - the API returns 'date' and 'time', not 'appointment_date' and 'appointment_time'
    const appointmentDateStr = currentAppointment.appointment_date || currentAppointment.date;
    const appointmentTimeStr = currentAppointment.appointment_time || currentAppointment.time;
    
    console.log('🔄 Date string:', appointmentDateStr);
    console.log('🔄 Time string:', appointmentTimeStr);
    
    // Parse the date properly (handle ISO date format)
    let appointmentDate;
    let formattedTime;
    
    if (appointmentDateStr.includes('T')) {
      // ISO format with time - extract date part and use separate time
      const dateOnly = appointmentDateStr.split('T')[0];
      appointmentDate = new Date(dateOnly + 'T00:00:00');
      
      // Format time from the time field (e.g., "14:00:00" -> "14:00")  
      if (appointmentTimeStr) {
        const timeParts = appointmentTimeStr.split(':');
        const hour = parseInt(timeParts[0]);
        const minute = timeParts[1];
        
        // Convert to 12-hour format
        const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const ampm = hour >= 12 ? 'PM' : 'AM';
        formattedTime = `${hour12}:${minute} ${ampm}`;
      } else {
        formattedTime = 'Hora no disponible';
      }
    } else {
      // Date string format
      appointmentDate = new Date(appointmentDateStr + 'T' + appointmentTimeStr);
      formattedTime = appointmentDate.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    const formattedDate = appointmentDate.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    currentAppointmentInfo.innerHTML = `
      <strong>Fecha actual:</strong> ${formattedDate}<br>
      <strong>Hora actual:</strong> ${formattedTime}<br>
      <strong>Servicio:</strong> ${currentAppointment.service_type || 'Consulta General'}<br>
      <strong>Estado:</strong> ${currentAppointment.status || 'Pendiente'}
    `;
    
    console.log('🔄 Current appointment info displayed');
    console.log('🔄 Formatted time:', formattedTime);
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
      BUSINESS_HOURS = data.business_hours || [];
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
    { day_of_week: 'monday', is_open: true, open_time: '09:00', close_time: '17:00' },
    { day_of_week: 'tuesday', is_open: true, open_time: '09:00', close_time: '17:00' },
    { day_of_week: 'wednesday', is_open: true, open_time: '09:00', close_time: '17:00' },
    { day_of_week: 'thursday', is_open: true, open_time: '09:00', close_time: '17:00' },
    { day_of_week: 'friday', is_open: true, open_time: '09:00', close_time: '17:00' },
    { day_of_week: 'saturday', is_open: false, open_time: null, close_time: null },
    { day_of_week: 'sunday', is_open: false, open_time: null, close_time: null }
  ];
  BUSINESS_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
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
  
  if (!BUSINESS_HOURS || BUSINESS_HOURS.length === 0) {
    console.warn('⚠️ Business hours not loaded yet, using defaults');
    useDefaultBusinessHours();
  }

  try {
    // Create enhanced week calendar matching appointment booking style
    calendarEl.innerHTML = `
      <div class="calendar-row-wrapper mb-4">
        <button type="button" class="btn apple-btn" id="prevWeek" ${weekOffset <= 0 ? 'disabled' : ''} title="Semana anterior">
          <i class="fas fa-chevron-left"></i>
        </button>
        <div class="calendar-scroll">
          <div class="calendar-week" id="weekDays">
            <!-- Days will be inserted here -->
          </div>
        </div>
        <button type="button" class="btn apple-btn" id="nextWeek" title="Siguiente semana">
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    `;

    const weekDaysContainer = document.getElementById('weekDays');
    const startDate = startOfWeek(weekOffset);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Generate 7 days with enhanced styling
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      const dayISO = iso(day);
      
      // Get day of week name for business hours check
      const dayIndex = day.getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayOfWeek = dayNames[dayIndex];
      
      // Check if this day is open for business
      const businessDay = BUSINESS_HOURS.find(bh => bh.day_of_week === dayOfWeek);
      const isOpen = businessDay && businessDay.is_open;
      
      // Check if this is the current appointment date
      const isCurrentAppointmentDate = currentAppointment && 
        getAppointmentDateISO(currentAppointment) === dayISO;
      
      // Create enhanced day button
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn calendar-day-btn';
      btn.dataset.date = dayISO;
      
      // Enhanced content with day name and date
      const dayNameShort = day.toLocaleDateString('es-ES', { weekday: 'short' });
      const dayNumber = day.getDate();
      
      btn.innerHTML = `
        <div class="day-name">${dayNameShort}</div>
        <div class="day-number">${dayNumber}</div>
      `;

      // Style based on availability and date
      if (day < today) {
        btn.classList.add('disabled');
        btn.disabled = true;
        btn.title = 'Fecha pasada';
      } else if (!isOpen) {
        btn.classList.add('disabled');
        btn.disabled = true;
        btn.title = 'Cerrado';
      } else {
        btn.classList.add('btn-outline-primary');
        btn.title = `Seleccionar ${dayNameShort} ${dayNumber}`;
      }

      // Mark current appointment date
      if (isCurrentAppointmentDate) {
        btn.classList.add('bg-warning', 'text-dark', 'border-warning');
        btn.innerHTML += '<div class="small"><i class="fas fa-star"></i> Actual</div>';
      }

      // Mark selected day
      if (dayISO === currentDateISO) {
        btn.classList.remove('btn-outline-primary');
        btn.classList.add('selected');
      }

      if (!btn.disabled) {
        btn.addEventListener('click', () => {
          selectDate(dayISO);
        });
      }
      
      weekDaysContainer.appendChild(btn);
    }

    // Add navigation event listeners
    document.getElementById('prevWeek').addEventListener('click', () => {
      changeWeek(-1);
    });
    
    document.getElementById('nextWeek').addEventListener('click', () => {
      changeWeek(1);
    });
    
  } catch (error) {
    console.error('❌ Error rendering calendar week:', error);
    calendarEl.innerHTML = '<div class="alert alert-danger">Error loading calendar</div>';
  }
}

// ───────── WEEK NAVIGATION ─────────
function changeWeek(direction) {
  weekOffset += direction;
  renderWeek();
}

// ───────── DATE SELECTION ─────────
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
                  onclick="selectTime('${timeSlot}')"
                  ${disabled}>
            ${formatTime(timeSlot)}${warningText}
          </button>
        </div>
      `;
    });
    
    timeCardsEl.innerHTML = timeSlotsHTML;
    console.log('🔄 Time slots loaded, HTML updated:', timeSlotsHTML);
    
  } catch (error) {
    console.error('🔄 Error loading time slots:', error);
    timeCardsEl.innerHTML = '<div class="col-12"><p class="text-danger mb-0">Error cargando horarios disponibles</p></div>';
  }
}

function selectTime(timeSlot) {
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
    return data.appointments?.map(apt => {
      const timeStr = apt.appointment_time || apt.time;
      return timeStr?.substring(0, 5);
    }) || [];
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
