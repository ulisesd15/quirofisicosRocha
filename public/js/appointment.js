// ───────── DOM REFERENCES ─────────
const calendarEl = document.getElementById('calendar');
const timeCardsEl = document.getElementById('timeCards');
const bookingForm = document.getElementById('bookingForm');
const guestFields = document.getElementById('guestFields');
const menuToggle = document.getElementById('menu_toggle');
const navItems = document.getElementById('nav-items');
const selectedDateInput = document.getElementById('selectedDate');
const selectedTimeInput = document.getElementById('selectedTime');
const prevWeekBtn = document.getElementById('prevWeek');
const nextWeekBtn = document.getElementById('nextWeek');

const token = localStorage.getItem('token');

// ───────── TIME CONSTANTS ─────────
const HOURS = [
  '06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30',
  '12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30',
  '18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30'
];
const iso = d => d.toISOString().split('T')[0];
const startOfWeek = (offset = 0) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset * 7);
  return d;
};
const periodOf = time => {
  const [h] = time.split(':').map(Number);
  return h < 12 ? 'manana' : h < 18 ? 'tarde' : 'noche';
};

// ───────── USER LOGIC ─────────
const userId = localStorage.getItem('user_id');
let currentUser = null;
let userDataArray = [];
let weekOffset = 0, currentDateISO = null;

if (userId) {
  console.log('User ID:', userId);
  fetch(`/api/user/${userId}`)
    .then(res => res.ok ? res.json() : Promise.reject('Error'))
    .then(user => {
      currentUser = user;
      userDataArray = [user.full_name || '', user.email || '', user.phone || ''];
    })
    .catch(err => console.error('Error fetching user:', err));
}

// ───────── APPOINTMENTS FETCH ─────────
async function fetchAppointments(dayISO) {
  const token = localStorage.getItem('token');

  const res = await fetch(`/api/appointments?date=${dayISO}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
});

  if (!res.ok) {
    console.error('Error fetching appointments:', await res.text());
    return [];
  }

  const appointments = await res.json();
  return appointments.map(a => a.time);
}

function renderWeek() {
  calendarEl.innerHTML = '';
  const base = startOfWeek(weekOffset);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isCompact = window.matchMedia('(max-width: 576px), (orientation: portrait)').matches;

  for (let i = 0; i < 7; i++) {
    const day = new Date(base);
    day.setDate(base.getDate() + i);
    const dayISO = iso(day);
    const btn = document.createElement('button');
    btn.className = 'btn calendar-card-btn';
    btn.dataset.date = dayISO;
    btn.textContent = isCompact
      ? day.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
      : day.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' });

    if (day < today) {
      btn.classList.add('btn-dark', 'disabled');
      btn.disabled = true;
    } else {
      btn.classList.add('btn-outline-secondary');
    }

    if (dayISO === currentDateISO) {
      btn.classList.replace('btn-outline-secondary', 'btn-primary');
    }

    btn.addEventListener('click', () => selectDay(dayISO));
    calendarEl.appendChild(btn);
  }

  prevWeekBtn.disabled = weekOffset <= 0;
}

async function selectDay(dayISO) {
  currentDateISO = dayISO;
  selectedDateInput.value = dayISO;
  selectedTimeInput.value = '';

  renderWeek();

  const taken = await fetchAppointments(dayISO);
  const notTaken = HOURS.filter(t => !taken.includes(t));

  if (notTaken.length === 0) {
    timeCardsEl.replaceChildren(
      Object.assign(document.createElement('div'), {
        className: 'col-12 alert alert-warning text-center',
        textContent: 'Sin horarios disponibles'
      })
    );
    bookingForm.style.display = 'none';
    return;
  }

  const sections = { manana: [], tarde: [], noche: [] };

  notTaken.forEach(time => {
    const btn = Object.assign(document.createElement('button'), {
      type: 'button',
      className: 'btn time-btn w-100 hour-card small-card',
      textContent: time
    });

    btn.addEventListener('click', () => {
      timeCardsEl.querySelectorAll('.hour-card').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedTimeInput.value = time;
    });

    const col = Object.assign(document.createElement('div'), { className: 'col-4 col-md-2 mb-2' });
    col.appendChild(btn);
    sections[periodOf(time)].push(col);
  });

  const makeBlock = (label, nodeList) => {
    const frag = document.createDocumentFragment();
    frag.append(
      Object.assign(document.createElement('h6'), { textContent: label.charAt(0).toUpperCase() + label.slice(1) }),
      Object.assign(document.createElement('div'), { className: 'row g-1' })
    );
    const row = frag.querySelector('.row');
    nodeList.forEach(col => row.appendChild(col));
    return frag;
  };

  const wrapper = document.createDocumentFragment();
  wrapper.append(
    makeBlock('mañana', sections.manana),
    makeBlock('tarde', sections.tarde),
    makeBlock('noche', sections.noche)
  );

  timeCardsEl.replaceChildren(wrapper);
  bookingForm.style.display = 'block';
}

bookingForm.addEventListener('submit', async e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = {
    full_name: userDataArray[0] || fd.get('full_name') || '',
    email: userDataArray[1] || fd.get('email') || '',
    phone: userDataArray[2] || fd.get('phone') || '',
    date: fd.get('date'),
    time: fd.get('time'),
    note: fd.get('note') || null,
    user_id: userId || null
  };

  if (!data.date || !data.time) return alert('Por favor, selecciona una fecha y hora válidas.');

  try {
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: {  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}` },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
    const errorText = await res.text();
    console.error('Server error:', errorText);
    return alert('Error al agendar la cita');
  }
    if (res.status === 409) {
      const error = await res.json();
      return alert(error.message || 'Ya existe una cita para esta fecha y hora');
    }
    const result = await res.json();
    alert(result.message || 'Cita agendada correctamente');
    e.target.reset();
  } catch (err) {
    console.error('Error al agendar la cita:', err);
    alert('Error al agendar la cita');
  }
});

