
// Move these variables outside the class definition
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedDate = null;
let businessHours = [];
let scheduleExceptions = [];
let availabilityCache = new Map();

// Helper functions
const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const dayNames = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
const fullDayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

// Convert 24-hour time to 12-hour AM/PM format
const formatTimeToAMPM = (time24) => {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Determine time period for grouping (using same logic as weekly calendar)
const periodOf = (time) => {
  const [h] = time.split(':').map(Number);
  return h < 12 ? 'manana' : h < 17 ? 'tarde' : 'noche';
};

const isToday = (date) => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

const isPastDate = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  
  return compareDate < today;
};

// Fetch business hours for a specific date (supports effective date logic)
async function fetchBusinessHours(date = null) {
  try {
    const dateParam = date ? `?date=${formatDate(date)}` : '';
    const response = await fetch(`/api/business-hours${dateParam}`);
    if (!response.ok) throw new Error('Failed to fetch business hours');
    const data = await response.json();
    const processedBusinessHours = (data.business_hours || data).map(bh => ({
      ...bh,
      day_of_week: bh.day_of_week.toLowerCase()
    }));
    businessHours = processedBusinessHours || getDefaultBusinessHours();
    return businessHours;
  } catch (error) {
    businessHours = getDefaultBusinessHours();
    return businessHours;
  }
}

// Fetch schedule exceptions
async function fetchScheduleExceptions() {
  try {
    console.log('📞 Monthly calendar fetching schedule exceptions...');
    const response = await fetch('/api/schedule-exceptions');
    if (!response.ok) throw new Error('Failed to fetch schedule exceptions');
    
    const data = await response.json();
    console.log('📊 Monthly calendar schedule exceptions data:', data);
    
    // Update the global scheduleExceptions variable
    scheduleExceptions = data || [];
    console.log('✅ Monthly calendar processed schedule exceptions:', scheduleExceptions);
    return scheduleExceptions;
  } catch (error) {
    console.error('❌ Error fetching schedule exceptions:', error);
    scheduleExceptions = [];
    return scheduleExceptions;
  }
}

function getDefaultBusinessHours() {
  return [
    { day_of_week: 'monday', is_open: true },
    { day_of_week: 'tuesday', is_open: true },
    { day_of_week: 'wednesday', is_open: true },
    { day_of_week: 'thursday', is_open: true },
    { day_of_week: 'friday', is_open: true },
    { day_of_week: 'saturday', is_open: false },
    { day_of_week: 'sunday', is_open: false }
  ];
}

// Check if a day is open for business, considering exceptions and holidays first
function isDayOpen(date) {
  const dateStr = formatDate(date);
  const exception = getScheduleException(dateStr);
  if (exception) {
    if (exception.is_closed) return false;
    if (exception.custom_open_time && exception.custom_close_time) return true;
  }
  if (!businessHours || businessHours.length === 0) return false;
  const dayOfWeek = fullDayNames[date.getDay()];
  const businessDay = businessHours.find(bh => bh.day_of_week === dayOfWeek);
  if (!businessDay) return false;
  if (!businessDay.is_open || businessDay.is_open === 0) return false;
  return true;
}

// Get schedule exception for a specific date
function getScheduleException(dateStr) {
  if (!scheduleExceptions || scheduleExceptions.length === 0) {
    return null;
  }
  
  const date = new Date(dateStr);
  
  for (const exception of scheduleExceptions) {
    // Check if this exception applies to the given date
    if (exception.exception_type === 'single_day') {
      if (exception.start_date === dateStr) {
        return exception;
      }
      // Check yearly recurrence
      if (exception.recurring_type === 'yearly') {
        const exceptionDate = new Date(exception.start_date);
        if (exceptionDate.getMonth() === date.getMonth() && 
            exceptionDate.getDate() === date.getDate()) {
          return exception;
        }
      }
    } else if (exception.exception_type === 'date_range') {
      if (dateStr >= exception.start_date && dateStr <= exception.end_date) {
        return exception;
      }
      // Check yearly recurrence for date ranges
      if (exception.recurring_type === 'yearly') {
        const startDate = new Date(exception.start_date);
        const endDate = new Date(exception.end_date);
        const currentYear = date.getFullYear();
        
        const yearlyStart = new Date(currentYear, startDate.getMonth(), startDate.getDate());
        const yearlyEnd = new Date(currentYear, endDate.getMonth(), endDate.getDate());
        
        if (date >= yearlyStart && date <= yearlyEnd) {
          return exception;
        }
      }
    }
  }
  
  return null;
  return true;
}

