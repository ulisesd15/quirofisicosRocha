/**
 * Quirofísicos Rocha - Appointment Rescheduling System
 * Allows users to update their existing appointments
 * 
 * Features:
 * - Load existing appointment data
 * - Calendar integration for new date selection
 * - Time slot availability checking
 * - Appointment update and cancellation
 * - User-friendly interface with current appointment display
 */

// ───────── DOM REFERENCES ─────────
let calendarEl, timeCardsEl, rescheduleForm, selectedDateInput, selectedTimeInput;
let currentAppointmentId = null;
let currentAppointment = null;

// ───────── APPOINTMENT DATA ─────────
let BUSINESS_HOURS = [];
let BUSINESS_DAYS = [];

// ───────── CALENDAR STATE ─────────
let weekOffset = 0;
let currentDateISO = null;

// ───────── UTILITY FUNCTIONS ─────────
const iso = d => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ───────── INITIALIZATION ─────────
document.addEventListener('DOMContentLoaded', async function() {
  // Get DOM elements
  calendarEl = document.getElementById('calendar');
  timeCardsEl = document.getElementById('timeCards');
  rescheduleForm = document.getElementById('rescheduleForm');
  selectedDateInput = document.getElementById('selectedDate');
  selectedTimeInput = document.getElementById('selectedTime');

  // Check authentication
  if (!window.authManager || !window.authManager.isLoggedIn()) {
    alert('Debes iniciar sesión para reagendar una cita.');
    window.location.href = 'login.html';
    return;
  }

  // Get appointment ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  currentAppointmentId = urlParams.get('id');

  if (!currentAppointmentId) {
    alert('ID de cita no especificado.');
    window.location.href = 'mis-citas.html';
    return;
  }

  // Load appointment data and initialize
  await initializeRescheduleSystem();
});

// ───────── MAIN INITIALIZATION ─────────
async function initializeRescheduleSystem() {
  try {
    // Load appointment data
    await loadCurrentAppointment();
    
    // Load business hours
    BUSINESS_HOURS = await fetchBusinessHours();
    window.BUSINESS_HOURS = BUSINESS_HOURS;
    
    // Initialize calendar
    renderWeek();
    
    // Setup UI
    setupUI();
    
    // Show the form
    document.getElementById('loadingState').style.display = 'none';
    rescheduleForm.style.display = 'block';
    
  } catch (error) {
    console.error('Error initializing reschedule system:', error);
    showError('Error al cargar la información de la cita. Por favor, intenta de nuevo.');
    setTimeout(() => {
      window.location.href = 'mis-citas.html';
    }, 3000);
  }
}

