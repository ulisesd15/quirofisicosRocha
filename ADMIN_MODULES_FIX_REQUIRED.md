# CRITICAL: Admin Modules Field Name Mismatch

## Problem

The admin modals have been updated to use **camelCase** field names (matching Sequelize models), but the admin JavaScript modules in `admin/js/modules/` are still using **snake_case** field names from the old MySQL implementation.

## Impact

The **modal scripts work correctly** (they were updated with inline JavaScript), but any code in the module files that calls the API will fail because:

1. **Modals use camelCase** (NEW) → ✅ Works
2. **Module files use snake_case** (OLD) → ❌ Broken

## Files That Need Updates

### 1. `admin/js/modules/announcements.js`

**Lines 52-60** - `saveAnnouncement()` method:

```javascript
// CURRENT (BROKEN):
const formData = {
  title: document.getElementById('announcement-title').value,
  message: document.getElementById('announcement-content').value,
  announcement_type: document.getElementById('announcement-type').value,  // ❌ WRONG
  priority: document.getElementById('announcement-priority').value,
  start_date: document.getElementById('announcement-start-date').value,    // ❌ WRONG
  end_date: document.getElementById('announcement-end-date').value,        // ❌ WRONG
  show_on_homepage: document.getElementById('announcement-active').checked, // ❌ WRONG
  show_on_booking: false
};

// SHOULD BE (CORRECT):
const formData = {
  title: document.getElementById('announcement-title').value,
  message: document.getElementById('announcement-content').value,
  announcementType: document.getElementById('announcement-type').value,    // ✅ FIXED
  priority: document.getElementById('announcement-priority').value,
  startDate: document.getElementById('announcement-start-date').value,     // ✅ FIXED
  endDate: document.getElementById('announcement-end-date').value,         // ✅ FIXED
  showOnHomepage: document.getElementById('announcement-active').checked,  // ✅ FIXED
  showOnBooking: false
};
```

**Lines 106-125** - `renderAnnouncements()` method - Reading data:

```javascript
// CURRENT (BROKEN):
announcement.announcement_type  // ❌ WRONG
announcement.start_date         // ❌ WRONG
announcement.end_date           // ❌ WRONG
announcement.show_on_homepage   // ❌ WRONG
announcement.show_on_booking    // ❌ WRONG
announcement.created_by_name    // ❌ WRONG

// SHOULD BE (CORRECT):
announcement.announcementType   // ✅ FIXED
announcement.startDate          // ✅ FIXED
announcement.endDate            // ✅ FIXED
announcement.showOnHomepage     // ✅ FIXED
announcement.showOnBooking      // ✅ FIXED
announcement.createdByName || (announcement.creator ? announcement.creator.fullName : 'Admin')  // ✅ FIXED
```

### 2. `admin/js/modules/users.js`

**Lines 170-176** - `saveUserChanges()` method:

```javascript
// CURRENT (MOSTLY CORRECT, but check API response handling)
const data = {
  fullName: document.getElementById('edit-user-name').value,  // ✅ CORRECT
  email: document.getElementById('edit-user-email').value,    // ✅ CORRECT
  phone: document.getElementById('edit-user-phone').value,    // ✅ CORRECT
  role: document.getElementById('edit-user-role').value       // ✅ CORRECT
};
// Note: Missing 'provider' field that the modal includes
```

**Lines 296-297** - Display users - Check pagination response:

```javascript
// Make sure this reads from correct field:
this.updateUsersCount(data.pagination.total_records);  // ❌ May be wrong
// Should be:
this.updateUsersCount(data.pagination.totalRecords);   // ✅ Check API response
```

### 3. `admin/js/modules/schedule.js`

**Lines 112-127** - `saveBusinessHours()` method:

```javascript
// CURRENT (BROKEN):
const businessHours = days.map(day => {
  const dayLower = day.toLowerCase();
  const isOpen = document.getElementById(`open-${dayLower}`)?.checked || false;
  return {
    day_of_week: day,        // ❌ WRONG
    is_open: isOpen ? 1 : 0, // ❌ WRONG
    open_time: ...,          // ❌ WRONG
    close_time: ...,         // ❌ WRONG
    break_start: ...,        // ❌ WRONG
    break_end: ...           // ❌ WRONG
  };
});

// SHOULD BE (CORRECT):
const businessHours = days.map(day => {
  const dayLower = day.toLowerCase();
  const isOpen = document.getElementById(`open-${dayLower}`)?.checked || false;
  return {
    dayOfWeek: day,                    // ✅ FIXED
    isOpen: isOpen,                    // ✅ FIXED (boolean, not 1/0)
    openTime: isOpen ? ... : null,     // ✅ FIXED
    closeTime: isOpen ? ... : null,    // ✅ FIXED
    breakStart: isOpen ? ... : null,   // ✅ FIXED
    breakEnd: isOpen ? ... : null      // ✅ FIXED
  };
});
```

**Lines 134-135** - Also need to update effective_date:

```javascript
// CURRENT:
effective_date: datePicker ? datePicker.value : null  // ❌ WRONG

// SHOULD BE:
effectiveDate: datePicker ? datePicker.value : null   // ✅ FIXED
```

**Lines 360-366** - `displayBusinessHours()` normalization:

```javascript
// The function already tries to normalize, but should consistently use camelCase:
function normalizeHours(obj) {
  if (!obj) return {};
  return {
    dayOfWeek: obj.dayOfWeek || obj.day_of_week || '',      // Handle both
    isOpen: obj.isOpen !== undefined ? obj.isOpen : obj.is_open,
    openTime: obj.openTime || obj.open_time || '',
    closeTime: obj.closeTime || obj.close_time || '',
    breakStart: obj.breakStart || obj.break_start || '',
    breakEnd: obj.breakEnd || obj.break_end || ''
  };
}
```

