/**
 * Calendar.js - Unified calendar and scheduling logic
 *
 * Overview:
 * - Handles monthly and weekly calendar rendering with accurate DB representation
 * - Fetches business hours and schedule exceptions from backend
 * - Properly handles schedule exceptions (holidays, closures, custom hours)
 * - Manages slot availability with 30-minute intervals
 * - Prevents booking within 30 minutes or beyond 90 days
 * - Grays out past time slots for current day (Task #7)
 *
 * Main function call flow:
 * - renderMonthlyCalendar() and renderWeeklyCalendar() are entry points for UI rendering
 * - Both call fetchBusinessHours() and fetchScheduleExceptions() to get data
 * - renderWeeklyCalendar() calls renderWeeklyCalendarForDate() to render the week
 * - Clicking a day calls renderTimeSlots() to show available slots
 * - Slot selection is handled by selectTimeSlot()
 *
 * Utility functions:
 * - getMonday(date): Returns the Monday of the week for a given date
 * - getDayOfWeekString(date): Returns the day name string for a JS Date
 * - isDayOpen(date): Checks if a date is open for booking
 * - getScheduleException(dateStr): Returns any exception for a given date
 */
export class Calendar {

  constructor(options = {}) {
    this.currentMonth = options.currentMonth || new Date().getMonth();
    this.currentYear = options.currentYear || new Date().getFullYear();
    this.selectedDate = null;
    this.businessHours = [];
    this.businessHoursMap = {};
    this.scheduleExceptions = [];
    this.isDataLoaded = false;  // ✅ NEW: Track loading state
    this.monthNames = options.monthNames || [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    this.dayNames = options.dayNames || ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
    this.fullDayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  }


  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  /**
   * Converts 24-hour time string to AM/PM format
   */
  formatTimeToAMPM(time24) {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  isToday(date) {
    return date.toDateString() === new Date().toDateString();
  }

  /**
   * Checks if a date is in the past (before today, ignoring time)
   * Fixed: Now properly considers today as NOT past
   */
  isPastDate(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    // Only return true if date is BEFORE today (not including today)
    return d < today;
  }

  /**
   * Formats a JS Date as yyyy-mm-dd
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Returns the day name string (e.g., 'monday') for a JS Date
   */
  getDayOfWeekString(date) {
    return this.fullDayNames[date.getDay()];
  }

  /**
   * Returns the Monday of the week for a given date
   */
  getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day + 6) % 7;
    d.setDate(d.getDate() - diff);
    return d;
  }

  // ============================================
  // SCHEDULE EXCEPTION HANDLING
  // ============================================

  /**
   * Returns a schedule exception object for a given date string, if any
   * Handles both single day and date range exceptions
   * Properly checks DB field names: exceptionType, startDate, endDate, isClosed
   */
  getScheduleException(dateStr) {
    if (!this.scheduleExceptions.length) return null;
    
    for (const ex of this.scheduleExceptions) {
      // Handle single day exception
      if (ex.exceptionType === 'single_day' && ex.startDate === dateStr) {
        return ex;
      }
      
      // Handle date range exception
      if (ex.exceptionType === 'date_range') {
        if (dateStr >= ex.startDate && dateStr <= (ex.endDate || ex.startDate)) {
          return ex;
        }
      }
    }
    
    return null;
  }

