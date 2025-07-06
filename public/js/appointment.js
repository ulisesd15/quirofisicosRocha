const calendarEl = document.getElementById('calendar');
const timeSelect = document.getElementById('timeSelect');
const bookingForm = document.getElementById('bookingForm');
const dateInput = document.getElementById('dateInput');
const menuToggle = document.getElementById('menu_toggle');
const guestFields = document.getElementById('guestFields');
const navItems = document.getElementById('nav-items');
const userId = localStorage.getItem('user_id');
let currentUser = null;

// This script handles the appointment booking page functionality
document.addEventListener('DOMContentLoaded', () => {
  // Setup menu toggle button show/hide
  const offcanvas = document.getElementById('sideNav');
  offcanvas.addEventListener('show.bs.offcanvas', () => menuToggle.style.display = 'none');
  offcanvas.addEventListener('hidden.bs.offcanvas', () => menuToggle.style.display = 'block');

  // Setup calendar UI
  generateCalendar();

  // Setup navbar
  navItems.innerHTML = userId
    ? `<li><a href="/index.html" class="btn btn-outline-secondary w-100 mb-2">Inicio</a></li>
       <li><a href="#" id="logoutBtn" class="btn btn-danger w-100 mb-2">Cerrar Sesión</a></li>`
    : `<li><a href="/index.html" class="btn btn-outline-secondary w-100 mb-2">Inicio</a></li>
       <li><a href="/login.html" class="btn btn-outline-success w-100 mb-2">Iniciar Sesión</a></li>
       <li><a href="/register.html" class="btn btn-outline-secondary w-100 mb-2">Crear Cuenta</a></li>`;

  document.addEventListener('click', (e) => {
    if (e.target.id === 'logoutBtn') {
      localStorage.removeItem('user_id');
      alert('Sesión cerrada exitosamente.');
      window.location.href = '/index.html';
    }
  });

  // Auth check: logged in vs guest
  if (userId) {
  guestFields.style.display = 'none';
  guestFields.querySelectorAll('input').forEach(input => input.disabled = true);

  fetch(`/api/user/${userId}`)
    .then(res => {
      if (!res.ok) throw new Error('User not found');
      return res.json();
    })
    .then(data => {
      currentUser = data;
    })
    .catch(err => {
      console.error('Error fetching user info:', err);
      alert('Error cargando tu perfil. Intenta más tarde.');
    });
}


  } 
);

// Handle form submission
document.getElementById('bookingForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);

  const data = {
    full_name: formData.get('full_name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
  };

  if (userId) {
    if (!currentUser) {
      alert('Espere un momento mientras cargamos su información...');
      return;
    }
  

  data.full_name = data.full_name || currentUser.full_name;
  data.email = data.email || currentUser.email;
  data.phone = data.phone || currentUser.phone;
  data.date = formData.get('date');
  data.time = formData.get('time');
  data.note = formData.get('note') || '';
  data.created_at = new Date().toISOString();
  data.user_id = userId || null;
  if (!data.date || !data.time) {
    alert('Por favor, seleccione una fecha y hora válidas.');
    return;
  }
  if (data.date < new Date().toISOString().split('T')[0]) {
    alert('La fecha seleccionada no puede ser anterior a hoy.');
    return;
  }
  
  if (await isDayFullyBooked(data.date)) {
    alert('Lo sentimos, todas las citas para este día están reservadas.');
    return;
  }
  } else {
    // Guest booking
    data.full_name = formData.get('name');
    data.email = formData.get('email');
    data.phone = formData.get('phone');
  } 

  await submitAppointment(data, e);
});


// Submit helper
async function submitAppointment(data, e) {
  try {
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    console.log('data sent:', data);
    const result = await res.json();
    alert(result.message || 'Cita agendada correctamente');
    e.target.reset();
  } catch (err) {
    alert('Error al agendar la cita');
    console.error(err);
  }
}

// Appointment calendar logic
const HOURS = ["12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"];

// Fetch appointments for a specific date
async function fetchAppointments(date) {
  const res = await fetch('/api/appointments');
  const all = await res.json();
  return all.filter(appt => appt.date === date).map(appt => appt.time.slice(0, 5));
}

// Check if a day is fully booked
async function isDayFullyBooked(date) {
  const taken = await fetchAppointments(date);
  return taken.length >= HOURS.length;
}

// Generate the calendar buttons for the next 7 days
function generateCalendar() {
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const day = new Date(today);
    day.setDate(today.getDate() + i);
    const yyyyMMdd = day.toISOString().split('T')[0];

    const button = document.createElement('button');
    button.textContent = day.toDateString().slice(0, 10);
    button.className = 'btn me-2 mb-2';
    button.dataset.date = yyyyMMdd;

    if (day < today) {
      button.disabled = true;
      button.classList.add('disabled');
    }

    if (i === 0) {
      button.classList.add('btn-primary');
      button.textContent += ' (Hoy)';
    } else {
      button.classList.add('btn-outline-secondary');
    }

    button.addEventListener('click', async () => {
      dateInput.value = yyyyMMdd;
      const taken = await fetchAppointments(yyyyMMdd);
      timeSelect.innerHTML = '';

      HOURS.forEach(time => {
        if (!taken.includes(time)) {
          const opt = document.createElement('option');
          opt.value = time;
          opt.textContent = time;
          timeSelect.appendChild(opt);
        }
      });

      bookingForm.style.display = timeSelect.children.length === 0 ? 'none' : 'block';
    });

    isDayFullyBooked(yyyyMMdd).then(full => {
      if (full) button.classList.add('btn-dark');
    });

    calendarEl.appendChild(button);
  }
}
