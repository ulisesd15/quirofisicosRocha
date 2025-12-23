/**
 * Calendar.js - Main calendar and scheduling logic for the app.
 *
 * Overview:
 * - Handles monthly and weekly calendar rendering, business hours, and slot selection.
 * - Fetches business hours and schedule exceptions from the backend.
 * - Maps business hours to days of the week and manages slot availability.
 *
 * Main function call flow:
 * - renderMonthlyCalendar() and renderWeeklyCalendar() are entry points for UI rendering.
 * - Both call fetchBusinessHours() and fetchScheduleExceptions() to get data.
 * - renderWeeklyCalendar() calls renderWeeklyCalendarForDate() to render the week.
 * - Clicking a day calls renderTimeSlots() to show available slots for that day.
 * - Slot selection is handled by selectTimeSlot().
 *
 * Utility functions:
 * - getMonday(date): Returns the Monday of the week for a given date.
 * - getDayOfWeekString(date): Returns the day name string for a JS Date.
 * - isDayOpen(date): Checks if a date is open for booking.
 * - getScheduleException(dateStr): Returns any exception for a given date.
 *
 * Each function below has a short description for maintainability.
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

  // --- Utility Functions ---
  /**
   * Converts 24-hour time string to AM/PM format.
   */
  formatTimeToAMPM(time24) {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  }
  /**
   * Checks if a date is today.
   */
  isToday(date) {
    return date.toDateString() === new Date().toDateString();
  }
  /**
   * Checks if a date is in the past (ignores time).
   */
  isPastDate(date) {
    const today = new Date(); today.setHours(0,0,0,0);
    const d = new Date(date); d.setHours(0,0,0,0);
    return d < today;
  }

  // --- Business Logic ---

  // Utility: Get schedule exception for a date
  /**
   * Returns a schedule exception object for a given date string, if any.
   */
  getScheduleException(dateStr) {
    if (!this.scheduleExceptions.length) return null;
    for (const ex of this.scheduleExceptions) {
      if (ex.exceptionType === 'singleDay' && ex.startDate === dateStr) return ex;
      if (ex.exceptionType === 'dateRange' && dateStr >= ex.startDate && dateStr <= ex.endDate) return ex;
    }
    return null;
  }

  // Utility: Get Monday of the week for a given date
  /**
   * Returns the Monday of the week for a given date.
   */
  getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day + 6) % 7;
    d.setDate(d.getDate() - diff);
    return d;
  }

  // --- Calendar Rendering ---
  /**
   * Renders the monthly calendar view and attaches event listeners.
   */
  async renderMonthlyCalendar(containerId = 'monthViewContainer') {
    const calendarContainer = document.getElementById(containerId);
    if (!calendarContainer) {
      console.error(`No #${containerId} container found`);
      return;
    }
    // Fetch business hours relevant to the month being rendered.
    // We use the 15th of the month to ensure we get the correct schedule.
    await this.fetchBusinessHours(new Date(this.currentYear, this.currentMonth, 15));
    await this.fetchScheduleExceptions();
    calendarContainer.innerHTML = '';
    const calendar = document.createElement('div');
    calendar.className = 'calendar-container';
    const header = document.createElement('div');
    header.className = 'calendar-header d-flex justify-content-between align-items-center mb-2';
    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'calendar-nav-btn btn btn-sm btn-outline-secondary';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.title = 'Mes anterior';
    prevBtn.onclick = () => {
      this.currentMonth--;
      if (this.currentMonth < 0) { this.currentMonth = 11; this.currentYear--; }
      this.renderMonthlyCalendar(containerId);
    };
    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'calendar-nav-btn btn btn-sm btn-outline-secondary';
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.title = 'Mes siguiente';
    nextBtn.onclick = () => {
      this.currentMonth++;
      if (this.currentMonth > 11) { this.currentMonth = 0; this.currentYear++; }
      this.renderMonthlyCalendar(containerId);
    };
    const monthLabel = document.createElement('div');
    monthLabel.className = 'calendar-month-year fw-bold';
    monthLabel.textContent = `${this.monthNames[this.currentMonth]} ${this.currentYear}`;
    header.appendChild(prevBtn);
    header.appendChild(monthLabel);
    header.appendChild(nextBtn);
    calendar.appendChild(header);
    const grid = document.createElement('div');
    grid.className = 'calendar-grid';
    this.dayNames.forEach(day => {
      const dayHeader = document.createElement('div');
      dayHeader.className = 'calendar-day-header';
      dayHeader.textContent = day;
      grid.appendChild(dayHeader);
    });
  const firstDay = new Date(this.currentYear, this.currentMonth, 1);
  const startDate = new Date(firstDay);
  const firstDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  startDate.setDate(startDate.getDate() - firstDayOfWeek);
    let currentCalendarDate = new Date(startDate);
    for (let week = 0; week < 6; week++) {
      for (let day = 0; day < 7; day++) {
        const thisDate = new Date(currentCalendarDate); // capture the date for this cell
        const dayElement = document.createElement('button');
        dayElement.type = 'button';
        dayElement.className = 'calendar-day';
        dayElement.textContent = thisDate.getDate();
        const isCurrentMonth = thisDate.getMonth() === this.currentMonth;
        const isCurrentYear = thisDate.getFullYear() === this.currentYear;
        const isPast = this.isPastDate(thisDate);
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 90);
    maxDate.setHours(0, 0, 0, 0);
    const isTooFar = thisDate > maxDate;
        const isOpenDay = this.isDayOpen(thisDate);
        const isTodayDate = this.isToday(thisDate);
        const isSelectedDate = this.selectedDate && thisDate.toDateString() === this.selectedDate.toDateString();
        if (isTodayDate && !isSelectedDate) dayElement.classList.add('today');
        if (isSelectedDate) dayElement.classList.add('selected');
        if (!isCurrentMonth || !isCurrentYear) {
          dayElement.classList.add('other-month');
          dayElement.disabled = true;
        } else if (isPast) {
      dayElement.classList.add('disabled', 'past-date');
          dayElement.disabled = true;
        } else if (!isOpenDay) {
          dayElement.classList.add('unavailable');
          dayElement.disabled = true;
        } else {
          dayElement.classList.add('available');
          dayElement.addEventListener('click', () => {
        if (isTooFar) {
          alert('No se puede agendar con más de 90 días de antelación.');
          return;
        }
            console.log('[MonthlyView] Day clicked:', {
              date: new Date(thisDate),
              isOpenDay,
              isTodayDate,
              isSelectedDate,
              openTime: this.businessHoursMap[this.getDayOfWeekString(thisDate).toLowerCase()]?.openTime,
              closeTime: this.businessHoursMap[this.getDayOfWeekString(thisDate).toLowerCase()]?.closeTime,
              businessDay: this.businessHoursMap[this.getDayOfWeekString(thisDate).toLowerCase()]
            });
            document.querySelectorAll('.calendar-day.selected').forEach(day => day.classList.remove('selected'));
            dayElement.classList.add('selected');
            this.selectedDate = new Date(thisDate);
            this.renderTimeSlots(this.selectedDate);
          });
          if (isTodayDate && !this.selectedDate) {
            dayElement.classList.add('selected');
            this.selectedDate = new Date(thisDate);
            this.renderTimeSlots(this.selectedDate);
          }
    }
    if (isTooFar) {
      dayElement.classList.add('disabled', 'too-far');
      dayElement.disabled = true;
      dayElement.title = 'No se puede agendar con más de 90 días de antelación.';
        }
        grid.appendChild(dayElement);
        currentCalendarDate.setDate(currentCalendarDate.getDate() + 1);
      }
    }
    calendar.appendChild(grid);
    calendarContainer.appendChild(calendar);
  }

  /**
   * Renders the weekly calendar view and triggers slot fetching.
   */
  async renderWeeklyCalendar(containerId = 'weeklyCalendar') {
    const calendarContainer = document.getElementById(containerId);
    if (!calendarContainer) return;
    const today = new Date();
    const weekMonday = this.getMonday(today);
    await this.fetchBusinessHours(weekMonday);
    await this.fetchScheduleExceptions();

    // Fetch slots for the current week
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
   * Renders the weekly calendar for a specific week (starting from Monday).
   */
  async renderWeeklyCalendarForDate(date, containerId = 'weeklyCalendar') {
    const calendarContainer = document.getElementById(containerId);
    if (!calendarContainer) return;
    await this.fetchBusinessHours(date);
    await this.fetchScheduleExceptions();
    calendarContainer.innerHTML = '';
    const weekRow = document.createElement('div');
    weekRow.className = 'd-flex justify-content-center align-items-center gap-2';
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
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekMonday.getTime() + d * 24 * 60 * 60 * 1000);
      const dayOfWeek = this.getDayOfWeekString(day).toLowerCase();
      const businessDay = this.businessHoursMap[dayOfWeek];
      const isOpenDay = this.isDayOpen(day);
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 90);
      maxDate.setHours(0, 0, 0, 0);
      const isTooFar = day > maxDate;
      const isTodayDate = this.isToday(day);
      const isSelectedDate = this.selectedDate && day.toDateString() === this.selectedDate.toDateString();
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
      const isPast = this.isPastDate(day);
      if (isTodayDate && !isSelectedDate) btn.classList.add('today');
      if (isSelectedDate) btn.classList.add('selected', 'btn-primary');
      if (!isOpenDay || isPast || isTooFar) {
        btn.classList.add('btn-secondary');
        btn.disabled = true;
        if (isTooFar) {
          btn.title = 'No se puede agendar con más de 90 días de antelación.';
        } else {
          btn.title = !isOpenDay ? 'Cerrado' : 'No disponible';
        }
      } else {
        btn.classList.add('btn-outline-primary');
        btn.addEventListener('click', () => {
          document.querySelectorAll('.calendar-day-btn.selected').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          this.selectedDate = day;
          this.renderTimeSlots(day);
        });
        if (isTodayDate && !this.selectedDate) {
          btn.classList.add('selected');
          this.selectedDate = day;
          this.renderTimeSlots(day);
        }
      }
      weekRow.appendChild(btn);
    }
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

  // --- Slot Rendering ---
  /**
   * Renders available time slots for a given date.
   */
  async renderTimeSlots(date, slotContainerId = 'timeCards') {
    const slotContainer = document.getElementById(slotContainerId);
    if (!slotContainer) {
      console.warn(`[renderTimeSlots] No slotContainer found for id: ${slotContainerId}`);
      return;
    }
    slotContainer.innerHTML = '<div class="text-center">Cargando horarios...</div>';
    const dayOfWeek = this.getDayOfWeekString(date).toLowerCase();
    const businessDay = this.businessHoursMap[dayOfWeek];
  // console.log(`[renderTimeSlots] date:`, date, `dayOfWeek:`, dayOfWeek, `businessDay:`, businessDay);
    if (!businessDay) {
      slotContainer.innerHTML = '<div class="alert alert-warning text-center">Sin horarios disponibles para este día</div>';
      console.warn(`[renderTimeSlots] No businessDay for this day`, { dayOfWeek });
      return;
    }
    if (!businessDay.isOpen) {
      slotContainer.innerHTML = '<div class="alert alert-warning text-center">Sin horarios disponibles para este día</div>';
      console.warn(`[renderTimeSlots] Business is closed for this day`, { businessDay });
      return;
    }
    if (typeof businessDay.openTime !== 'string' || typeof businessDay.closeTime !== 'string') {
      slotContainer.innerHTML = '<div class="alert alert-warning text-center">Sin horarios disponibles para este día</div>';
      console.warn(`[renderTimeSlots] openTime or closeTime missing or not string`, { businessDay });
      return;
    }
    const slots = await this.fetchAvailableSlots(date);
  // console.log(`[renderTimeSlots] slots fetched:`, slots);
    slotContainer.innerHTML = '';
    if (!slots.length) {
      slotContainer.innerHTML = '<div class="alert alert-warning text-center">Sin horarios disponibles para este día</div>';
      console.warn(`[renderTimeSlots] No slots available for this day`, { date, slots });
      return;
    }
    const now = new Date();
  const row = document.createElement('div');
  row.className = 'row g-3';
    slots.forEach(time => {
      const slotHM = time.slice(0,5);
      const openHM = businessDay.openTime.slice(0,5);
      const closeHM = businessDay.closeTime.slice(0,5);
      if (slotHM < openHM || slotHM > closeHM) {
        console.log(`[renderTimeSlots] Slot ${slotHM} out of business hours (${openHM} - ${closeHM})`);
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
      const slotDateTime = new Date(`${this.formatDate(date)}T${time}:00`);
      if (slotDateTime < new Date(now.getTime() + 30 * 60 * 1000)) {
        btn.disabled = true;
        btn.classList.add('disabled');
        btn.title = 'No disponible (menos de 30 minutos de anticipación o pasado)';
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
   * Fetches available slots for a given date from the backend.
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
      if (data.availableSlots && Array.isArray(data.availableSlots)) return data.availableSlots;
      if (data.slots && Array.isArray(data.slots)) return data.slots;
      return [];
    } catch (e) {
      console.error('[fetchAvailableSlots] Error:', e);
      return [];
    }
  }



  /**
   * Handles UI state for selecting a time slot.
   */
  selectTimeSlot(time, btnElement) {
    document.querySelectorAll('.time-slot-btn.active').forEach(btn => {
      btn.classList.remove('active', 'btn-primary');
      btn.classList.add('btn-outline-primary');
    });
    btnElement.classList.remove('btn-outline-primary');
    btnElement.classList.add('btn-primary', 'active');

    // Update the hidden input fields for the form
    const selectedDateInput = document.getElementById('selected-date');
    const selectedTimeInput = document.getElementById('selected-time');

    console.log('[DEBUG] selectTimeSlot: Raw selectedDate object:', this.selectedDate);

    console.log('[Calendar.js] selectTimeSlot: Received time:', time, 'and selected date:', this.selectedDate);

    if (selectedDateInput && this.selectedDate) {
      selectedDateInput.value = this.formatDate(this.selectedDate);
    }
    if (selectedTimeInput) {
      selectedTimeInput.value = time;
    }

    console.log('[Calendar.js] selectTimeSlot: Set hidden input values -> date:', selectedDateInput.value, 'time:', selectedTimeInput.value);

    // Enable the confirm booking button
    const confirmBtn = document.getElementById('confirm-booking-btn');
    if (confirmBtn) confirmBtn.disabled = false;
  }

  // --- Date Selection ---
  /**
   * Handles UI state for selecting a calendar day.
   */
  selectCalendarDate(date, dayElement) {
    if (dayElement.classList.contains('disabled') || dayElement.classList.contains('other-month') || dayElement.classList.contains('unavailable')) return;
    document.querySelectorAll('.calendar-day.selected').forEach(day => day.classList.remove('selected'));
    dayElement.classList.add('selected');
    this.selectedDate = date;
    // Optionally, load time slots for the selected date here
  }

  /**
   * Formats a JS Date as yyyy-mm-dd.
   */
  formatDate(date) {
    // Using toISOString() can cause off-by-one day errors due to timezone conversion.
    // Instead, we build the date string from the local date components.
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // getMonth() is zero-based
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Returns the day name string (e.g., 'monday') for a JS Date.
   */
  getDayOfWeekString(date) {
    // Always use JS Date.getDay() (0=Sunday, 1=Monday, ...)
    return this.fullDayNames[date.getDay()];
  }

  /**
   * Fetches business hours for a given date (or current) from the backend.
   */
  async fetchBusinessHours(date) {
    try {
      const dateParam = date ? `/${this.formatDate(date)}` : '';
      const response = await fetch(`/api/business-hours${dateParam}`);
      if (!response.ok) throw new Error('Failed to fetch business hours');
      const data = await response.json();
      let arr = Array.isArray(data)
        ? data
        : (Array.isArray(data.businessHours) ? data.businessHours
          : (Array.isArray(data.businessHours) ? data.businessHours : []));
      this.businessHours = arr.map(bh => ({ ...bh, dayOfWeek: bh.dayOfWeek.toLowerCase() }));
      this.businessHoursMap = {};
      this.businessHours.forEach(bh => {
        // Always use lowercased keys for mapping
        this.businessHoursMap[bh.dayOfWeek.toLowerCase()] = bh;
      });
      // Debug: log the mapping for weekly view
  // console.log('[fetchBusinessHours] businessHoursMap:', this.businessHoursMap);
      return this.businessHours;
    } catch (e) {
      this.businessHours = [];
      return this.businessHours;
    }
  }

  /**
   * Fetches schedule exceptions from the backend.
   */
  async fetchScheduleExceptions() {
    try {
      const response = await fetch('/api/schedule-exceptions');
      if (!response.ok) throw new Error('Failed to fetch schedule exceptions');
      this.scheduleExceptions = await response.json();
      return this.scheduleExceptions;
    } catch (e) {
      this.scheduleExceptions = [];
      return this.scheduleExceptions;
    }
  }

  /**
   * Checks if a given date is open for booking, considering exceptions and business hours.
   */
  isDayOpen(date) {
    const dateStr = this.formatDate(date);
    const exception = this.getScheduleException(dateStr);
    if (exception) {
      if (exception.isClosed) return false;
      if (exception.customOpenTime && exception.customCloseTime) return true;
    }
    if (!this.businessHours.length) return false;
    const dayOfWeek = this.getDayOfWeekString(date).toLowerCase();
    const businessDay = this.businessHoursMap[dayOfWeek];
    if (!businessDay) return false;
    if (!businessDay.isOpen) return false;
    if (!businessDay.openTime || !businessDay.closeTime) return false;
    return true;
  }



  // --- WEEKLY VIEW AUTO-ADVANCE FEATURE ---
  /**
   * Checks if the current week has any available (future and unfilled) slots.
   * If not, advances to the next week with available slots.
   * Should be called after rendering the weekly view.
   * @param {Array} weekSlots - Array of slot objects for the current week
   * @param {Function} renderWeekFn - Function to render a given week (accepts a Date object for Monday)
   * @param {Date} currentMonday - The Monday date of the current week
   */
  async autoAdvanceIfNoAvailableSlots(weekSlots, renderWeekFn, currentMonday) {
    const now = new Date();
    // Filter for available slots: not filled and in the future
    const available = weekSlots.filter(slot => {
      const slotDate = new Date(slot.date + 'T' + slot.time);
      return !slot.filled && slotDate > now;
    });
    if (available.length > 0) return; // There are available slots this week

    // Try next week (up to 12 weeks ahead for safety)
    let weeksAhead = 1;
    let found = false;
    let nextMonday = new Date(currentMonday);
    while (weeksAhead <= 12 && !found) {
      nextMonday.setDate(currentMonday.getDate() + 7 * weeksAhead);
      // Fetch slots for nextMonday's week
      let nextWeekSlots = await this.fetchSlotsForWeek(nextMonday);
      const nextAvailable = nextWeekSlots.filter(slot => {
        const slotDate = new Date(slot.date + 'T' + slot.time);
        return !slot.filled && slotDate > now;
      });
      if (nextAvailable.length > 0) {
        found = true;
        renderWeekFn(nextMonday); // Render the next available week
        break;
      }
      weeksAhead++;
    }
    if (!found) {
      if (typeof window.showError === 'function') {
        window.showError('No se encontraron horarios disponibles en las próximas semanas.');
      } else {
        alert('No se encontraron horarios disponibles en las próximas semanas.');
      }
    }
  }

  /**
   * Fetch slots for a week given a Monday date.
   * @param {Date} mondayDate
   * @returns {Promise<Array>} Array of slot objects for the week
   */
  async fetchSlotsForWeek(mondayDate) {
    // Format mondayDate as yyyy-mm-dd
    const yyyy = mondayDate.getFullYear();
    const mm = String(mondayDate.getMonth() + 1).padStart(2, '0');
    const dd = String(mondayDate.getDate()).padStart(2, '0');
    const weekStart = `${yyyy}-${mm}-${dd}`;
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
      console.error('Error fetching slots for week:', e);
      return [];
    }
  }
}