  /**
   * Checks if a given date is open for booking
   * Considers schedule exceptions (closures, holidays) and regular business hours
   * ENHANCED: Now logs detailed debugging information
   */
  isDayOpen(date) {
    const dateStr = this.formatDate(date);
    
    // 🔍 DEBUG: Log every check
    console.log(`\n🔍 [isDayOpen] Checking ${dateStr}:`);
    
    // Check for schedule exceptions first (holidays, closures, etc.)
    const exception = this.getScheduleException(dateStr);
    if (exception) {
      console.log(`  ⚠️  Found exception:`, exception);
      
      // If exception says closed, day is not open
      if (exception.isClosed) {
        console.log(`  ❌ CLOSED due to exception: ${exception.reason || 'No reason given'}`);
        return false;
      }
      
      // If exception has custom hours, day is open
      if (exception.customOpenTime && exception.customCloseTime) {
        console.log(`  ✅ OPEN with custom hours: ${exception.customOpenTime} - ${exception.customCloseTime}`);
        return true;
      }
    }
    
    // Check regular business hours
    if (!this.businessHours.length) {
      console.log('  ❌ CLOSED - No business hours loaded');
      return false;
    }
    
    const dayOfWeek = this.getDayOfWeekString(date).toLowerCase();
    const businessDay = this.businessHoursMap[dayOfWeek];
    
    console.log(`  📅 Day of week: ${dayOfWeek}`);
    
    if (!businessDay) {
      console.log(`  ❌ CLOSED - No business hours configured for ${dayOfWeek}`);
      return false;
    }
    
    console.log(`  📋 Business hours for ${dayOfWeek}:`, businessDay);
    
    if (!businessDay.isOpen) {
      console.log(`  ❌ CLOSED - Business marked as closed on ${dayOfWeek}`);
      return false;
    }
    
    if (!businessDay.openTime || !businessDay.closeTime) {
      console.log(`  ❌ CLOSED - Missing open/close times for ${dayOfWeek}`);
      return false;
    }
    
    console.log(`  ✅ OPEN - Hours: ${businessDay.openTime} - ${businessDay.closeTime}`);
    return true;
  }

  // ============================================
  // DATA FETCHING
  // ============================================

  /**
   * Fetches business hours for a given date from the backend
   * Maps hours by day of week for easy lookup
   */
  async fetchBusinessHours(date) {
    try {
      const dateParam = date ? `/${this.formatDate(date)}` : '';
      const response = await fetch(`/api/business-hours${dateParam}`);
      
      if (!response.ok) {
        console.error('[fetchBusinessHours] Failed to fetch:', response.status);
        throw new Error('Failed to fetch business hours');
      }
      
      const data = await response.json();
      
      // Normalize response - handle different response structures
      let arr = Array.isArray(data)
        ? data
        : (Array.isArray(data.businessHours) ? data.businessHours : []);
      
      // Ensure all day names are lowercase for consistent lookup
      this.businessHours = arr.map(bh => ({
        ...bh,
        dayOfWeek: bh.dayOfWeek.toLowerCase()
      }));
      
      // Create lookup map
      this.businessHoursMap = {};
      this.businessHours.forEach(bh => {
        this.businessHoursMap[bh.dayOfWeek.toLowerCase()] = bh;
      });
      
      console.log('📊 [fetchBusinessHours] Loaded business hours:', this.businessHoursMap);
      return this.businessHours;
    } catch (e) {
      console.error('[fetchBusinessHours] Error:', e);
      this.businessHours = [];
      return this.businessHours;
    }
  }

  /**
   * Fetches schedule exceptions from the backend
   * Includes holidays, closures, and custom hours
   */
  async fetchScheduleExceptions() {
    try {
      const response = await fetch('/api/schedule-exceptions');
      
      if (!response.ok) {
        console.error('[fetchScheduleExceptions] Failed to fetch:', response.status);
        throw new Error('Failed to fetch schedule exceptions');
      }
      
      this.scheduleExceptions = await response.json();
      console.log(`🎄 [fetchScheduleExceptions] Loaded ${this.scheduleExceptions.length} exceptions:`, this.scheduleExceptions);
      return this.scheduleExceptions;
    } catch (e) {
      console.error('[fetchScheduleExceptions] Error:', e);
      this.scheduleExceptions = [];
      return this.scheduleExceptions;
    }
  }