// Check availability for a specific date
async function checkDateAvailability(date) {
  const dateStr = formatDate(date);
  
  // Check cache first
  if (availabilityCache.has(dateStr)) {
    return availabilityCache.get(dateStr);
  }
  
  try {
    console.log(`🔍 Checking availability for ${dateStr}...`);
    const response = await fetch(`/api/available-slots/${dateStr}`);
    console.log(`📡 API response for ${dateStr}:`, response.status, response.ok);
    
    if (!response.ok) throw new Error('Failed to fetch availability');
    
    const data = await response.json();
    console.log(`📊 Data received for ${dateStr}:`, data);
    const hasSlots = data.availableSlots && data.availableSlots.length > 0;
    console.log(`✅ Has slots for ${dateStr}:`, hasSlots, `(${data.availableSlots?.length || 0} slots)`);
    
    // Cache the result
    availabilityCache.set(dateStr, hasSlots);
    return hasSlots;
  } catch (error) {
    console.error(`❌ Error checking availability for ${dateStr}:`, error);
    return false;
  }
}

// Find next available date
async function findNextAvailableDate(fromDate = new Date()) {
  const maxDaysToCheck = 90; // Check up to 3 months ahead
  let checkDate = new Date(fromDate);
  
  for (let i = 0; i < maxDaysToCheck; i++) {
    if (!isPastDate(checkDate) && isDayOpen(checkDate)) {
      const hasAvailability = await checkDateAvailability(checkDate);
      if (hasAvailability) {
        return new Date(checkDate);
      }
    }
    checkDate.setDate(checkDate.getDate() + 1);
  }
  
  return null; // No availability found in the next 90 days
}

// Render the monthly calendar with auto-advance if no available slots
async function renderMonthlyCalendar() {
  const calendarContainer = document.getElementById('monthlyCalendar');
  if (!calendarContainer) return;
  // Always fetch business hours for the first day of the month (to support effective date logic)
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  await fetchBusinessHours(firstDayOfMonth);
  // Also fetch schedule exceptions for the month
  await fetchScheduleExceptions();
  // Clear previous content
  calendarContainer.innerHTML = '';
  const calendar = document.createElement('div');
  calendar.className = 'calendar-container';
  const header = document.createElement('div');
  header.className = 'calendar-header';
  header.innerHTML = `
    <button type="button" class="calendar-nav-btn" id="prevMonth">
      <i class="fas fa-chevron-left"></i>
    </button>
    <div class="calendar-month-year">
      ${monthNames[currentMonth]} ${currentYear}
    </div>
    <button type="button" class="calendar-nav-btn" id="nextMonth">
      <i class="fas fa-chevron-right"></i>
    </button>
  `;
  const grid = document.createElement('div');
  grid.className = 'calendar-grid';
  dayNames.forEach(day => {
    const dayHeader = document.createElement('div');
    dayHeader.className = 'calendar-day-header';
    dayHeader.textContent = day;
    grid.appendChild(dayHeader);
  });
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());
  let currentCalendarDate = new Date(startDate);
  for (let week = 0; week < 6; week++) {
    for (let day = 0; day < 7; day++) {
      const dayElement = document.createElement('button');
      dayElement.type = 'button';
      dayElement.className = 'calendar-day';
      dayElement.textContent = currentCalendarDate.getDate();
      const isCurrentMonth = currentCalendarDate.getMonth() === currentMonth;
      const isCurrentYear = currentCalendarDate.getFullYear() === currentYear;
      const isPast = isPastDate(currentCalendarDate);
      const isOpenDay = isDayOpen(currentCalendarDate);
      const isTodayDate = isToday(currentCalendarDate);
      const isSelectedDate = selectedDate && currentCalendarDate.toDateString() === selectedDate.toDateString();
      if (isTodayDate && !isSelectedDate) dayElement.classList.add('today');
      if (isSelectedDate) dayElement.classList.add('selected');
      if (!isCurrentMonth || !isCurrentYear) {
        dayElement.classList.add('other-month');
      } else if (isPast) {
        dayElement.classList.add('disabled');
      } else if (!isOpenDay) {
        dayElement.classList.add('unavailable');
      } else {
        dayElement.classList.add('available');
        // Check availability asynchronously
        const dateToCheck = new Date(currentCalendarDate);
        checkDateAvailability(dateToCheck).then(hasSlots => {
          if (!hasSlots) {
            dayElement.classList.remove('available');
            dayElement.classList.add('unavailable');
          }
        });
      }
      const dateValue = new Date(currentCalendarDate);
      dayElement.addEventListener('click', () => {
        if (selectedDate && dateValue.toDateString() === selectedDate.toDateString()) {
          loadTimeSlots(dateValue);
          return;
        }
        selectCalendarDate(dateValue, dayElement);
      });
      grid.appendChild(dayElement);
      currentCalendarDate.setDate(currentCalendarDate.getDate() + 1);
    }
  }
  const statusSection = document.createElement('div');
  statusSection.id = 'calendarStatus';
  statusSection.className = 'calendar-status';
  calendar.appendChild(header);
  calendar.appendChild(grid);
  calendar.appendChild(statusSection);
  calendarContainer.appendChild(calendar);
  document.getElementById('prevMonth').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    renderMonthlyCalendar();
  });
  document.getElementById('nextMonth').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    renderMonthlyCalendar();
  });
  // Auto-advance if no available slots in this month
  await checkMonthAvailability();
}

