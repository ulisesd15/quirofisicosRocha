# Admin Modals Migration Guide - Sequelize Database Integration

This guide explains how to update admin modals to work with the new Sequelize database and API routes.

## Overview

The admin panel has been migrated from direct MySQL queries to Sequelize ORM. All API routes now follow RESTful conventions and use camelCase field names matching the Sequelize models.

## ✅ Completed Modals

- ✅ **addAnnouncementModal.html** - Connected to `/api/admin/announcements` (POST)
- ✅ **editUserModal.html** - Connected to `/api/admin/users/:id` (PUT)
- ✅ **addScheduleExceptionModal.html** - Connected to `/api/admin/schedule-exceptions` (POST)

## API Endpoints Reference

### Announcements
- `GET /api/admin/announcements` - List all announcements
- `POST /api/admin/announcements` - Create announcement
- `PUT /api/admin/announcements/:id` - Update announcement
- `DELETE /api/admin/announcements/:id` - Delete (soft delete)

**Fields:** `title`, `message`, `announcementType`, `priority`, `startDate`, `endDate`, `showOnHomepage`, `showOnBooking`

### Users
- `GET /api/admin/users` - List users (paginated)
- `GET /api/admin/users/:id` - Get single user
- `PUT /api/admin/users/:id` - Update user
- `PUT /api/admin/users/:id/role` - Update user role
- `PUT /api/admin/users/:id/verify` - Verify user
- `DELETE /api/admin/users/:id` - Delete user

**Fields:** `fullName`, `email`, `phone`, `role`, `provider` (mapped from `authProvider`)

### Appointments
- `GET /api/admin/appointments` - List appointments (paginated)
- `GET /api/admin/appointments/:id` - Get single appointment
- `PUT /api/admin/appointments/:id` - Update appointment
- `PUT /api/admin/appointments/:id/approve` - Approve appointment
- `DELETE /api/admin/appointments/:id` - Delete appointment

**Fields:** `fullName`, `email`, `phone`, `date`, `time`, `status`, `userId`

### Business Hours
- `GET /api/admin/business-hours` - Get business hours
- `PUT /api/admin/business-hours` - Bulk update business hours
- `PUT /api/admin/business-hours/:id` - Update single day

**Fields:** `dayOfWeek`, `isOpen`, `openTime`, `closeTime`, `breakStart`, `breakEnd`

### Schedule Exceptions
- `GET /api/admin/schedule-exceptions` - List exceptions
- `POST /api/admin/schedule-exceptions` - Create exception
- `PUT /api/admin/schedule-exceptions/:id` - Update exception
- `DELETE /api/admin/schedule-exceptions/:id` - Delete (soft delete)

**Fields:** `type`, `startDate`, `endDate`, `isClosed`, `customOpenTime`, `customCloseTime`, `customBreakStart`, `customBreakEnd`, `reason`, `description`, `recurringType`

## Field Name Mapping (Old → New)

### Critical Changes

```javascript
// User fields
full_name       → fullName
auth_provider   → provider (in frontend) / authProvider (in DB)
is_verified     → isVerified
created_at      → createdAt

// Appointment fields
full_name       → fullName
user_id         → userId

// Business Hours
day_of_week     → dayOfWeek
is_open         → isOpen
open_time       → openTime
close_time      → closeTime
break_start     → breakStart
break_end       → breakEnd
effective_date  → effectiveDate

// Schedule Exceptions
start_date      → startDate
end_date        → endDate
is_closed       → isClosed
custom_open_time    → customOpenTime
custom_close_time   → customCloseTime
custom_break_start  → customBreakStart
custom_break_end    → customBreakEnd
is_recurring    → isRecurring
recurring_type  → recurringType
is_active       → isActive

// Announcements
announcement_type   → announcementType
start_date      → startDate
end_date        → endDate
show_on_homepage    → showOnHomepage
show_on_booking     → showOnBooking
created_by      → createdBy
is_active       → isActive
```

## Standard Modal Structure

Each modal should follow this pattern:

```html
<!-- Modal HTML -->
<div class="modal fade" id="modalId" tabindex="-1">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">
          <i class="fas fa-icon me-2"></i>Title
        </h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <form id="form-id">
          <!-- Form fields here -->
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
        <button type="button" class="btn btn-primary" id="save-btn-id">
          <i class="fas fa-save me-2"></i>Guardar
        </button>
      </div>
    </div>
  </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
  const modal = document.getElementById('modalId');
  const saveBtn = document.getElementById('save-btn-id');
  const form = document.getElementById('form-id');
  
  if (saveBtn) {
    saveBtn.addEventListener('click', async function() {
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      
      const data = {
        // Map form fields to API fields (camelCase)
        field1: document.getElementById('field1-id').value,
        field2: document.getElementById('field2-id').value
      };
      
      try {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Guardando...';
        
        const response = await fetch('/api/admin/endpoint', {
          method: 'POST', // or PUT for updates
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
          alert('Success message');
          bootstrap.Modal.getInstance(modal).hide();
          form.reset();
          
          // Refresh data table if function exists
          if (typeof refreshFunction === 'function') {
            refreshFunction();
          }
        } else {
          alert('Error: ' + (result.error || 'Operation failed'));
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Error al conectar con el servidor');
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save me-2"></i>Guardar';
      }
    });
  }
  
  // Reset form when modal is closed
  modal.addEventListener('hidden.bs.modal', function() {
    form.reset();
  });
});
</script>
```

## Remaining Modals to Update

### Priority 1 (Core Functionality)