  /**
   * Fetches available slots for a given date from the backend
   * Returns array of time strings (e.g., ['09:00', '09:30', ...])
   */
async fetchAvailableSlots(date) {
  try {
    const dateStr = this.formatDate(date);
    console.log(`[fetchAvailableSlots] Fetching /api/available-slots/${dateStr}`);
    
    const response = await fetch(`/api/available-slots/${dateStr}`);
    
    if (!response.ok) {
      console.error(`[fetchAvailableSlots] Bad response`, response.status, response.statusText);
      return [];
    }
    
    const data = await response.json();
    console.log(`[fetchAvailableSlots] Response data:`, data);
    
    // Normalize response - handle different response structures
    let slots = [];
    if (Array.isArray(data.availableSlots)) {
      slots = data.availableSlots;
    } else if (Array.isArray(data.slots)) {
      slots = data.slots;
    } else if (Array.isArray(data)) {
      slots = data;
    }
    
    // Ensure all times are in HH:MM format (strip seconds if present)
    slots = slots.map(slot => slot.substring(0, 5));
    
    console.log(`[fetchAvailableSlots] Returning ${slots.length} slots`);
    return slots;
    
  } catch (e) {
    console.error('[fetchAvailableSlots] Error:', e);
    return [];
  }
}


  /**
   * Fetch slots for a week given a Monday date
   * Used for auto-advance feature
   */
  async fetchSlotsForWeek(mondayDate) {
    const weekStart = this.formatDate(mondayDate);
    console.log('[fetchSlotsForWeek] Fetching slots for week starting:', weekStart);
    
    try {
      const resp = await fetch(`/api/slots?weekStart=${weekStart}`);
      if (!resp.ok) throw new Error('Error fetching slots');
      
      const data = await resp.json();
      
      // Normalize: convert { slots: {date: [times] } } to [{date, time, filled: false}]
      if (data.slots && typeof data.slots === 'object') {
        const arr = [];
        for (const [date, times] of Object.entries(data.slots)) {
          for (const time of times) {
            arr.push({ date, time, filled: false });
          }
        }
        return arr;
      }
      
      return [];
    } catch (e) {
      console.error('[fetchSlotsForWeek] Error:', e);
      return [];
    }
  }

  // ============================================
  // CALENDAR RENDERING - MONTHLY VIEW
  // ============================================

  /**
   * Renders the monthly calendar view
   */
  async renderMonthlyCalendar(containerId = 'monthViewContainer') {
    const calendarContainer = document.getElementById(containerId);
    if (!calendarContainer) {
      console.error(`[renderMonthlyCalendar] No container found: ${containerId}`);
      return;
    }
    
    // Fetch data for this month
    await this.fetchBusinessHours(new Date(this.currentYear, this.currentMonth, 15));
    await this.fetchScheduleExceptions();
    
    calendarContainer.innerHTML = '';
    
    // Create calendar container
    const calendar = document.createElement('div');
    calendar.className = 'calendar-container';
    
    // Create header with navigation
    const header = document.createElement('div');
    header.className = 'calendar-header d-flex justify-content-between align-items-center mb-2';
    
    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'calendar-nav-btn btn btn-sm btn-outline-secondary';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.title = 'Mes anterior';
    prevBtn.onclick = () => {
      this.currentMonth--;
      if (this.currentMonth < 0) {
        this.currentMonth = 11;
        this.currentYear--;
      }
      this.renderMonthlyCalendar(containerId);
    };
    
    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'calendar-nav-btn btn btn-sm btn-outline-secondary';
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.title = 'Mes siguiente';
    nextBtn.onclick = () => {
      this.currentMonth++;
      if (this.currentMonth > 11) {
        this.currentMonth = 0;
        this.currentYear++;
      }
      this.renderMonthlyCalendar(containerId);
    };
    
    const monthLabel = document.createElement('div');
    monthLabel.className = 'calendar-month-year fw-bold';
    monthLabel.textContent = `${this.monthNames[this.currentMonth]} ${this.currentYear}`;
    
    header.appendChild(prevBtn);
    header.appendChild(monthLabel);
    header.appendChild(nextBtn);
    calendar.appendChild(header);
    
    // Create calendar grid
    const grid = document.createElement('div');
    grid.className = 'calendar-grid';
    
    // Add day headers
    this.dayNames.forEach(day => {
      const dayHeader = document.createElement('div');
      dayHeader.className = 'calendar-day-header';
      dayHeader.textContent = day;
      grid.appendChild(dayHeader);
    });
    
    // Calculate start date (Monday of first week)
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const startDate = new Date(firstDay);
    const firstDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    startDate.setDate(startDate.getDate() - firstDayOfWeek);
    
    // Generate calendar days
    let currentCalendarDate = new Date(startDate);
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 90);
    maxDate.setHours(0, 0, 0, 0);
    