// Check if the current month has any available dates
async function checkMonthAvailability() {
  const statusSection = document.getElementById('calendarStatus');
  if (!statusSection) return;
  
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const today = new Date();
  
  let hasAvailability = false;
  let checkDate = new Date(Math.max(firstDay.getTime(), today.getTime()));
  
  // Check each day in the current month
  while (checkDate <= lastDay) {
    if (isDayOpen(checkDate)) {
      const hasSlots = await checkDateAvailability(checkDate);
      if (hasSlots) {
        hasAvailability = true;
        break;
      }
    }
    checkDate.setDate(checkDate.getDate() + 1);
  }
  
  if (!hasAvailability) {
    const nextAvailable = await findNextAvailableDate(new Date(lastDay.getTime() + 24 * 60 * 60 * 1000));
    
    if (nextAvailable) {
      statusSection.innerHTML = `
        <div class="no-availability">
          <p><strong>No availability until ${nextAvailable.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}.</strong></p>
          <button class="next-available-btn" onclick="goToNextAvailable('${formatDate(nextAvailable)}')">
            Go to next available
          </button>
        </div>
      `;
    } else {
      statusSection.innerHTML = `
        <div class="no-availability">
          <p><strong>No availability in the next 90 days.</strong></p>
          <p>Please contact us directly to schedule an appointment.</p>
        </div>
      `;
    }
  } else {
    statusSection.innerHTML = '';
  }
}

// Go to next available date
window.goToNextAvailable = function(dateStr) {
  const date = new Date(dateStr);
  currentMonth = date.getMonth();
  currentYear = date.getFullYear();
  renderMonthlyCalendar().then(() => {
    // Select the date after calendar renders
    setTimeout(() => {
      const dayElement = document.querySelector(`.calendar-day.available[data-date="${dateStr}"]`);
      if (dayElement) {
        selectCalendarDate(date, dayElement);
      }
    }, 100);
  });
};

// Select a calendar date
async function selectCalendarDate(date, dayElement) {
  if (dayElement.classList.contains('disabled') || 
      dayElement.classList.contains('other-month') || 
      dayElement.classList.contains('unavailable')) {
    return;
  }
  
  // Remove previous selection but preserve other classes like 'today'
  document.querySelectorAll('.calendar-day.selected').forEach(day => {
    day.classList.remove('selected');
  });
  
  // Add selection
  dayElement.classList.add('selected');
  selectedDate = date;
  
  // Update selected date
  
  // Update hidden input if it exists
  const selectedDateInput = document.getElementById('selectedDate');
  if (selectedDateInput) {
    selectedDateInput.value = formatDate(date);
  }
  
  // Load time slots immediately for the selected date
  loadTimeSlots(date);
}

