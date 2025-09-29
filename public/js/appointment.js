/**
 * appointment.js
 *
 * Handles the initialization and view toggling logic for the appointment booking calendar page.
 * - Instantiates a Calendar object and renders the weekly calendar on page load.
 * - Provides UI logic to toggle between weekly and monthly calendar views.
 * - Resets slot containers and selected date when switching views.
 * - Delegates all calendar rendering and slot-fetching logic to the Calendar class (imported).
 */

import { Calendar } from './calendar.js';

// Create a Calendar instance
const calendar = new Calendar();

// --- Initialization ---
/**
 * Sets up the page after DOM is loaded:
 * - Renders the weekly calendar by default.
 * - Initializes the calendar view toggle logic.
 */
document.addEventListener('DOMContentLoaded', () => {
  calendar.renderWeeklyCalendar();
  // --- Calendar View Toggle Logic ---
  /**
   * Sets up event listeners for toggling between week and month calendar views.
   * Handles UI state and resets slot containers and selected date as needed.
   */
  function setupCalendarViewToggle() {
    const weekRadio = document.getElementById('weekView');
    const monthRadio = document.getElementById('monthView');
    const weekContainer = document.getElementById('weekViewContainer');
    const monthContainer = document.getElementById('monthViewContainer');
    if (!weekRadio || !monthRadio || !weekContainer || !monthContainer) return;
    weekRadio.addEventListener('change', () => {
      // Switch to weekly view, reset containers and selected date
      if (weekRadio.checked) {
        weekContainer.style.display = '';
        monthContainer.style.display = 'none';
        const monthViewContainer = document.getElementById('monthViewContainer');
        if (monthViewContainer) monthViewContainer.innerHTML = '';
        const slotContainer = document.getElementById('timeCards');
        if (slotContainer) slotContainer.innerHTML = '';
        calendar.selectedDate = null;
      }
    });
    monthRadio.addEventListener('change', () => {
      // Switch to monthly view, reset containers and selected date, then render month
      if (monthRadio.checked) {
        const today = new Date();
        calendar.currentMonth = today.getMonth();
        calendar.currentYear = today.getFullYear();
        weekContainer.style.display = 'none';
        monthContainer.style.display = '';
        const slotContainer = document.getElementById('timeCards');
        if (slotContainer) slotContainer.innerHTML = '';
        calendar.selectedDate = null;
        setTimeout(() => {
          calendar.renderMonthlyCalendar();
        }, 50);
      }
    });
  }
  setupCalendarViewToggle();
});
// (autoAdvanceIfNoAvailableSlots and fetchSlotsForWeek are now part of the Calendar class)