**Lines 737-752** - `saveScheduleException()` method:

```javascript
// CURRENT (BROKEN):
const formData = {
  exception_type: ...,      // ❌ WRONG
  start_date: ...,          // ❌ WRONG  
  end_date: ...,            // ❌ WRONG
  is_closed: ...,           // ❌ WRONG
  custom_open_time: ...,    // ❌ WRONG
  custom_close_time: ...,   // ❌ WRONG
  custom_break_start: ...,  // ❌ WRONG
  custom_break_end: ...,    // ❌ WRONG
  recurring_type: ...       // ❌ WRONG
};

// SHOULD BE (CORRECT):
const formData = {
  type: ...,                // ✅ FIXED (changed from exception_type)
  startDate: ...,           // ✅ FIXED
  endDate: ...,             // ✅ FIXED
  isClosed: ...,            // ✅ FIXED
  customOpenTime: ...,      // ✅ FIXED
  customCloseTime: ...,     // ✅ FIXED
  customBreakStart: ...,    // ✅ FIXED
  customBreakEnd: ...,      // ✅ FIXED
  recurringType: ...,       // ✅ FIXED
  reason: ...,              // Add this required field
  description: ...          // Add this field
};
```

**Lines 810-820** - `renderScheduleExceptions()` - Reading data:

```javascript
// CURRENT (BROKEN):
exception.is_closed            // ❌ WRONG
exception.recurring_type       // ❌ WRONG
exception.start_date           // ❌ WRONG
exception.end_date             // ❌ WRONG
exception.custom_open_time     // ❌ WRONG
exception.custom_close_time    // ❌ WRONG
exception.exception_type       // ❌ WRONG

// SHOULD BE (CORRECT):
exception.isClosed             // ✅ FIXED
exception.recurringType        // ✅ FIXED
exception.startDate            // ✅ FIXED
exception.endDate              // ✅ FIXED
exception.customOpenTime       // ✅ FIXED
exception.customCloseTime      // ✅ FIXED
exception.type                 // ✅ FIXED
```

**Lines 834-851** - `saveHolidayTemplate()` method:

```javascript
// CURRENT (BROKEN) - Multiple snake_case fields
const data = {
  holiday_type: ...,      // ❌ WRONG
  closure_type: ...,      // ❌ WRONG
  is_recurring: ...,      // ❌ WRONG
  is_active: ...,         // ❌ WRONG
  custom_open_time: ...,  // ❌ WRONG
  custom_close_time: ...  // ❌ WRONG
};

// SHOULD BE (CORRECT):
const data = {
  holidayType: ...,       // ✅ FIXED
  closureType: ...,       // ✅ FIXED
  isRecurring: ...,       // ✅ FIXED
  isActive: ...,          // ✅ FIXED
  customOpenTime: ...,    // ✅ FIXED
  customCloseTime: ...    // ✅ FIXED
};
```

## Solution Options

### Option 1: Update Module Files (Recommended)

Update all three module files to use camelCase consistently. This matches the Sequelize models and API endpoints.

**Pros:**
- Consistent with database models
- Matches updated modal code
- Future-proof

**Cons:**
- Requires updating 3 files with multiple changes

### Option 2: Keep Modal Inline Scripts Only

Since the modals already have working inline scripts, you could:
1. Remove the broken saveAnnouncement() from announcements.js
2. Remove the broken saveScheduleException() from schedule.js
3. Only use the module files for loading/displaying data

**Pros:**
- Modals already work
- Minimal changes needed

**Cons:**
- Code duplication
- Inconsistent architecture
- Harder to maintain

### Option 3: API Accepts Both (Not Recommended)

Modify the API routes to accept both snake_case and camelCase.

**Cons:**
- Messy code
- Not following Sequelize conventions
- Technical debt

## Recommended Action Plan

1. **Immediate:** The modals work because of inline scripts - no urgent action needed
2. **Short-term:** Update the 3 module files to use camelCase (1-2 hours)
3. **Testing:** Test each module after updating field names

## Quick Fix Script Pattern

Use Find & Replace in each module file:

```javascript
// Announcements
announcement_type → announcementType
start_date → startDate
end_date → endDate
show_on_homepage → showOnHomepage
show_on_booking → showOnBooking
created_by_name → createdByName (or use creator.fullName)

// Users
full_name → fullName (already correct in most places)
total_records → totalRecords (check pagination)

// Schedule
day_of_week → dayOfWeek
is_open → isOpen (and use boolean, not 1/0)
open_time → openTime
close_time → closeTime
break_start → breakStart
break_end → breakEnd
effective_date → effectiveDate
exception_type → type
is_closed → isClosed
custom_open_time → customOpenTime
custom_close_time → customCloseTime
custom_break_start → customBreakStart
custom_break_end → customBreakEnd
recurring_type → recurringType
holiday_type → holidayType
closure_type → closureType
is_recurring → isRecurring
is_active → isActive
```

## Current Status

- ✅ **Modals:** Fixed (inline JavaScript uses camelCase)
- ❌ **Module Files:** Need updates (still use snake_case)
- ✅ **API Routes:** Correct (expect camelCase)
- ✅ **Database Models:** Correct (use camelCase)

## Testing Checklist

After updating each module:

- [ ] Announcements: Create, edit, delete
- [ ] Users: Edit user details, change role
- [ ] Schedule: Save business hours, add exceptions
- [ ] Holiday Templates: Create, edit, generate yearly
- [ ] Check browser console for errors
- [ ] Verify data saves correctly in database