    // Track if we've auto-selected today
    let hasAutoSelected = false;
    
    for (let week = 0; week < 6; week++) {
      for (let day = 0; day < 7; day++) {
        const thisDate = new Date(currentCalendarDate);
        const dayElement = document.createElement('button');
        dayElement.type = 'button';
        dayElement.className = 'calendar-day';
        dayElement.textContent = thisDate.getDate();
        
        const isCurrentMonth = thisDate.getMonth() === this.currentMonth;
        const isCurrentYear = thisDate.getFullYear() === this.currentYear;
        const isPast = this.isPastDate(thisDate);
        const isTooFar = thisDate > maxDate;
        const isOpenDay = this.isDayOpen(thisDate);
        const isTodayDate = this.isToday(thisDate);
        const isSelectedDate = this.selectedDate && thisDate.toDateString() === this.selectedDate.toDateString();
        
        // Apply styles
        if (isTodayDate && !isSelectedDate) dayElement.classList.add('today');
        if (isSelectedDate) dayElement.classList.add('selected');
        
        if (!isCurrentMonth || !isCurrentYear) {
          dayElement.classList.add('other-month');
          dayElement.disabled = true;
        } else if (isPast) {
          // Only disable if it's actually in the past (not today)
          dayElement.classList.add('disabled', 'past-date');
          dayElement.disabled = true;
        } else if (isTooFar) {
          dayElement.classList.add('disabled', 'too-far');
          dayElement.disabled = true;
          dayElement.title = 'No se puede agendar con más de 90 días de anticipación.';
        } else if (!isOpenDay) {
          dayElement.classList.add('unavailable');
          dayElement.disabled = true;
          dayElement.title = 'Cerrado';
        } else {
          dayElement.classList.add('available');
          dayElement.addEventListener('click', () => {
            document.querySelectorAll('.calendar-day.selected').forEach(d => d.classList.remove('selected'));
            dayElement.classList.add('selected');
            this.selectedDate = new Date(thisDate);
            this.renderTimeSlots(this.selectedDate);
          });
          
          // Auto-select first available day (today or later)
          if (!hasAutoSelected && !this.selectedDate && isOpenDay) {
            dayElement.classList.add('selected');
            this.selectedDate = new Date(thisDate);
            hasAutoSelected = true;
            // Defer rendering slots to avoid blocking calendar render
            setTimeout(() => this.renderTimeSlots(this.selectedDate), 100);
          }
        }
        
        grid.appendChild(dayElement);
        currentCalendarDate.setDate(currentCalendarDate.getDate() + 1);
      }
    }
    
