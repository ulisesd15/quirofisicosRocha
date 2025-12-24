/**
 * Calendar.js - Unified calendar and scheduling logic
 *
 * Overview:
 * - Handles monthly and weekly calendar rendering with accurate DB representation
 * - Fetches business hours and schedule exceptions from backend
 * - Properly handles schedule exceptions (holidays, closures, custom hours)
 * - Manages slot availability with 30-minute intervals
 * - Prevents booking within 30 minutes or beyond 90 days
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
    this.monthNames = options.monthNames || [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    // Display names for calendar header (Monday first)
    this.dayNames = options.dayNames || ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
    // Mapping for JS Date.getDay() (0=Sunday, 1=Monday, ...)
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

  /**
   * Checks if a date is today
   */
  isToday(date) {
    return date.toDateString() === new Date().toDateString();
  }

  /**
   * Checks if a date is in the past (ignores time)
   */
  isPastDate(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
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
   */
  isDayOpen(date) {
    const dateStr = this.formatDate(date);
    
    // Check for schedule exceptions first (holidays, closures, etc.)
    const exception = this.getScheduleException(dateStr);
    if (exception) {
      // If exception says closed, day is not open
      if (exception.isClosed) {
        console.log(`[isDayOpen] Date ${dateStr} is closed due to exception:`, exception.reason);
        return false;
      }
      
      // If exception has custom hours, day is open
      if (exception.customOpenTime && exception.customCloseTime) {
        console.log(`[isDayOpen] Date ${dateStr} has custom hours:`, exception);
        return true;
      }
    }
    
    // Check regular business hours
    if (!this.businessHours.length) {
      console.log('[isDayOpen] No business hours loaded');
      return false;
    }
    
    const dayOfWeek = this.getDayOfWeekString(date).toLowerCase();
    const businessDay = this.businessHoursMap[dayOfWeek];
    
    if (!businessDay) {
      console.log(`[isDayOpen] No business hours for ${dayOfWeek}`);
      return false;
    }
    
    if (!businessDay.isOpen) {
      console.log(`[isDayOpen] Business closed on ${dayOfWeek}`);
      return false;
    }
    
    if (!businessDay.openTime || !businessDay.closeTime) {
      console.log(`[isDayOpen] Missing open/close times for ${dayOfWeek}`);
      return false;
    }
    
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
      
      console.log('[fetchBusinessHours] Loaded hours:', this.businessHoursMap);
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
      console.log('[fetchScheduleExceptions] Loaded exceptions:', this.scheduleExceptions.length);
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
      if (data.availableSlots && Array.isArray(data.availableSlots)) return data.availableSlots;
      if (data.slots && Array.isArray(data.slots)) return data.slots;
      
      return [];
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
          dayElement.classList.add('disabled', 'past-date');
          dayElement.disabled = true;
        } else if (isTooFar) {
          dayElement.classList.add('disabled', 'too-far');
          dayElement.disabled = true;
          dayElement.title = 'No se puede agendar con más de 90 días de antelación.';
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
          
          // Auto-select today if no date selected
          if (isTodayDate && !this.selectedDate) {
            dayElement.classList.add('selected');
            this.selectedDate = new Date(thisDate);
            this.renderTimeSlots(this.selectedDate);
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
   */
  async renderWeeklyCalendar(containerId = 'weeklyCalendar') {
    const calendarContainer = document.getElementById(containerId);
    if (!calendarContainer) {
      console.error(`[renderWeeklyCalendar] No container found: ${containerId}`);
      return;
    }
    
    const today = new Date();
    const weekMonday = this.getMonday(today);
    
    await this.fetchBusinessHours(weekMonday);
    await this.fetchScheduleExceptions();
    
    // Fetch slots for auto-advance feature
    const weekSlots = await this.fetchSlotsForWeek(weekMonday);
    console.log('[renderWeeklyCalendar] weekSlots:', weekSlots);
    
    let advanced = false;
    await this.autoAdvanceIfNoAvailableSlots(
      weekSlots,
      (mondayDate) => {
        advanced = true;
        this.renderWeeklyCalendarForDate(mondayDate, containerId);
      },
      weekMonday
    );
    
    if (advanced) return;
    
    this.renderWeeklyCalendarForDate(weekMonday, containerId);
  }

  /**
   * Renders the weekly calendar for a specific week (starting from Monday)
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
        btn.title = isTooFar ? 'No se puede agendar con más de 90 días de antelación.' :
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
        
        // Auto-select today
        if (isTodayDate && !this.selectedDate) {
          btn.classList.remove('btn-outline-primary');
          btn.classList.add('selected', 'btn-primary');
          this.selectedDate = day;
          this.renderTimeSlots(day);
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
      if (slotDateTime < minBookingTime) {
        btn.disabled = true;
        btn.classList.add('disabled');
        btn.title = 'No disponible (menos de 30 minutos de anticipación)';
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
  // AUTO-ADVANCE FEATURE
  // ============================================

  /**
   * Auto-advances to next week if current week has no available slots
   */
  async autoAdvanceIfNoAvailableSlots(weekSlots, renderWeekFn, currentMonday) {
    const now = new Date();
    
    // Filter for available slots
    const available = weekSlots.filter(slot => {
      const slotDate = new Date(slot.date + 'T' + slot.time);
      return !slot.filled && slotDate > now;
    });
    
    if (available.length > 0) return; // Has available slots
    
    console.log('[autoAdvance] No slots available this week, searching ahead...');
    
    // Search up to 12 weeks ahead
    let weeksAhead = 1;
    let found = false;
    let nextMonday = new Date(currentMonday);
    
    while (weeksAhead <= 12 && !found) {
      nextMonday.setDate(currentMonday.getDate() + 7 * weeksAhead);
      
      const nextWeekSlots = await this.fetchSlotsForWeek(nextMonday);
      const nextAvailable = nextWeekSlots.filter(slot => {
        const slotDate = new Date(slot.date + 'T' + slot.time);
        return !slot.filled && slotDate > now;
      });
      
      if (nextAvailable.length > 0) {
        found = true;
        console.log(`[autoAdvance] Found available slots ${weeksAhead} weeks ahead`);
        renderWeekFn(nextMonday);
        break;
      }
      
      weeksAhead++;
    }
    
    if (!found) {
      alert('No se encontraron horarios disponibles en las próximas semanas.');
    }
  }
}
