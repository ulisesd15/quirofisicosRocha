const calendarEl = document.getElementById('calendar');
const timeContainer = document.getElementById('times');
const bookingForm = document.getElementById('bookingForm');
const dateInput = document.getElementById('dateInput');
const timeSelect = document.getElementById('timeSelect');

const HOURS = ["12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"];

const isLoggedIn = localStorage.getItem('user_id'); // Set this after login

// Check if user is logged in
if (isLoggedIn) {
  document.querySelector('[name="name"]').style.display = 'none';
  document.querySelector('[name="email"]').style.display = 'none';
  document.querySelector('[name="phone"]').style.display = 'none';
} else {
  document.querySelector('[name="name"]').required = true;
  document.querySelector('[name="email"]').required = true;
  document.querySelector('[name="phone"]').required = true;
}


// Simulate fetching taken times from backend
async function fetchAppointments(date) {
  const res = await fetch('/api/appointments');
  const all = await res.json();
  return all.filter(appt => appt.date === date).map(appt => appt.time.slice(0, 5));
}

function generateCalendar() {
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const day = new Date(today);
    day.setDate(today.getDate() + i);
    const yyyyMMdd = day.toISOString().split('T')[0];

    const button = document.createElement('button');
    button.textContent = day.toDateString().slice(0, 10);
    button.className = 'btn btn-outline-secondary';
    button.dataset.date = yyyyMMdd;

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

      if (timeSelect.children.length === 0) {
        alert('No hay horarios disponibles para este día.');
        bookingForm.style.display = 'none';
      } else {
        bookingForm.style.display = 'block';
      }
    });

    // Disable past dates
    if (day < today) {
      button.disabled = true;
      button.classList.add('disabled');
    }

    // Highlight today
    if (i === 0) {
      button.classList.add('btn-primary');
      button.textContent += ' (Hoy)';
    } else {
      button.classList.add('btn-secondary');
    }   

    button.className = 'btn'; // base style

    // Check if the day is fully booked

    
    isDayFullyBooked(yyyyMMdd).then(full => {
      button.classList.add(full ? 'btn-dark' : 'btn-outline-secondary');
    });


    calendarEl.appendChild(button);
  }
}

if (localStorage.getItem('user_id')) {
  document.getElementById('guestFields').style.display = 'none';
}


generateCalendar();

// Booking form submission
document.getElementById('bookingForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const user_id = localStorage.getItem('user_id');

  const data = {
    date: formData.get('date'),
    time: formData.get('time'),
    note: formData.get('note')
  };

  if (user_id) {
    data.user_id = user_id;
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


// Check if a day is fully booked
async function isDayFullyBooked(date) {
  const taken = await fetchAppointments(date);
  return taken.length >= HOURS.length;
}


// Delete appointment
// async function deleteAppointment(id) {  
//   if (!confirm('¿Estás seguro de que quieres eliminar esta cita?')) return;

//   try {
//     const res = await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
//     if (res.ok) {
//       alert('Cita eliminada correctamente');
//       location.reload();
//     } else {
//       throw new Error('Error al eliminar la cita');
//     }
//   } catch (err) {
//     alert(err.message);
//     console.error(err);
//   }
// } 