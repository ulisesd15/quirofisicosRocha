const calendarEl = document.getElementById('calendar');
const timeSelect = document.getElementById('timeSelect');
const bookingForm = document.getElementById('bookingForm');
const dateInput = document.getElementById('dateInput');
const menuToggle = document.getElementById('menu_toggle');

document.addEventListener('DOMContentLoaded', () => {
  const navItems = document.getElementById('nav-items');
  const userId = localStorage.getItem('user_id');

    navItems.innerHTML = userId
      ? `
        <li><a href="/index.html" class="btn btn-outline-secondary w-100 mb-2">Inicio</a></li>
        <li><a href="#" id="logoutBtn" class="btn btn-danger w-100 mb-2">Cerrar Sesión</a></li>
        `
      : `
        <li><a href="/index.html" class="btn btn-outline-secondary w-100 mb-2">Inicio</a></li>
        <li><a href="/login.html" class="btn btn-outline-success w-100 mb-2">Iniciar Sesión</a></li>
        <li><a href="/register.html" class="btn btn-outline-secondary w-100 mb-2">Crear Cuenta</a></li>
      `;

    document.addEventListener('click', (e) => {
      if (e.target.id === 'logoutBtn') {
        localStorage.removeItem('user_id');
        alert('Sesión cerrada exitosamente.');
        window.location.href = '/index.html';
      }
    });
  });

  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      date: formData.get('date'),
      time: formData.get('time'),
      note: formData.get('note')
    };

    if (userId) {
      data.user_id = userId;
    } else {
      data.name = formData.get('name');
      data.email = formData.get('email');
      data.phone = formData.get('phone');
    }

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();
      alert(result.message || 'Cita agendada correctamente');
      e.target.reset();
    } catch (err) {
      alert('Error al agendar la cita');
      console.error(err);
    }
  });



  const HOURS = ["12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"];
  const userId = localStorage.getItem('user_id');

  if (!userId) {
    document.getElementById('guestFields').style.display = 'block';
  } else {
    document.getElementById('guestFields').style.display = 'none';
  }

  async function fetchAppointments(date) {
    const res = await fetch('/api/appointments');
    const all = await res.json();
    return all.filter(appt => appt.date === date).map(appt => appt.time.slice(0, 5));
  }

  async function isDayFullyBooked(date) {
    const taken = await fetchAppointments(date);
    return taken.length >= HOURS.length;
  }

 document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.querySelector('#menu_toggle');
  const offcanvas = document.getElementById('sideNav');

  // Hide toggle button when offcanvas opens
  offcanvas.addEventListener('show.bs.offcanvas', () => {
    menuToggle.style.display = 'none';
  });

  // Show toggle button again when offcanvas closes
  offcanvas.addEventListener('hidden.bs.offcanvas', () => {
    menuToggle.style.display = 'block';
  });
});


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

  generateCalendar();

