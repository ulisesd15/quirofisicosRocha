/**
 * Quirofísicos Rocha - Appointment Booking System
 * Main appointment calendar with dual view support (week/month)
 * 
 * Features:
 * - Responsive 7-day week view calendar
 * - Business hours integration with admin panel
 * - AM/PM time format for user-friendly display
 * - Timezone-safe date handling
 * - Guest and registered user booking support
 * - Real-time availability checking
 */

// ───────── DOM REFERENCES ─────────
let calendarEl, timeCardsEl, bookingForm, guestFields, menuToggle, navItems, selectedDateInput, selectedTimeInput;

const token = localStorage.getItem('token');

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
// Note: periodOf function is defined in enhanced-calendar.js

// ───────── USER LOGIC ─────────
// Legacy variables - keeping for compatibility
const userId = localStorage.getItem('user_id');
let currentUser = null;
let userDataArray = [];
let weekOffset = 0, currentDateISO = null;

// Note: User data is now managed by AuthManager in auth.js
// The above variables are kept for backward compatibility only

// ───────── ENHANCED AVAILABILITY FETCH ─────────
async function fetchAvailableSlots(dayISO) {
  try {
    // Use the public endpoint that considers all admin restrictions
    const response = await fetch(`/api/available-slots/${dayISO}`);
    if (!response.ok) {
      console.error('Error fetching available slots, falling back to basic method');
      return await fetchBasicAvailability(dayISO);
    }
    
    const data = await response.json();
    return data.availableSlots || [];
  } catch (error) {
    console.error('Error fetching available slots:', error);
    return await fetchBasicAvailability(dayISO);
  }
}

async function fetchBasicAvailability(dayISO) {
  // Fallback method using business hours and existing appointments
  const selectedDate = new Date(dayISO);
  const dayOfWeek = getDayOfWeekString(selectedDate);
  
  // Check if the selected day is open for business
  const businessDay = BUSINESS_HOURS.find(bh => bh.day_of_week === dayOfWeek);
  
  if (!businessDay || !businessDay.is_open) {
    return [];
  }

  // Generate available time slots based on business hours
  const allSlots = generateTimeSlots(businessDay.open_time, businessDay.close_time);
  
  // Get already taken appointments
  const taken = await fetchAppointments(dayISO);
  const available = allSlots.filter(t => !taken.includes(t));
  
  return available;
}

// ───────── BUSINESS HOURS FETCH ─────────
async function fetchBusinessHours() {
  try {
    // Fetch business hours from API
    const response = await fetch('/api/business-hours');
    if (!response.ok) {
      console.error('Error fetching business hours, using defaults');
      return getDefaultBusinessHours();
    }
    
    const data = await response.json();
    // Process business hours data
    
    // Convert day_of_week to lowercase and normalize time format
    const businessHours = data.businessHours.map(bh => ({
      ...bh,
      day_of_week: bh.day_of_week.toLowerCase(),
      open_time: bh.open_time ? bh.open_time.substring(0, 5) : null, // Convert "09:00:00" to "09:00"
      close_time: bh.close_time ? bh.close_time.substring(0, 5) : null, // Convert "18:00:00" to "18:00"
      break_start: bh.break_start ? bh.break_start.substring(0, 5) : null,
      break_end: bh.break_end ? bh.break_end.substring(0, 5) : null
    }));
    
    // Business hours loaded successfully
    return businessHours || getDefaultBusinessHours();
  } catch (error) {
    console.error('Error fetching business hours:', error);
    return getDefaultBusinessHours();
  }
}

function getDefaultBusinessHours() {
  // Default business hours fallback
  return [
    { day_of_week: 'monday', is_open: true, open_time: '09:00', close_time: '18:00' },
    { day_of_week: 'tuesday', is_open: true, open_time: '09:00', close_time: '18:00' },
    { day_of_week: 'wednesday', is_open: true, open_time: '09:00', close_time: '18:00' },
    { day_of_week: 'thursday', is_open: true, open_time: '09:00', close_time: '18:00' },
    { day_of_week: 'friday', is_open: true, open_time: '09:00', close_time: '18:00' },
    { day_of_week: 'saturday', is_open: false, open_time: '09:00', close_time: '18:00' },
    { day_of_week: 'sunday', is_open: false, open_time: '09:00', close_time: '18:00' }
  ];
}