    calendar.appendChild(grid);
    calendarContainer.appendChild(calendar);
  }

  // ============================================
  // CALENDAR RENDERING - WEEKLY VIEW
  // ============================================

  /**
   * Renders the weekly calendar view
   * Fixed: Now shows current week by default, only advances if NO bookable slots
   */
  async renderWeeklyCalendar(containerId = 'weeklyCalendar') {
    const calendarContainer = document.getElementById(containerId);
    if (!calendarContainer) {
      console.error(`[renderWeeklyCalendar] No container found: ${containerId}`);
      return;
    }
    
    const today = new Date();
    const weekMonday = this.getMonday(today);
    
    console.log('📅 [renderWeeklyCalendar] Starting with current week:', this.formatDate(weekMonday));
    
    await this.fetchBusinessHours(weekMonday);
    await this.fetchScheduleExceptions();
    
    // Check if current week has any bookable slots (improved logic)
    const hasBookableSlots = await this.weekHasBookableSlots(weekMonday);
    
    if (hasBookableSlots) {
      console.log('✅ [renderWeeklyCalendar] Current week has bookable slots - displaying it');
      this.renderWeeklyCalendarForDate(weekMonday, containerId);
    } else {
      console.log('⏩ [renderWeeklyCalendar] Current week has NO bookable slots - searching for next available week');
      
      // Find next week with available slots
      let found = false;
      let weeksAhead = 1;
      
      while (weeksAhead <= 12 && !found) {
        const nextMonday = new Date(weekMonday);
        nextMonday.setDate(weekMonday.getDate() + 7 * weeksAhead);
        
        console.log(`🔍 Checking week ${weeksAhead}: ${this.formatDate(nextMonday)}`);
        
        const nextHasSlots = await this.weekHasBookableSlots(nextMonday);
        if (nextHasSlots) {
          console.log(`✅ Found available week ${weeksAhead} weeks ahead`);
          found = true;
          this.renderWeeklyCalendarForDate(nextMonday, containerId);
          break;
        }
        
        weeksAhead++;
      }
      
      if (!found) {
        calendarContainer.innerHTML = '<div class="alert alert-warning text-center">No hay horarios disponibles en las próximas 12 semanas.</div>';
      }
    }
  }

  /**
   * Checks if a given week (starting Monday) has any bookable time slots
   * Returns true if at least one slot is available and bookable (30+ min from now)
   * FIXED: Properly checks each day for actual bookable slots
   */
  async weekHasBookableSlots(mondayDate) {
    const now = new Date();
    const minBookingTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
    
    console.log(`\n🔍 [weekHasBookableSlots] Checking week starting ${this.formatDate(mondayDate)}`);
    console.log(`   Current time: ${now.toLocaleString()}`);
    console.log(`   Min booking time: ${minBookingTime.toLocaleString()}`);
    
    // Check each day of the week (Monday to Sunday)
    for (let d = 0; d < 7; d++) {
      const dayDate = new Date(mondayDate.getTime() + d * 24 * 60 * 60 * 1000);
      const dateStr = this.formatDate(dayDate);
      
      console.log(`\n  📅 Checking ${dateStr}:`);
      
      // Skip if day is in the past
      if (this.isPastDate(dayDate)) {
        console.log(`    ⏭️  Day is in the past, skipping`);
        continue;
      }
      
      // Check if day is open for business
      if (!this.isDayOpen(dayDate)) {
        console.log(`    🚫 Day is closed`);
        continue;
      }
      
      // Fetch available slots for this day
      const slots = await this.fetchAvailableSlots(dayDate);
      console.log(`    📋 Found ${slots.length} total slots`);
      
      if (!slots.length) {
        console.log(`    ❌ No slots available`);
        continue;
      }
      
      // Check if any slot is bookable (at least 30 minutes from now)
      for (const timeStr of slots) {
        const slotDateTime = new Date(`${dateStr}T${timeStr}:00`);
        
        if (slotDateTime >= minBookingTime) {
          console.log(`    ✅ FOUND BOOKABLE SLOT: ${timeStr} (${slotDateTime.toLocaleString()})`);
          return true; // Found at least one bookable slot!
        } else {
          console.log(`    ⏰ Slot ${timeStr} is too soon (${slotDateTime.toLocaleString()})`);
        }
      }
    }
    
    console.log(`\n  ❌ No bookable slots found in this week`);
    return false; // No bookable slots found in entire week
  }

  /**
   * Renders the weekly calendar for a specific week (starting from Monday)
   * Fixed: Properly handles today in the current week
   */
  async renderWeeklyCalendarForDate(date, containerId = 'weeklyCalendar') {
    const calendarContainer = document.getElementById(containerId);
    if (!calendarContainer) return;
    
    await this.fetchBusinessHours(date);
    await this.fetchScheduleExceptions();
    
    calendarContainer.innerHTML = '';
    
    const weekRow = document.createElement('div');
    weekRow.className = 'd-flex justify-content-center align-items-center gap-2';
    
    // Previous week button
    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'btn btn-light week-arrow';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.title = 'Semana anterior';
    prevBtn.onclick = () => {
      const prevMonday = this.getMonday(new Date(date.setDate(date.getDate() - 7)));
      this.renderWeeklyCalendarForDate(prevMonday, containerId);
    };
    weekRow.appendChild(prevBtn);
    
    const weekMonday = this.getMonday(date);
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 90);
    maxDate.setHours(0, 0, 0, 0);
    
    // Track if we've auto-selected a day
    let hasAutoSelected = false;
    
    // Render each day of the week
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekMonday.getTime() + d * 24 * 60 * 60 * 1000);
      const isOpenDay = this.isDayOpen(day);
      const isTooFar = day > maxDate;
      const isTodayDate = this.isToday(day);
      const isSelectedDate = this.selectedDate && day.toDateString() === this.selectedDate.toDateString();
      const isPast = this.isPastDate(day);
      
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn calendar-day-btn d-flex flex-column align-items-center py-2';
      btn.dataset.date = this.formatDate(day);
      
      const dayLabel = document.createElement('span');
      dayLabel.className = 'small fw-bold';
      dayLabel.textContent = day.toLocaleDateString('es-MX', { weekday: 'short' });
      
      const dateLabel = document.createElement('span');
      dateLabel.textContent = `${String(day.getMonth() + 1).padStart(2, '0')}/${String(day.getDate()).padStart(2, '0')}`;
      
      btn.appendChild(dayLabel);
      btn.appendChild(dateLabel);
      
      // Apply styles and state
      if (isTodayDate && !isSelectedDate) btn.classList.add('today');
      if (isSelectedDate) btn.classList.add('selected', 'btn-primary');
      
      if (!isOpenDay || isPast || isTooFar) {
        btn.classList.add('btn-secondary');
        btn.disabled = true;
        btn.title = isTooFar ? 'No se puede agendar con más de 90 días de anticipación.' :
                    !isOpenDay ? 'Cerrado' : 'No disponible';
      } else {
        btn.classList.add('btn-outline-primary');
        btn.addEventListener('click', () => {
          document.querySelectorAll('.calendar-day-btn.selected').forEach(b => {
            b.classList.remove('selected', 'btn-primary');
            b.classList.add('btn-outline-primary');
          });
          btn.classList.remove('btn-outline-primary');
          btn.classList.add('selected', 'btn-primary');
          this.selectedDate = day;
          this.renderTimeSlots(day);
        });
        
        // Auto-select first available day (today or later)
        if (!hasAutoSelected && !this.selectedDate && isOpenDay) {
          btn.classList.remove('btn-outline-primary');
          btn.classList.add('selected', 'btn-primary');
          this.selectedDate = day;
          hasAutoSelected = true;
          // Defer rendering slots to avoid blocking calendar render
          setTimeout(() => this.renderTimeSlots(day), 100);
        }
      }
      
      weekRow.appendChild(btn);
    }
    
    // Next week button
    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'btn btn-light week-arrow';
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.title = 'Semana siguiente';
    nextBtn.onclick = () => {
      const nextMonday = this.getMonday(new Date(date.setDate(date.getDate() + 7)));
      this.renderWeeklyCalendarForDate(nextMonday, containerId);
    };
    weekRow.appendChild(nextBtn);
    
    calendarContainer.appendChild(weekRow);
  }

  // ============================================
  // TIME SLOT RENDERING
  // ============================================

  /**
   * Renders available time slots for a given date
   * ENHANCED: Grays out past time slots for current day (Task #7)
   */
  async renderTimeSlots(date, slotContainerId = 'timeCards') {
    const slotContainer = document.getElementById(slotContainerId);
    if (!slotContainer) {
      console.warn(`[renderTimeSlots] No slotContainer found: ${slotContainerId}`);
      return;
    }
    
    slotContainer.innerHTML = '<div class="text-center">Cargando horarios...</div>';
    
    // Check if day is open
    const dayOfWeek = this.getDayOfWeekString(date).toLowerCase();
    const businessDay = this.businessHoursMap[dayOfWeek];
    
    if (!businessDay || !businessDay.isOpen) {
      slotContainer.innerHTML = '<div class="alert alert-warning text-center">Sin horarios disponibles para este día</div>';
      return;
    }
    
    // Fetch available slots from backend
    const slots = await this.fetchAvailableSlots(date);
    console.log(`[renderTimeSlots] Fetched ${slots.length} slots for ${this.formatDate(date)}`);
    
    if (!slots.length) {
      slotContainer.innerHTML = '<div class="alert alert-warning text-center">Sin horarios disponibles para este día</div>';
      return;
    }
    
    // Render slots
    slotContainer.innerHTML = '';
    const row = document.createElement('div');
    row.className = 'row g-3';
    
    const now = new Date();
    const minBookingTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
    const isToday = this.isToday(date);
    
    slots.forEach(time => {
      // Ensure slot is within business hours
      const slotHM = time.slice(0, 5);
      const openHM = businessDay.openTime.slice(0, 5);
      const closeHM = businessDay.closeTime.slice(0, 5);
      
      if (slotHM < openHM || slotHM > closeHM) {
        console.log(`[renderTimeSlots] Slot ${slotHM} outside business hours (${openHM}-${closeHM})`);
        return;
      }
      
      const col = document.createElement('div');
      col.className = 'col-12 col-sm-6 col-md-4 col-lg-3 mb-3';
      
      const card = document.createElement('div');
      card.className = 'time-slot-card';
      
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-outline-primary time-slot-btn';
      btn.textContent = this.formatTimeToAMPM(time);
      btn.dataset.time24 = time;
      
      // Check if slot is in the past or too soon
      const slotDateTime = new Date(`${this.formatDate(date)}T${time}:00`);
      const isPastSlot = slotDateTime < minBookingTime;
      
      if (isPastSlot) {
        btn.disabled = true;
        btn.classList.remove('btn-outline-primary');
        btn.classList.add('disabled', 'btn-outline-secondary', 'opacity-50');
        
        // Add visual indicator for past slots on today
        if (isToday) {
          btn.classList.add('past-time-slot');
          btn.title = 'Horario pasado';
          // Add strikethrough text
          btn.style.textDecoration = 'line-through';
          btn.style.color = '#6c757d';
        } else {
          btn.title = 'No disponible (menos de 30 minutos de anticipación)';
        }
      } else {
        btn.addEventListener('click', () => this.selectTimeSlot(time, btn));
      }
      
      card.appendChild(btn);
      col.appendChild(card);
      row.appendChild(col);
    });
    
    slotContainer.appendChild(row);
  }

  /**
   * Handles time slot selection
   */
  selectTimeSlot(time, btnElement) {
    // Update UI
    document.querySelectorAll('.time-slot-btn.active').forEach(btn => {
      btn.classList.remove('active', 'btn-primary');
      btn.classList.add('btn-outline-primary');
    });
    
    btnElement.classList.remove('btn-outline-primary');
    btnElement.classList.add('btn-primary', 'active');
    
    // Update hidden form fields
    const selectedDateInput = document.getElementById('selected-date');
    const selectedTimeInput = document.getElementById('selected-time');
    
    if (selectedDateInput && this.selectedDate) {
      selectedDateInput.value = this.formatDate(this.selectedDate);
    }
    
    if (selectedTimeInput) {
      selectedTimeInput.value = time;
    }
    
    console.log('[selectTimeSlot] Selected:', {
      date: selectedDateInput?.value,
      time: selectedTimeInput?.value
    });
    
    // Enable confirm button
    const confirmBtn = document.getElementById('confirm-booking-btn');
    if (confirmBtn) confirmBtn.disabled = false;
  }

  // ============================================
  // AUTO-ADVANCE FEATURE (DEPRECATED)
  // ============================================

  /**
   * @deprecated This function is no longer used in the new implementation
   * Replaced by weekHasBookableSlots() in renderWeeklyCalendar()
   * 
   * Old auto-advance logic that was causing issues with skipping current week
   */
  async autoAdvanceIfNoAvailableSlots(weekSlots, renderWeekFn, currentMonday) {
    console.warn('[autoAdvanceIfNoAvailableSlots] This function is deprecated and should not be called');
    
    // This function is kept for backwards compatibility but should not be used
    // The new logic in renderWeeklyCalendar() uses weekHasBookableSlots() instead
  }
}