// ───────── APPOINTMENT LOADING ─────────
async function loadCurrentAppointment() {
  try {
    const token = localStorage.getItem('user_token') || localStorage.getItem('token');
    const response = await fetch(`/api/appointments/${currentAppointmentId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Cita no encontrada');
    }

    currentAppointment = await response.json();
    displayCurrentAppointmentInfo();
    populateForm();

  } catch (error) {
    console.error('Error loading appointment:', error);
    throw new Error('No se pudo cargar la información de la cita');
  }
}

function displayCurrentAppointmentInfo() {
  const infoDiv = document.getElementById('currentAppointmentInfo');
  const detailsDiv = document.getElementById('currentAppointmentDetails');
  
  const appointmentDate = new Date(currentAppointment.date);
  const formattedDate = appointmentDate.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const formattedTime = formatTimeToAMPM(currentAppointment.time);
  
  detailsDiv.innerHTML = `
    <div class="row">
      <div class="col-md-6">
        <strong>Fecha:</strong> ${formattedDate}
      </div>
      <div class="col-md-6">
        <strong>Hora:</strong> ${formattedTime}
      </div>
    </div>
    ${currentAppointment.note ? `
      <div class="mt-2">
        <strong>Notas:</strong> ${currentAppointment.note}
      </div>
    ` : ''}
  `;
  
  infoDiv.style.display = 'block';
}

function populateForm() {
  // Set appointment ID
  document.getElementById('appointmentId').value = currentAppointmentId;
  
  // Pre-fill note if exists
  if (currentAppointment.note) {
    document.getElementById('note').value = currentAppointment.note;
  }
}

// ───────── BUSINESS HOURS FUNCTIONS ─────────
async function fetchBusinessHours() {
  try {
    const response = await fetch('/api/business-hours');
    if (!response.ok) {
      console.error('Error fetching business hours, using defaults');
      return getDefaultBusinessHours();
    }
    
    const data = await response.json();
    const businessHours = data.businessHours || data.business_hours;
    return businessHours.map(bh => ({
      ...bh,
      day_of_week: bh.day_of_week.toLowerCase(),
      open_time: bh.open_time ? bh.open_time.substring(0, 5) : null,
      close_time: bh.close_time ? bh.close_time.substring(0, 5) : null,
      break_start: bh.break_start ? bh.break_start.substring(0, 5) : null,
      break_end: bh.break_end ? bh.break_end.substring(0, 5) : null
    }));
  } catch (error) {
    console.error('Error fetching business hours:', error);
    return getDefaultBusinessHours();
  }
}

function getDefaultBusinessHours() {
  return [
    { day_of_week: 'monday', is_open: true, open_time: '09:00', close_time: '18:00', break_start: '13:00', break_end: '14:00' },
    { day_of_week: 'tuesday', is_open: true, open_time: '09:00', close_time: '18:00', break_start: '13:00', break_end: '14:00' },
    { day_of_week: 'wednesday', is_open: true, open_time: '09:00', close_time: '18:00', break_start: '13:00', break_end: '14:00' },
    { day_of_week: 'thursday', is_open: true, open_time: '09:00', close_time: '18:00', break_start: '13:00', break_end: '14:00' },
    { day_of_week: 'friday', is_open: true, open_time: '09:00', close_time: '18:00', break_start: '13:00', break_end: '14:00' },
    { day_of_week: 'saturday', is_open: false, open_time: null, close_time: null, break_start: null, break_end: null },
    { day_of_week: 'sunday', is_open: false, open_time: null, close_time: null, break_start: null, break_end: null }
  ];
}

// ───────── CALENDAR FUNCTIONS ─────────
function renderWeek() {
  if (!calendarEl) {
    console.error('Calendar element not found!');
    return;
  }
  
  if (!BUSINESS_HOURS || BUSINESS_HOURS.length === 0) {
    BUSINESS_HOURS = getDefaultBusinessHours();
  }
  
  try {
    calendarEl.innerHTML = `
      <div class="calendar-row-wrapper mb-4">
        <button type="button" class="btn" id="prevWeek" ${weekOffset <= 0 ? 'disabled' : ''} title="Semana anterior">
          <i class="fas fa-chevron-left"></i>
        </button>
        <div class="calendar-scroll">
          <div class="calendar-week" id="weekDays">
            <!-- Days will be inserted here -->
          </div>
        </div>
        <button type="button" class="btn" id="nextWeek" title="Siguiente semana">
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    `;

    const weekDaysContainer = document.getElementById('weekDays');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Generate week starting from Monday
    const startOfWeek = new Date(today);
    const daysSinceMonday = (today.getDay() + 6) % 7;
    startOfWeek.setDate(today.getDate() - daysSinceMonday + (weekOffset * 7));

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      const dayISO = iso(day);
      
      const dayOfWeek = getDayOfWeekString(day);
      const businessHour = BUSINESS_HOURS.find(bh => bh.day_of_week === dayOfWeek);
      const isOpen = businessHour ? businessHour.is_open : false;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn calendar-day-btn';
      btn.dataset.date = dayISO;
      
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

      // Mark selected day
      if (dayISO === currentDateISO) {
        btn.classList.remove('btn-outline-primary');
        btn.classList.add('selected');
      }

      if (!btn.disabled) {
        btn.addEventListener('click', () => {
          if (currentDateISO === dayISO) {
            loadTimeSlotsForDay(dayISO);
            return;
          }
          selectDay(dayISO);
        });
      }
      
      weekDaysContainer.appendChild(btn);
    }

    // Add navigation event listeners
    document.getElementById('prevWeek').addEventListener('click', () => {
      weekOffset--;
      renderWeek();
    });
    
    document.getElementById('nextWeek').addEventListener('click', () => {
      weekOffset++;
      renderWeek();
    });
    
  } catch (error) {
    console.error('Error rendering week:', error);
  }
}

function getDayOfWeekString(date) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
}

async function selectDay(dayISO) {
  console.log('Selecting day:', dayISO);
  currentDateISO = dayISO;
  selectedDateInput.value = dayISO;
  
  // Update visual selection
  updateDaySelection();
  
  // Load time slots
  await loadTimeSlotsForDay(dayISO);
}

function updateDaySelection() {
  const allDayButtons = document.querySelectorAll('.calendar-day-btn');
  allDayButtons.forEach(btn => {
    const btnDate = btn.dataset.date;
    if (btnDate === currentDateISO) {
      btn.classList.remove('btn-outline-primary');
      btn.classList.add('selected');
    } else {
      btn.classList.remove('selected');
      if (!btn.disabled) {
        btn.classList.add('btn-outline-primary');
      }
    }
  });
}

// ───────── TIME SLOT FUNCTIONS ─────────
async function loadTimeSlotsForDay(dayISO) {
  try {
    const response = await fetch(`/api/schedule/availability/${dayISO}`);
    if (!response.ok) {
      throw new Error('Error loading availability');
    }
    
    const data = await response.json();
    const slots = data.availableSlots || [];
    
    displayTimeSlots(slots, dayISO);
    
  } catch (error) {
    console.error('Error loading time slots:', error);
    timeCardsEl.innerHTML = '<div class="col-12 alert alert-danger text-center">Error cargando horarios disponibles</div>';
  }
}

function displayTimeSlots(slots, dayISO) {
  if (slots.length === 0) {
    timeCardsEl.innerHTML = '<div class="col-12 alert alert-warning text-center">No hay horarios disponibles para esta fecha</div>';
    return;
  }

  timeCardsEl.innerHTML = slots.map(slot => {
    const timeFormatted = formatTimeToAMPM(slot);
    return `
      <div class="col-6 col-md-4 col-lg-3">
        <button type="button" class="btn btn-outline-primary time-slot-btn w-100" data-time="${slot}">
          ${timeFormatted}
        </button>
      </div>
    `;
  }).join('');

  // Add click listeners to time buttons
  document.querySelectorAll('.time-slot-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove previous selection
      document.querySelectorAll('.time-slot-btn').forEach(b => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-outline-primary');
      });
      
      // Select this time
      btn.classList.remove('btn-outline-primary');
      btn.classList.add('btn-primary');
      
      selectedTimeInput.value = btn.dataset.time;
      
      // Show submit button
      const submitButton = rescheduleForm.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.style.display = 'block';
      }
    });
  });
}

function formatTimeToAMPM(timeStr) {
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
}

// ───────── UI SETUP ─────────
function setupUI() {
  // Calendar view switching
  const weekViewRadio = document.getElementById('weekView');
  const monthViewRadio = document.getElementById('monthView');
  const weekViewContainer = document.getElementById('weekViewContainer');
  const monthViewContainer = document.getElementById('monthViewContainer');
  
  if (weekViewRadio && monthViewRadio && weekViewContainer && monthViewContainer) {
    weekViewContainer.style.display = 'block';
    monthViewContainer.style.display = 'none';
    
    weekViewRadio.addEventListener('change', () => {
      if (weekViewRadio.checked) {
        weekViewContainer.style.display = 'block';
        monthViewContainer.style.display = 'none';
        renderWeek();
      }
    });
    
    monthViewRadio.addEventListener('change', () => {
      if (monthViewRadio.checked) {
        weekViewContainer.style.display = 'none';
        monthViewContainer.style.display = 'block';
        if (typeof window.renderMonthlyCalendar === 'function') {
          window.renderMonthlyCalendar();
        }
      }
    });
  }

  // Form submission
  if (rescheduleForm) {
    rescheduleForm.addEventListener('submit', handleRescheduleSubmission);
  }

  // Cancel appointment button
  const cancelBtn = document.getElementById('cancelAppointmentBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', handleAppointmentCancellation);
  }
}

// ───────── FORM HANDLERS ─────────
async function handleRescheduleSubmission(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = {
    full_name: currentAppointment.full_name,
    email: currentAppointment.email,
    phone: currentAppointment.phone,
    date: formData.get('date'),
    time: formData.get('time'),
    note: formData.get('note') || null
  };

  // Validate required fields
  if (!data.date || !data.time) {
    showError('Por favor selecciona una nueva fecha y hora');
    return;
  }

  try {
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Reagendando...';
    submitButton.disabled = true;

    const token = localStorage.getItem('user_token') || localStorage.getItem('token');
    const response = await fetch(`/api/appointments/${currentAppointmentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error de conexión' }));
      throw new Error(errorData.error || 'Error al reagendar la cita');
    }

    const result = await response.json();
    showSuccess('Cita reagendada exitosamente');
    
    // Redirect after a short delay
    setTimeout(() => {
      window.location.href = 'mis-citas.html';
    }, 2000);

  } catch (error) {
    console.error('Error rescheduling appointment:', error);
    showError('Error al reagendar la cita: ' + error.message);
  } finally {
    const submitButton = rescheduleForm.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.innerHTML = '<i class="fas fa-calendar-check me-2"></i>Reagendar Cita';
      submitButton.disabled = false;
    }
  }
}