// Load time slots for selected date
async function loadTimeSlots(date) {
  const timeSlotsContainer = document.getElementById('timeCards');
  if (!timeSlotsContainer) return;
  
  try {
    // Fetch available time slots
    
    const response = await fetch(`/api/available-slots/${formatDate(date)}`);
    if (!response.ok) throw new Error('Failed to fetch time slots');
    
    const data = await response.json();
    const slots = data.availableSlots || [];
    
    timeSlotsContainer.innerHTML = '';
    
    if (slots.length === 0) {
      timeSlotsContainer.innerHTML = `
        <div class="col-12">
          <div class="alert alert-warning text-center">
            Sin horarios disponibles para ${date.toLocaleDateString('es-ES')}
          </div>
        </div>
      `;
      return;
    }
    
    // Group slots by period (using same logic as weekly calendar)
    const sections = { manana: [], tarde: [], noche: [] };
    
    slots.forEach(time => {
      sections[periodOf(time)].push(time);
    });

    // Spanish period labels (matching weekly calendar)
    const periodLabels = {
      'manana': 'Mañana',
      'tarde': 'Tarde', 
      'noche': 'Noche'
    };

    // Render time periods (using same structure as weekly calendar)
    Object.entries(sections).forEach(([period, times]) => {
      if (times.length === 0) return;
      
      const periodHeader = document.createElement('h6');
      periodHeader.className = 'time-period-header mt-3 mb-2';
      periodHeader.textContent = periodLabels[period];
      timeSlotsContainer.appendChild(periodHeader);
      
      const row = document.createElement('div');
      row.className = 'row g-2';
      timeSlotsContainer.appendChild(row);
      
      times.forEach(time => {
        const col = document.createElement('div');
        col.className = 'col-6 col-md-4 col-lg-3 mb-2';
        
        const btn = document.createElement('button');
        btn.type = 'button'; // Prevent form submission
        btn.className = 'btn btn-outline-primary time-slot-btn';
        btn.textContent = window.formatTimeToAMPM ? window.formatTimeToAMPM(time) : time; // Display in AM/PM format
        
        // Store the 24-hour format as data attribute for form submission
        btn.dataset.time24 = time;
        
        btn.addEventListener('click', () => selectTimeSlot(time, btn));
        
        col.appendChild(btn);
        row.appendChild(col);
      });
    });
    
    // Show booking form
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
      bookingForm.style.display = 'block';
    }
    
  } catch (error) {
    console.error('❌ Error loading time slots:', error);
    timeSlotsContainer.innerHTML = `
      <div class="col-12">
        <div class="alert alert-danger text-center">
          Error cargando horarios disponibles
        </div>
      </div>
    `;
  }
}

// Select time slot
function selectTimeSlot(time, btnElement) {
  // Remove previous selection
  document.querySelectorAll('.time-slot-btn.active').forEach(btn => {
    btn.classList.remove('active', 'btn-primary');
    btn.classList.add('btn-outline-primary');
  });
  
  // Add selection
  btnElement.classList.remove('btn-outline-primary');
  btnElement.classList.add('btn-primary', 'active');
  
  // Update hidden input
  const selectedTimeInput = document.getElementById('selectedTime');
  if (selectedTimeInput) {
    selectedTimeInput.value = time;
  }
  
  // Store selected time
}

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
// periodOf function should be defined locally if needed

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


// Fetch business hours for a specific date (returns the week containing that date)
async function fetchBusinessHoursForDate(dayISO) {
  try {
    const response = await fetch(`/api/business-hours/${dayISO}`);
    if (!response.ok) {
      console.error('Error fetching business hours for date, using defaults');
      return getDefaultBusinessHours();
    }
    const data = await response.json();
    // Convert day_of_week to lowercase for consistency
    const businessHours = data.business_hours.map(bh => ({
      ...bh,
      day_of_week: bh.day_of_week.toLowerCase()
    }));
    return businessHours || getDefaultBusinessHours();
  } catch (error) {
    console.error('Error fetching business hours for date:', error);
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

// formatTimeToAMPM function should be defined locally if needed

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

    // Use today as the default date for initial load
    const todayISO = iso(new Date());
    BUSINESS_HOURS = await fetchBusinessHoursForDate(todayISO);
    window.BUSINESS_HOURS = BUSINESS_HOURS;
    BUSINESS_HOURS.forEach(bh => {
      console.log(`  ${bh.day_of_week}: ${bh.is_open ? 'OPEN' : 'CLOSED'} (${bh.open_time} - ${bh.close_time})`);
    });
    renderWeek();
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
