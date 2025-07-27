/**
 * Quirofísicos Rocha - Enhanced Moconst formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

// Determine time period for grouping (using same logic as weekly calendar)
const periodOf = (time) => {
  const [h] = time.split(':').map(Number);
  return h < 12 ? 'manana' : h < 17 ? 'tarde' : 'noche';
};stem
 * Google Calendar-style monthly view with appointment booking
 * 
 * Features:
 * - Full month grid calendar display
 * - Real-time availability checking
 * - Next available date navigation
 * - Color-coded day indicators
 * - Responsive design for all devices
 * - Integration with business hours           <p><strong>Sin disponibilidad hasta ${nextAvailable.toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</strong></p>/

// Enhanced Monthly Calendar Appointment System
/**
 * Enhanced Monthly Calendar System for Appointment Booking
 * Provides a clean, responsive monthly calendar interface
 */

// Global variables
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

// Fetch business hours
async function fetchBusinessHours() {
  try {
    console.log('📞 Monthly calendar fetching business hours...');
    // Fetch business hours data
    const response = await fetch('/api/business-hours');
    if (!response.ok) throw new Error('Failed to fetch business hours');
    
    const data = await response.json();
    console.log('📊 Monthly calendar business hours data:', data);
    
    // Convert day_of_week to lowercase and normalize time format
    const processedBusinessHours = data.businessHours.map(bh => ({
      ...bh,
      day_of_week: bh.day_of_week.toLowerCase(),
      open_time: bh.open_time ? bh.open_time.substring(0, 5) : null,
      close_time: bh.close_time ? bh.close_time.substring(0, 5) : null,
      break_start: bh.break_start ? bh.break_start.substring(0, 5) : null,
      break_end: bh.break_end ? bh.break_end.substring(0, 5) : null
    }));
    
    // Update the global businessHours variable
    businessHours = processedBusinessHours || getDefaultBusinessHours();
    console.log('✅ Monthly calendar processed business hours:', businessHours);
    return businessHours;
  } catch (error) {
    console.error('❌ Error fetching business hours:', error);
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

// Check if a day is open for business
function isDayOpen(date) {
  console.log(`🔍 Checking if day is open for ${date.toDateString()}`);
  console.log(`📊 Current businessHours:`, businessHours);
  console.log(`📊 Current scheduleExceptions:`, scheduleExceptions);
  
  // First check schedule exceptions (they override business hours)
  const dateStr = formatDate(date);
  const exception = getScheduleException(dateStr);
  
  if (exception) {
    console.log(`📅 Found schedule exception for ${dateStr}:`, exception);
    // If there's an exception that closes the day completely
    if (exception.is_closed) {
      console.log(`❌ Day is closed due to schedule exception: ${exception.reason}`);
      return false;
    }
    // If there's an exception with custom hours, consider it open
    if (exception.custom_open_time && exception.custom_close_time) {
      console.log(`✅ Day has custom hours due to exception: ${exception.custom_open_time} - ${exception.custom_close_time}`);
      return true;
    }
  }
  
  if (!businessHours || businessHours.length === 0) {
    console.log(`❌ No business hours available`);
    return false;
  }

  const dayOfWeek = fullDayNames[date.getDay()];
  console.log(`📅 Day of week: ${dayOfWeek} (index: ${date.getDay()})`);
  
  const businessDay = businessHours.find(bh => bh.day_of_week === dayOfWeek);
  console.log(`🏢 Business day config:`, businessDay);
  
  if (!businessDay) {
    console.log(`❌ No business hours configured for ${dayOfWeek}`);
    return false;
  }

  // Check if the business is closed on this day
  if (!businessDay.is_open || businessDay.is_open === 0) {
    console.log(`❌ Business is closed on ${dayOfWeek}`);
    return false;
  }

  console.log(`✅ Business is open on ${dayOfWeek}`);
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

// Render the monthly calendar
async function renderMonthlyCalendar() {
  console.log('🗓️ renderMonthlyCalendar() called');
  
  const calendarContainer = document.getElementById('monthlyCalendar');
  
  if (!calendarContainer) {
    console.error('❌ Monthly calendar container not found');
    return;
  }
  
  // Check if business hours are available from main appointment system
  if (window.BUSINESS_HOURS && window.BUSINESS_HOURS.length > 0) {
    console.log('📊 Using business hours from main appointment system:', window.BUSINESS_HOURS);
    businessHours = window.BUSINESS_HOURS;
  } else if (!businessHours || businessHours.length === 0) {
    console.log('⚠️ No business hours available, loading them...');
    await fetchBusinessHours();
  }
  
  console.log('📊 Current businessHours for monthly calendar:', businessHours);
  
  // Clear previous content
  calendarContainer.innerHTML = '';
  
  // Create calendar structure
  const calendar = document.createElement('div');
  calendar.className = 'calendar-container';
  
  // Calendar header
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
  
  // Calendar grid
  const grid = document.createElement('div');
  grid.className = 'calendar-grid';
  
  // Add day headers
  dayNames.forEach(day => {
    const dayHeader = document.createElement('div');
    dayHeader.className = 'calendar-day-header';
    dayHeader.textContent = day;
    grid.appendChild(dayHeader);
  });
  
  // Calculate calendar days
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());
  
  // Generate calendar days
  const calendarDays = [];
  let currentCalendarDate = new Date(startDate);
  
  for (let week = 0; week < 6; week++) {
    for (let day = 0; day < 7; day++) {
      const dayElement = document.createElement('button');
      dayElement.type = 'button'; // Prevent form submission
      dayElement.className = 'calendar-day';
      dayElement.textContent = currentCalendarDate.getDate();
      
      const isCurrentMonth = currentCalendarDate.getMonth() === currentMonth;
      const isCurrentYear = currentCalendarDate.getFullYear() === currentYear;
      const isPast = isPastDate(currentCalendarDate);
      const isOpenDay = isDayOpen(currentCalendarDate);
      
      // Add appropriate classes
      const isTodayDate = isToday(currentCalendarDate);
      const isSelectedDate = selectedDate && 
        currentCalendarDate.toDateString() === selectedDate.toDateString();
      
      if (isTodayDate && !isSelectedDate) {
        dayElement.classList.add('today');
      }
      
      if (isSelectedDate) {
        dayElement.classList.add('selected');
      }
      
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
      
      // Add click handler
      const dateValue = new Date(currentCalendarDate);
      dayElement.addEventListener('click', () => {
        // Check if this day is already selected
        if (selectedDate && dateValue.toDateString() === selectedDate.toDateString()) {
          // Load time slots for selected day
          loadTimeSlots(dateValue);
          return;
        }
        selectCalendarDate(dateValue, dayElement);
      });
      
      grid.appendChild(dayElement);
      calendarDays.push(dayElement);
      
      currentCalendarDate.setDate(currentCalendarDate.getDate() + 1);
    }
  }
  
  // Status section
  const statusSection = document.createElement('div');
  statusSection.id = 'calendarStatus';
  statusSection.className = 'calendar-status';
  
  // Assemble calendar
  calendar.appendChild(header);
  calendar.appendChild(grid);
  calendar.appendChild(statusSection);
  
  calendarContainer.appendChild(calendar);
  
  // Add navigation event listeners
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
  
  // Check if current month has any availability
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

// Initialize the enhanced calendar system
async function initializeEnhancedCalendar() {
  try {
    console.log('🚀 Initializing Enhanced Calendar System...');
    
    // Load business hours and schedule exceptions in parallel
    await Promise.all([
      fetchBusinessHours(),
      fetchScheduleExceptions()
    ]);
    
    console.log('📊 Business hours loaded:', businessHours);
    console.log('📊 Schedule exceptions loaded:', scheduleExceptions);
    
    // Render the monthly calendar
    await renderMonthlyCalendar();
    
    console.log('✅ Enhanced Calendar System initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Enhanced Calendar System:', error);
  }
}

// Export functions to window for external access
window.renderMonthlyCalendar = renderMonthlyCalendar;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeEnhancedCalendar);