async function handleAppointmentCancellation() {
  if (!confirm('¿Estás seguro de que deseas cancelar esta cita? Esta acción no se puede deshacer.')) {
    return;
  }

  try {
    const token = localStorage.getItem('user_token') || localStorage.getItem('token');
    const response = await fetch(`/api/appointments/${currentAppointmentId}/cancel`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Error al cancelar la cita');
    }

    showSuccess('Cita cancelada exitosamente');
    
    // Redirect after a short delay
    setTimeout(() => {
      window.location.href = 'mis-citas.html';
    }, 2000);

  } catch (error) {
    console.error('Error cancelling appointment:', error);
    showError('Error al cancelar la cita: ' + error.message);
  }
}

// ───────── MESSAGE FUNCTIONS ─────────
function showSuccess(message) {
  showMessage(message, 'success');
}

function showError(message) {
  showMessage(message, 'error');
}

function showMessage(message, type) {
  // Remove existing messages
  const existingMessages = document.querySelectorAll('.alert-message');
  existingMessages.forEach(msg => msg.remove());

  const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
  const iconClass = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-triangle';

  const messageDiv = document.createElement('div');
  messageDiv.className = `alert ${alertClass} alert-message alert-dismissible fade show position-fixed`;
  messageDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
  messageDiv.innerHTML = `
    <i class="${iconClass} me-2"></i>${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;

  document.body.appendChild(messageDiv);

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.remove();
    }
  }, 5000);
}