function setupUI() {
  const offcanvas = document.getElementById('sideNav');
  offcanvas.addEventListener('show.bs.offcanvas', () => menuToggle.style.display = 'none');
  offcanvas.addEventListener('hidden.bs.offcanvas', () => menuToggle.style.display = 'block');

  if (!navItems) return;
  navItems.innerHTML = userId
    ? `<li><a href="/index.html" class="btn btn-outline-secondary w-100 mb-2">Inicio</a></li>
       <li><a href="#" id="logoutBtn" class="btn btn-danger w-100 mb-2">Cerrar Sesión</a></li>`
    : `<li><a href="/index.html" class="btn btn-outline-secondary w-100 mb-2">Inicio</a></li>
       <li><a href="/login.html" class="btn btn-outline-success w-100 mb-2">Iniciar Sesión</a></li>
       <li><a href="/register.html" class="btn btn-outline-secondary w-100 mb-2">Crear Cuenta</a></li>`;

  const logoutBtn = document.getElementById('logoutBtn');
  logoutBtn?.addEventListener('click', () => {
    localStorage.removeItem('user_id');
    window.location.href = '/index.html';
  });
}

prevWeekBtn.addEventListener('click', () => {
  weekOffset--;
  renderWeek();
  timeCardsEl.innerHTML = '';
});

nextWeekBtn.addEventListener('click', () => {
  weekOffset++;
  renderWeek();
  timeCardsEl.innerHTML = '';
});

document.addEventListener('DOMContentLoaded', () => {
  renderWeek();
  selectDay(iso(new Date()));
  setupUI();

  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      renderWeek();
    }, 200);
  });
});

const nameInput = guestFields.querySelector('[name="name"]');
const emailInput = guestFields.querySelector('[name="email"]');
const phoneInput = guestFields.querySelector('[name="phone"]');

if (!userId) {
  guestFields.style.display = 'block';
  nameInput.required = true;
  emailInput.required = true;
  phoneInput.required = true;
} else {
  guestFields.style.display = 'none';
  nameInput.required = false;
  emailInput.required = false;
  phoneInput.required = false;
}