function generateTimeSlots(openTime, closeTime) {
  const slots = [];
  const [openHour, openMin] = openTime.split(':').map(Number);
  const [closeHour, closeMin] = closeTime.split(':').map(Number);
  
  let currentHour = openHour;
  let currentMin = openMin;
  
  while (currentHour < closeHour || (currentHour === closeHour && currentMin < closeMin)) {
    const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
    slots.push(timeStr);
    
    // Add 30 minutes
    currentMin += 30;
    if (currentMin >= 60) {
      currentMin = 0;
      currentHour++;
    }
  }
  
  return slots;
}

function getDayOfWeekString(date) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
}

// Note: formatTimeToAMPM function is defined in enhanced-calendar.js

// ───────── APPOINTMENTS FETCH ─────────
async function fetchAppointments(dayISO) {
  const res = await fetch(`/api/appointments/date/${dayISO}`);

  if (!res.ok) {
    console.error('Error fetching appointments:', await res.text());
    return [];
  }

  const appointments = await res.json();
  return appointments.map(a => a.time);
}

function renderWeek() {
  
  if (!calendarEl) {
    console.error('❌ Calendar element not found!');
    return;
  }
  
  if (!BUSINESS_HOURS || BUSINESS_HOURS.length === 0) {
    console.warn('⚠️ Business hours not loaded yet, using defaults');
    BUSINESS_HOURS = getDefaultBusinessHours();
  }
  
  try {
    // Create enhanced week calendar with improved navigation and styling
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
    const startDate = startOfWeek(weekOffset);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    
    // Generate 7 days with enhanced styling
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      const dayISO = iso(day);
      
      // Get day of week name (0=Sunday, 1=Monday, etc.)
      const dayIndex = day.getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayOfWeek = dayNames[dayIndex];
      
      // Check if this day is open for business
      const businessDay = BUSINESS_HOURS.find(bh => bh.day_of_week === dayOfWeek);
      const isOpen = businessDay && businessDay.is_open;
      
      // Create enhanced day button
      const btn = document.createElement('button');
      btn.type = 'button'; // Prevent form submission
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

      // Mark selected day
      if (dayISO === currentDateISO) {
        btn.classList.remove('btn-outline-primary');
        btn.classList.add('selected');
      }

      if (!btn.disabled) {
        btn.addEventListener('click', () => {
          console.log('Calendar day clicked:', dayISO, 'Currently selected:', currentDateISO);
          
          // If this day is already selected, load time slots
          if (currentDateISO === dayISO) {
            console.log('Same day clicked - loading time slots');
            loadTimeSlotsForDay(dayISO);
            return;
          }
          
          // Select the new day and immediately load time slots
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
    console.error('❌ Error rendering calendar week:', error);
    calendarEl.innerHTML = '<div class="alert alert-danger">Error loading calendar</div>';
  }
}

async function selectDay(dayISO) {
  console.log('Selecting day:', dayISO, 'Current selected:', currentDateISO);
  
  // If the same day is already selected, don't make another call
  if (currentDateISO === dayISO) {
    console.log('Day already selected, skipping selection');
    return;
  }
  
  // Clear previous time selection when changing days
  selectedTimeInput.value = '';
  currentDateISO = dayISO;
  selectedDateInput.value = dayISO;

  // Update only the visual styling without re-rendering the entire calendar
  updateDaySelection();

  // Automatically load time slots for the selected day
  await loadTimeSlotsForDay(dayISO);
}

// Function to update day selection styling without re-rendering
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

// Function to load time slots for a selected day
async function loadTimeSlotsForDay(dayISO) {
  
  // Parse the date and get day info
  const selectedDate = new Date(dayISO);
  const dayOfWeek = getDayOfWeekString(selectedDate);
  
  // Show loading message
  timeCardsEl.innerHTML = '<div class="col-12 text-center"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></div>';

  try {
    // Use the enhanced availability check that considers admin restrictions
    const availableSlots = await fetchAvailableSlots(dayISO);
    console.log('Available slots for', dayISO, ':', availableSlots);

    if (availableSlots.length === 0) {
      const businessDay = BUSINESS_HOURS.find(bh => bh.day_of_week === dayOfWeek);
      
      let message = 'Sin horarios disponibles para este día';
      if (!businessDay || !businessDay.is_open) {
        message = 'Este día estamos cerrados';
      }
      
      timeCardsEl.replaceChildren(
        Object.assign(document.createElement('div'), {
          className: 'col-12 alert alert-warning text-center',
          textContent: message
        })
      );
      const submitButton = bookingForm.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.style.display = 'none';
      }
      return;
    }

    const sections = { manana: [], tarde: [], noche: [] };

    availableSlots.forEach(time => {
      const btn = Object.assign(document.createElement('button'), {
        type: 'button',
        className: 'btn time-slot-btn',
        textContent: formatTimeToAMPM(time) // Display in AM/PM format
      });

      // Store the 24-hour format as data attribute for form submission
      btn.dataset.time24 = time;

      btn.addEventListener('click', () => {
        console.log('Time slot selected:', time);
        timeCardsEl.querySelectorAll('.time-slot-btn').forEach(b => {
          b.classList.remove('active');
        });
        btn.classList.add('active');
        selectedTimeInput.value = time; // Store 24-hour format for backend
        
        // Show submit button when time is selected
        const submitButton = bookingForm.querySelector('button[type="submit"]');
        if (submitButton) {
          submitButton.style.display = 'block';
        }
      });

      const col = Object.assign(document.createElement('div'), { 
        className: 'col-6 col-md-4 col-lg-3 mb-2' 
      });
      col.appendChild(btn);
      sections[periodOf(time)].push(col);
    });

    const makeBlock = (label, nodeList) => {
      if (nodeList.length === 0) return document.createDocumentFragment();
      
      // Spanish period labels
      const periodLabels = {
        'manana': 'Mañana',
        'tarde': 'Tarde', 
        'noche': 'Noche'
      };
      
      const frag = document.createDocumentFragment();
      frag.append(
        Object.assign(document.createElement('h6'), { 
          textContent: periodLabels[label] || label.charAt(0).toUpperCase() + label.slice(1),
          className: 'time-period-header'
        }),
        Object.assign(document.createElement('div'), { className: 'row g-2' })
      );
      const row = frag.querySelector('.row');
      nodeList.forEach(col => row.appendChild(col));
      return frag;
    };

    const wrapper = document.createDocumentFragment();
    wrapper.append(
      makeBlock('mañana', sections.manana),
      makeBlock('tarde', sections.tarde),
      makeBlock('noche', sections.noche)
    );

    timeCardsEl.replaceChildren(wrapper);
    const submitButton = bookingForm.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.style.display = 'none'; // Hide until time is selected
    }
    
    console.log('Time slots rendered successfully');
  } catch (error) {
    console.error('Error loading time slots:', error);
    timeCardsEl.innerHTML = '<div class="col-12 alert alert-danger text-center">Error cargando horarios disponibles</div>';
    const submitButton = bookingForm.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.style.display = 'none';
    }
  }
}