1. **editAppointmentModal.html**
   - Endpoint: `PUT /api/admin/appointments/:id`
   - Fields: `fullName`, `email`, `phone`, `date`, `time`, `status`
   - Add function: `window.openEditAppointmentModal(appointment)`

2. **changePasswordModal.html**
   - Endpoint: May need to create in authRoutes
   - Fields: `currentPassword`, `newPassword`, `confirmPassword`

### Priority 2 (Schedule Management)

3. **addBusinessDayExceptionModal.html**
   - Similar to addScheduleExceptionModal
   - Use same endpoint: `POST /api/admin/schedule-exceptions`

4. **addWeekExceptionModal.html**
   - Endpoint: `POST /api/admin/schedule-exceptions`
   - Multiple day exceptions in one form

5. **addClosureModal.html**
   - Endpoint: `POST /api/admin/schedule-exceptions`
   - Set `isClosed: true`

6. **addOverrideModal.html**
   - Endpoint: `POST /api/admin/schedule-exceptions`
   - Set `isClosed: false` with custom hours

7. **addHolidayTemplateModal.html**
   - Endpoint: `POST /api/admin/schedule-exceptions`
   - Set `recurringType: 'yearly'`

### Priority 3 (Advanced Features)

8. **addBlockedSlotModal.html**
   - May need new endpoint or use appointments with special status
   - Consider: `POST /api/admin/appointments` with `status: 'blocked'`

## Common Patterns

### Date Handling
```javascript
// Set default date to today
document.getElementById('date-field').valueAsDate = new Date();

// Get date value
const dateValue = document.getElementById('date-field').value; // YYYY-MM-DD format
```

### Time Handling
```javascript
// Set default time
document.getElementById('time-field').value = '09:00';

// Get time value
const timeValue = document.getElementById('time-field').value; // HH:MM format
```

### Authentication Header
```javascript
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
}
```

### Error Handling
```javascript
if (response.ok) {
  // Success
  alert('Success message');
  bootstrap.Modal.getInstance(modal).hide();
  form.reset();
  if (typeof refreshFunction === 'function') {
    refreshFunction();
  }
} else {
  // Error from server
  const result = await response.json();
  alert('Error: ' + (result.error || 'Operation failed'));
}
```

## Testing Checklist

For each modal:

- [ ] Form validation works (required fields)
- [ ] Success message appears
- [ ] Modal closes after save
- [ ] Data refreshes in table/list
- [ ] Error messages display properly
- [ ] Loading state shows during save
- [ ] Form resets when modal closes
- [ ] Network errors are caught and displayed

## Database Models Reference

### User Model
```javascript
{
  id: INTEGER (PK),
  fullName: STRING,
  email: STRING (unique),
  phone: STRING,
  password: STRING,
  authProvider: ENUM('local', 'google', 'facebook'),
  role: ENUM('user', 'admin'),
  isVerified: BOOLEAN,
  createdAt: DATE,
  updatedAt: DATE
}
```

### Appointment Model
```javascript
{
  id: INTEGER (PK),
  userId: INTEGER (FK),
  fullName: STRING,
  email: STRING,
  phone: STRING,
  date: DATEONLY,
  time: TIME,
  status: ENUM('pending', 'confirmed', 'cancelled', 'completed'),
  createdAt: DATE,
  updatedAt: DATE
}
```

### ScheduleException Model
```javascript
{
  id: INTEGER (PK),
  type: ENUM('CLOSURE', 'OVERRIDE_HOURS', 'HOLIDAY'),
  startDate: DATEONLY,
  endDate: DATEONLY,
  customOpenTime: TIME,
  customCloseTime: TIME,
  customBreakStart: TIME,
  customBreakEnd: TIME,
  reason: STRING,
  description: TEXT,
  isRecurring: BOOLEAN,
  recurringType: ENUM('yearly'),
  isActive: BOOLEAN,
  createdAt: DATE,
  updatedAt: DATE
}
```

### Announcement Model
```javascript
{
  id: INTEGER (PK),
  title: STRING,
  message: TEXT,
  announcementType: ENUM('info', 'warning', 'success', 'danger'),
  priority: ENUM('low', 'normal', 'high', 'urgent'),
  startDate: DATE,
  endDate: DATE,
  showOnHomepage: BOOLEAN,
  showOnBooking: BOOLEAN,
  createdBy: INTEGER (FK),
  isActive: BOOLEAN,
  createdAt: DATE,
  updatedAt: DATE
}
```

## Tips & Best Practices

1. **Always use camelCase** for field names when sending to API
2. **Include Authorization header** in all admin API calls
3. **Validate forms** before submitting (use `form.checkValidity()`)
4. **Show loading states** during API calls (disable button, show spinner)
5. **Handle errors gracefully** with try-catch and user-friendly messages
6. **Reset forms** when modal closes to prevent data persistence
7. **Refresh data** after successful operations
8. **Use Bootstrap 5 Modal API** for proper modal control
9. **Follow consistent naming** conventions for IDs and classes
10. **Test with real data** to ensure proper field mapping

## Need Help?

If you encounter issues:

1. Check browser console for JavaScript errors
2. Check network tab for API response errors
3. Verify field names match the API expectations (camelCase)
4. Ensure authentication token is present in localStorage
5. Check that the API endpoint exists in adminRoutes.js
6. Verify the HTTP method (GET, POST, PUT, DELETE) matches the route

## Example: Complete Modal Update

See the following files for complete examples:
- `admin/modals/addAnnouncementModal.html`
- `admin/modals/editUserModal.html`
- `admin/modals/addScheduleExceptionModal.html`

These modals demonstrate the complete pattern with proper:
- Form validation
- API integration
- Error handling
- Loading states
- Form reset
- Data refresh
