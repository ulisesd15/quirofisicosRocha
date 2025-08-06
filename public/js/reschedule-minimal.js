/**
 * Reschedule Appointment - Minimal Working Version
 */

console.log('🔄 Reschedule.js loaded (minimal version)');

let appointmentId = null;
let currentAppointment = null;

// DOM Elements
let currentAppointmentAlert, timeCardsEl, selectedDateInput, selectedTimeInput, bookingForm;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🔄 DOMContentLoaded fired');
    
    // Get appointment ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    appointmentId = urlParams.get('id');
    
    console.log('🔄 Appointment ID:', appointmentId);
    
    if (!appointmentId) {
        showMessage('ID de cita no encontrado', 'error');
        return;
    }
    
    // Initialize DOM elements
    initDOM();
    
    // Load appointment data
    await loadAppointment();
    
    // Initialize calendar
    initCalendar();
    
    console.log('🔄 Initialization complete');
});

function initDOM() {
    currentAppointmentAlert = document.getElementById('currentAppointmentAlert');
    timeCardsEl = document.getElementById('timeCards');
    selectedDateInput = document.getElementById('selectedDate');
    selectedTimeInput = document.getElementById('selectedTime');
    bookingForm = document.getElementById('bookingForm');
    
    console.log('🔄 DOM elements initialized');
}

