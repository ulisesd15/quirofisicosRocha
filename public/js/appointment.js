// appointment.js

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
    
    // Convert day_of_week to lowercase for consistency
    const businessHours = data.business_hours.map(bh => ({
      ...bh,
      day_of_week: bh.day_of_week.toLowerCase()
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
  // --- Week navigation state ---
  if (typeof window._WEEK_VIEW_OFFSET === 'undefined') window._WEEK_VIEW_OFFSET = 0;
  let weekViewOffset = window._WEEK_VIEW_OFFSET;

  // Helper: get Monday of week, offset by weekViewOffset
  const getMondayOfWeek = (date, offset = 0) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1 - day); // Monday as start
    d.setDate(d.getDate() + diff + offset * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  };
  // Helper: check if a day is fully booked
  async function isFullyBooked(dayISO) {
    const available = await fetchAvailableSlots(dayISO);
    return available.length === 0;
  }
  // Helper: find if week has any available day
  async function weekHasAvailable(monday) {
    for (let d = 0; d < 7; d++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + d);
      const dayISO = iso(day);
      const dayOfWeek = getDayOfWeekString(day);
      const businessDay = BUSINESS_HOURS.find(bh => bh.day_of_week === dayOfWeek);
      if (!businessDay || !businessDay.is_open) continue;
      if (!(await isFullyBooked(dayISO))) return true;
    }
    return false;
  }
  // --- Main rendering logic ---
  (async () => {
    let weekStart = getMondayOfWeek(new Date(), weekViewOffset);
    // If this week is fully closed/booked, skip to next available week
    let maxWeeks = 12, checked = 0;
    while (!(await weekHasAvailable(weekStart)) && checked < maxWeeks) {
      weekViewOffset++;
      weekStart = getMondayOfWeek(new Date(), weekViewOffset);
      checked++;
    }
    window._WEEK_VIEW_OFFSET = weekViewOffset;
    // Build meta for 7 days
    let daysMeta = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + d);
      const dayISO = iso(day);
      const dayOfWeek = getDayOfWeekString(day);
      const businessDay = BUSINESS_HOURS.find(bh => bh.day_of_week === dayOfWeek);
      let closed = !businessDay || !businessDay.is_open;
      let fullyBooked = false;
      if (!closed) fullyBooked = await isFullyBooked(dayISO);
      daysMeta.push({ day, dayISO, dayOfWeek, closed, fullyBooked });
    }
    // --- Render 9 cards: < prev | 7 days | next > ---
    const todayISO = iso(new Date());
    const weekRow = document.createElement('div');
    weekRow.className = 'd-flex justify-content-center align-items-center gap-2';

    // Prev arrow
    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'btn btn-light week-arrow';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.title = 'Semana anterior';
    prevBtn.disabled = weekViewOffset <= 0;
    prevBtn.onclick = () => {
      window._WEEK_VIEW_OFFSET = Math.max(0, weekViewOffset - 1);
      renderWeek();
    };
    weekRow.appendChild(prevBtn);

    // 7 day cards
    daysMeta.forEach(({ day, dayISO, closed, fullyBooked, dayOfWeek }) => {
      // Card wrapper
      const card = document.createElement('div');
      card.className = 'd-flex flex-column align-items-center';
      // Button for date and day
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn calendar-day-btn d-flex flex-column align-items-center py-2';
      btn.dataset.date = dayISO;
      // Day of week abbreviation (short, Spanish)
      const dayLabel = document.createElement('span');
      dayLabel.className = 'small fw-bold';
      dayLabel.textContent = day.toLocaleDateString('es-MX', { weekday: 'short' });
      // Date MM/DD
      const dateLabel = document.createElement('span');
      dateLabel.textContent = `${String(day.getMonth() + 1).padStart(2, '0')}/${String(day.getDate()).padStart(2, '0')}`;
      btn.appendChild(dayLabel);
      btn.appendChild(dateLabel);
      if (dayISO === todayISO) btn.classList.add('today');
      if (closed) {
        btn.classList.add('btn-secondary');
        btn.disabled = true;
        btn.title = 'Cerrado';
      } else if (fullyBooked) {
        btn.classList.add('btn-outline-secondary');
        btn.disabled = true;
        btn.title = 'Sin horarios disponibles';
      } else {
        btn.classList.add('btn-outline-primary');
        btn.addEventListener('click', () => selectDay(dayISO));
      }
      if (currentDateISO === dayISO) btn.classList.add('selected');
      // Assemble card
      card.appendChild(btn);
      weekRow.appendChild(card);
    });

    // Next arrow
    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'btn btn-light week-arrow';
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.title = 'Semana siguiente';
    nextBtn.onclick = () => {
      window._WEEK_VIEW_OFFSET = weekViewOffset + 1;
      renderWeek();
    };
    weekRow.appendChild(nextBtn);

    calendarEl.innerHTML = '';
    calendarEl.appendChild(weekRow);
  })().catch(error => {
    console.error('Error rendering week:', error);
    calendarEl.innerHTML = '<div class="alert alert-danger text-center">Error al cargar el calendario semanal</div>';
  });
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

      // Validate appointment time is at least 30 minutes in advance
      const appointmentDateTime = new Date(`${data.date}T${data.time}:00`);
      const now = new Date();
      const thirtyMinutesFromNow = new Date(now.getTime() + (30 * 60 * 1000));

      if (appointmentDateTime < thirtyMinutesFromNow) {
        showBookingMessage('Las citas deben agendarse con al menos 30 minutos de anticipación', 'error');
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