// Show booking success/error messages to the user
function showBookingMessage(message, type) {
  // Remove any existing messages
  const existingMessage = document.querySelector('.booking-message');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  // Create message element
  const messageDiv = document.createElement('div');
  messageDiv.className = `alert alert-${type === 'success' ? 'success' : 'danger'} booking-message`;
  messageDiv.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  // Insert message at the top of the form
  bookingForm.insertBefore(messageDiv, bookingForm.firstChild);
  
  // Auto-dismiss success messages after 5 seconds
  if (type === 'success') {
    setTimeout(() => {
      if (messageDiv && messageDiv.parentNode) {
        messageDiv.remove();
      }
    }, 5000);
  }
  
  // Scroll to message
  messageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function setupUI() {
  const offcanvas = document.getElementById('sideNav');
  if (offcanvas) {
    offcanvas.addEventListener('show.bs.offcanvas', () => {
      if (menuToggle) menuToggle.style.display = 'none';
    });
    offcanvas.addEventListener('hidden.bs.offcanvas', () => {
      if (menuToggle) menuToggle.style.display = 'block';
    });
  }

  if (!navItems) {
    return;
  }
  
  const isLoggedIn = window.authManager && window.authManager.isLoggedIn();
  
  navItems.innerHTML = isLoggedIn
    ? `<li><a href="/index.html" class="btn btn-outline-secondary w-100 mb-2">Inicio</a></li>
       <li><a href="#" id="logoutBtn" class="btn btn-danger w-100 mb-2">Cerrar Sesión</a></li>`
    : `<li><a href="/index.html" class="btn btn-outline-secondary w-100 mb-2">Inicio</a></li>
       <li><a href="/login.html" class="btn btn-outline-success w-100 mb-2">Iniciar Sesión</a></li>
       <li><a href="/register.html" class="btn btn-outline-secondary w-100 mb-2">Crear Cuenta</a></li>`;

  const logoutBtn = document.getElementById('logoutBtn');
  logoutBtn?.addEventListener('click', () => {
    if (window.authManager) {
      window.authManager.logout();
    } else {
      // Fallback
      localStorage.removeItem('user_id');
      localStorage.removeItem('token');
      localStorage.removeItem('user_token');
    }
    window.location.href = '/index.html';
  });
}

// ───────── INITIALIZATION ─────────
async function initializeAppointmentSystem() {
  try {
    // Check for reschedule parameter and redirect to new reschedule page
    const urlParams = new URLSearchParams(window.location.search);
    const rescheduleId = urlParams.get('reschedule');
    if (rescheduleId) {
      console.log('Reschedule request detected, redirecting to new reschedule page');
      window.location.href = `reschedule.html?id=${rescheduleId}`;
      return;
    }
    
    // Set up guest fields based on user login status
    const isLoggedIn = window.authManager && window.authManager.isLoggedIn();
    
    if (guestFields) {
      const nameInput = guestFields.querySelector('[name="name"]');
      const emailInput = guestFields.querySelector('[name="email"]');
      const phoneInput = guestFields.querySelector('[name="phone"]');

      if (!isLoggedIn) {
        console.log('User not logged in - showing guest fields');
        guestFields.style.display = 'block';
        if (nameInput) nameInput.required = true;
        if (emailInput) emailInput.required = true;
        if (phoneInput) phoneInput.required = true;
      } else {
        console.log('User logged in - hiding guest fields');
        guestFields.style.display = 'none';
        if (nameInput) nameInput.required = false;
        if (emailInput) emailInput.required = false;
        if (phoneInput) phoneInput.required = false;
      }
    }
    
    // Load business hours from admin panel
    BUSINESS_HOURS = await fetchBusinessHours();
    
    // Make business hours available globally for other calendar components
    window.BUSINESS_HOURS = BUSINESS_HOURS;
    
    BUSINESS_HOURS.forEach(bh => {
      console.log(`  ${bh.day_of_week}: ${bh.is_open ? 'OPEN' : 'CLOSED'} (${bh.open_time} - ${bh.close_time})`);
    });
    
    // Initialize calendar only after business hours are loaded
    renderWeek();
    
    // Set up UI
    setupUI();
    
  } catch (error) {
    console.error('❌ Error initializing appointment system:', error);
    // Fallback to default business hours
    BUSINESS_HOURS = getDefaultBusinessHours();
    renderWeek();
    if (typeof setupUI === 'function') setupUI();
  }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  
  // Initialize DOM references
  calendarEl = document.getElementById('calendar');
  timeCardsEl = document.getElementById('timeCards');
  bookingForm = document.getElementById('bookingForm');
  guestFields = document.getElementById('guestFields');
  menuToggle = document.getElementById('menu_toggle');
  navItems = document.getElementById('nav-items');
  selectedDateInput = document.getElementById('selectedDate');
  selectedTimeInput = document.getElementById('selectedTime');
  
  // Check if required elements exist
  const requiredElements = {
    calendarEl,
    timeCardsEl,
    bookingForm,
    selectedDateInput,
    selectedTimeInput
  };
  
  console.log('📄 All IDs on page:', 
    Array.from(document.querySelectorAll('[id]')).map(el => el.id)
  );
  
  // Check if any required elements are missing
  const missingElements = Object.entries(requiredElements)
    .filter(([name, element]) => !element)
    .map(([name]) => name);
    
  if (missingElements.length > 0) {
    console.error('❌ Missing required elements:', missingElements);
    // Try to find elements with different selectors
    console.log('Calendar alternatives:', document.querySelector('#calendar, .calendar, [class*="calendar"]'));
    return;
  }
  
  initializeAppointmentSystem();
  
  // Add calendar view switching functionality
  const weekViewRadio = document.getElementById('weekView');
  const monthViewRadio = document.getElementById('monthView');
  const weekViewContainer = document.getElementById('weekViewContainer');
  const monthViewContainer = document.getElementById('monthViewContainer');
  
  if (weekViewRadio && monthViewRadio && weekViewContainer && monthViewContainer) {
    // Set initial state - week view visible by default
    weekViewContainer.style.display = 'block';
    monthViewContainer.style.display = 'none';
    
    // Handle week view selection
    weekViewRadio.addEventListener('change', () => {
      if (weekViewRadio.checked) {
        weekViewContainer.style.display = 'block';
        monthViewContainer.style.display = 'none';
        
        // Clear any previous selections
        document.getElementById('selectedDate').value = '';
        document.getElementById('selectedTime').value = '';
        document.getElementById('timeCards').innerHTML = '';
        
        // Re-render week calendar
        renderWeek();
      }
    });
    
    // Handle month view selection
    monthViewRadio.addEventListener('change', () => {
      console.log('📅 Month view radio button changed, checked:', monthViewRadio.checked);
      if (monthViewRadio.checked) {
        console.log('🔄 Switching to month view...');
        weekViewContainer.style.display = 'none';
        monthViewContainer.style.display = 'block';
        
        // Clear any previous selections
        document.getElementById('selectedDate').value = '';
        document.getElementById('selectedTime').value = '';
        document.getElementById('timeCards').innerHTML = '';
        
        // Render month calendar if the function is available
        console.log('🔍 Checking renderMonthlyCalendar function:', typeof window.renderMonthlyCalendar);
        if (typeof window.renderMonthlyCalendar === 'function') {
          console.log('✅ Calling window.renderMonthlyCalendar()...');
          window.renderMonthlyCalendar();
        } else {
          console.error('❌ window.renderMonthlyCalendar function not available');
        }
      }
    });
  }
  
  // Add form submission handler
  if (bookingForm) {
    bookingForm.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      
      // Get user data from auth manager if logged in
      const isLoggedIn = window.authManager && window.authManager.isLoggedIn();
      const userData = isLoggedIn ? window.authManager.getUserData() : null;
      
      const data = {
        full_name: userData?.name || fd.get('name') || '',
        email: userData?.email || fd.get('email') || '',
        phone: userData?.phone || fd.get('phone') || '',
        date: fd.get('date'),
        time: fd.get('time'),
        note: fd.get('note') || null,
        user_id: userData?.id || userId || null
      };

      // Validate required fields
      if (!data.full_name || !data.email || !data.date || !data.time) {
        showBookingMessage('Por favor completa todos los campos requeridos', 'error');
        return;
      }

      try {
        // Show loading state
        const submitButton = bookingForm.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Agendando...';
        submitButton.disabled = true;

        // Prepare headers - only include Authorization if user is logged in
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch('/api/appointments', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(data)
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Error de conexión' }));
          showBookingMessage(errorData.message || errorData.error || 'Error al agendar la cita', 'error');
          return;
        }

        const result = await res.json();
        
        // Show success message
        showBookingMessage(result.message || 'Cita agendada correctamente', 'success');
        
        // Reset form and UI
        e.target.reset();
        selectedDateInput.value = '';
        selectedTimeInput.value = '';
        currentDateISO = null;
        
        // Clear selected time slots and hide form
        timeCardsEl.innerHTML = '<p class="text-muted">Selecciona una fecha para ver horarios disponibles</p>';
        
        // Hide submit button and reset form display
        submitButton.style.display = 'none';
        
        // Refresh the calendar to show updated availability
        renderWeek();
        
        // If monthly calendar is active, refresh it too
        if (document.getElementById('monthView').checked) {
          const enhancedCalendar = document.getElementById('monthlyCalendar');
          if (enhancedCalendar && enhancedCalendar.innerHTML.trim()) {
            // Re-render monthly calendar to update availability
            window.renderMonthlyCalendar && window.renderMonthlyCalendar();
          }
        }
        
      } catch (err) {
        console.error('Error booking appointment:', err);
        showBookingMessage('Error de conexión. Por favor intenta nuevamente.', 'error');
      } finally {
        // Restore button state
        const submitButton = bookingForm.querySelector('button[type="submit"]');
        if (submitButton) {
          submitButton.innerHTML = originalText;
          submitButton.disabled = false;
        }
      }
    });
  }
  
  // Add resize handler
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      console.log('🔄 Window resized, re-rendering calendar');
      renderWeek();
    }, 200);
  });
});