async function loadAppointment() {
    console.log('🔄 Loading appointment...');
    
    try {
        const response = await fetch(`/api/appointments-test/${appointmentId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        currentAppointment = await response.json();
        console.log('🔄 Appointment loaded:', currentAppointment);
        
        displayAppointmentInfo();
        
    } catch (error) {
        console.error('🔄 Error loading appointment:', error);
        showMessage('Error cargando la cita: ' + error.message, 'error');
    }
}

function displayAppointmentInfo() {
    if (!currentAppointment || !currentAppointmentAlert) return;
    
    const appointmentDate = new Date(currentAppointment.appointment_date + 'T' + currentAppointment.appointment_time);
    const formattedDate = appointmentDate.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const formattedTime = appointmentDate.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    currentAppointmentAlert.innerHTML = `
        <h5 class="alert-heading">📅 Cita Actual</h5>
        <p class="mb-0">
            <strong>Fecha:</strong> ${formattedDate}<br>
            <strong>Hora:</strong> ${formattedTime}<br>
            <strong>Servicio:</strong> ${currentAppointment.service_type || 'Consulta General'}
        </p>
    `;
    
    console.log('🔄 Appointment info displayed');
}

function initCalendar() {
    console.log('🔄 Initializing calendar...');
    
    // Create a simple calendar for the next 7 days
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;
    
    const today = new Date();
    let calendarHTML = '<div class="row">';
    
    for (let i = 1; i <= 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        const dayName = date.toLocaleDateString('es-ES', { weekday: 'short' });
        const dayNumber = date.getDate();
        const isToday = date.toDateString() === today.toDateString();
        const dateISO = date.toISOString().split('T')[0];
        
        calendarHTML += `
            <div class="col">
                <div class="calendar-day ${isToday ? 'today' : ''}" onclick="selectDate('${dateISO}')">
                    <div class="day-name">${dayName}</div>
                    <div class="day-number">${dayNumber}</div>
                </div>
            </div>
        `;
    }
    
    calendarHTML += '</div>';
    calendarEl.innerHTML = calendarHTML;
    
    console.log('🔄 Calendar initialized');
}

async function selectDate(dateISO) {
    console.log('🔄 Date selected:', dateISO);
    
    // Update selected date input
    if (selectedDateInput) {
        selectedDateInput.value = dateISO;
    }
    
    // Update display
    const displayDate = document.getElementById('displayDate');
    if (displayDate) {
        const date = new Date(dateISO);
        displayDate.textContent = date.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    // Highlight selected date
    document.querySelectorAll('.calendar-day').forEach(day => {
        day.classList.remove('selected');
    });
    event.target.closest('.calendar-day').classList.add('selected');
    
    // Load time slots for this date
    await loadTimeSlots(dateISO);
}

async function loadTimeSlots(dateISO) {
    console.log('🔄 Loading time slots for:', dateISO);
    
    if (!timeCardsEl) return;
    
    try {
        // Show loading state
        timeCardsEl.innerHTML = '<p class="text-muted">Cargando horarios...</p>';
        
        // Try to fetch actual available slots
        let timeSlots = [];
        try {
            const response = await fetch(`/api/available-slots?date=${dateISO}`);
            if (response.ok) {
                const data = await response.json();
                timeSlots = data.slots || [];
                console.log('🔄 Actual slots loaded:', timeSlots);
            } else {
                throw new Error('API not available');
            }
        } catch (error) {
            console.log('🔄 Using demo time slots');
            // Fallback to demo slots
            for (let hour = 9; hour <= 17; hour++) {
                if (hour === 12) continue; // Skip lunch
                const timeString = `${hour.toString().padStart(2, '0')}:00`;
                timeSlots.push({
                    time: timeString,
                    available: Math.random() > 0.3 // Random availability for demo
                });
            }
        }
        
        if (timeSlots.length === 0) {
            timeCardsEl.innerHTML = '<p class="text-muted">No hay horarios disponibles para esta fecha</p>';
            return;
        }
        
        let timeSlotsHTML = '';
        timeSlots.forEach(slot => {
            const disabled = !slot.available ? 'disabled' : '';
            const btnClass = slot.available ? 'btn-outline-primary' : 'btn-outline-secondary';
            
            timeSlotsHTML += `
                <button type="button" 
                        class="btn ${btnClass} time-slot ${disabled}" 
                        onclick="selectTime('${slot.time}')"
                        ${disabled}>
                    ${slot.time}
                </button>
            `;
        });
        
        timeCardsEl.innerHTML = timeSlotsHTML;
        console.log('🔄 Time slots rendered');
        
    } catch (error) {
        console.error('🔄 Error loading time slots:', error);
        timeCardsEl.innerHTML = '<p class="text-danger">Error cargando horarios disponibles</p>';
    }
}

function selectTime(timeSlot) {
    console.log('🔄 Time selected:', timeSlot);
    
    // Update selected time input
    if (selectedTimeInput) {
        selectedTimeInput.value = timeSlot;
    }
    
    // Update display
    const displayTime = document.getElementById('displayTime');
    if (displayTime) {
        displayTime.textContent = timeSlot;
    }
    
    // Highlight selected time
    document.querySelectorAll('.time-slot').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-outline-primary');
    });
    event.target.classList.remove('btn-outline-primary');
    event.target.classList.add('btn-primary');
    
    // Enable form submission
    const submitBtn = document.querySelector('#bookingForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = false;
    }
}

// Form submission
if (document.getElementById('bookingForm')) {
    document.getElementById('bookingForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const selectedDate = selectedDateInput?.value;
        const selectedTime = selectedTimeInput?.value;
        
        if (!selectedDate || !selectedTime) {
            showMessage('Por favor selecciona fecha y hora', 'error');
            return;
        }
        
        console.log('🔄 Submitting reschedule:', { selectedDate, selectedTime });
        
        try {
            const response = await fetch(`/api/appointments/${appointmentId}/reschedule`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    newDate: selectedDate,
                    newTime: selectedTime
                })
            });
            
            if (!response.ok) {
                throw new Error('Error rescheduling appointment');
            }
            
            const result = await response.json();
            console.log('🔄 Reschedule successful:', result);
            
            showMessage('¡Cita reagendada exitosamente!', 'success');
            
            setTimeout(() => {
                window.location.href = 'mis-citas.html';
            }, 2000);
            
        } catch (error) {
            console.error('🔄 Reschedule error:', error);
            showMessage('Error reagendando la cita: ' + error.message, 'error');
        }
    });
}

// Utility functions
function showMessage(message, type = 'info') {
    console.log(`🔄 Message (${type}):`, message);
    
    // Create or update message div
    let messageDiv = document.getElementById('messageDiv');
    if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.id = 'messageDiv';
        messageDiv.style.position = 'fixed';
        messageDiv.style.top = '20px';
        messageDiv.style.right = '20px';
        messageDiv.style.zIndex = '9999';
        document.body.appendChild(messageDiv);
    }
    
    const alertClass = type === 'error' ? 'alert-danger' : 
                     type === 'success' ? 'alert-success' : 'alert-info';
    
    messageDiv.innerHTML = `
        <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        messageDiv.innerHTML = '';
    }, 5000);
}

console.log('🔄 Reschedule.js fully loaded');
