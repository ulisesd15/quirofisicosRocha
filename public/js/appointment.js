// DOM references
const calendarEl = document.getElementById('calendar');
const timeCardsEl = document.getElementById('timeCards');
const timeSelect = document.getElementById('timeSelect');
const bookingForm = document.getElementById('bookingForm');
const guestFields = document.getElementById('guestFields');
const menuToggle = document.getElementById('menu_toggle');
const navItems = document.getElementById('nav-items');
const selectedDateInput = document.getElementById('selectedDate');
const selectedTimeInput = document.getElementById('selectedTime');
const prevWeekBtn = document.getElementById('prevWeek');
const nextWeekBtn = document.getElementById('nextWeek');




// Constants// Add whatever extra slots you need ➜ 06:00–11:30, 12:00–17:30, 18:00–21:30
const HOURS = [
  '06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30',
  '12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30',
  '18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30'
];

function periodOf(time) {
  const [h] = time.split(':').map(Number);
  return h < 12          ? 'manana'  // 6 am – 11:30 am
       : h < 18          ? 'tarde'   // 12 pm – 5:30 pm
       :                  'noche';   // 6 pm – 9:30 pm
}
let weekOffset = 0, currentDateISO = null;

// User and data
const userId = localStorage.getItem('user_id');
var currentUser = null;
var userDataArray = [];

// Fetch user if logged in
if (userId) {
  fetch(`/api/user/${userId}`)
    .then(res => res.ok ? res.json() : Promise.reject('Error'))
    .then(user => {
      currentUser = user;
      userDataArray = [user.full_name || '', user.email || '', user.phone || ''];
    })
    .catch(err => console.error('Error fetching user:', err));
}

// Utilities
const iso = d => d.toISOString().split('T')[0];
const startOfWeek = (offset=0) => {
  const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() + offset * 7); return d;
};

async function fetchAppointments(dayISO) {
  try {
    const res = await fetch(`/api/appointments?date=${dayISO}`);
    const appointments = await res.json();
    return appointments.map(a => a.time);
  } catch (err) {
    console.error('Error fetching appointments:', err);
    return [];
  }
}

function renderWeek() {
  calendarEl.innerHTML = '';
  const base = startOfWeek(weekOffset), today = new Date(); today.setHours(0,0,0,0);
  for (let i = 0; i < 7; i++) {
    const day = new Date(base); day.setDate(base.getDate() + i);
    const dayISO = iso(day);
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.dataset.date = dayISO;
    btn.textContent = day.toLocaleDateString('es-ES', { weekday:'short', day:'2-digit', month:'short' });
    if (day < today) { btn.classList.add('btn-dark', 'disabled'); btn.disabled = true; }
    else { btn.classList.add('btn-outline-secondary'); }
    if (dayISO === currentDateISO) btn.classList.replace('btn-outline-secondary', 'btn-primary');
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

  const taken    = await fetchAppointments(dayISO);
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

  // --- build three <div class="row"> blocks -------------------------------
  const sections = {manana: [], tarde: [], noche: []};

  notTaken.forEach(time => {
    const btn = Object.assign(document.createElement('button'), {
      type: 'button', // ← prevents unwanted form submission
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

  // helper that returns a <div>block with a heading and the cols
  const makeBlock = (label, nodeList) => {
    const frag = document.createDocumentFragment();
    frag.append(
      Object.assign(document.createElement('h6'), { textContent: label.charAt(0).toUpperCase()+label.slice(1) }),
      Object.assign(document.createElement('div'), { className: 'row g-1' })
    );
    const row = frag.querySelector('.row');
    nodeList.forEach(col => row.appendChild(col));
    return frag;
  };

  const wrapper = document.createDocumentFragment();
  wrapper.append(
    makeBlock('mañana', sections.manana),
    makeBlock('tarde',   sections.tarde),
    makeBlock('noche',   sections.noche)
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
    user_id: userId || null
  };
  if (!data.date || !data.time) return alert('Por favor, selecciona una fecha y hora válidas.');
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
    console.error('Error al agendar la cita:', err);
    alert('Error al agendar la cita');
  }
});

// Nav and menu setup
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

// Init
prevWeekBtn.addEventListener('click', () => { weekOffset--; renderWeek(); timeCardsEl.innerHTML = ''; });
nextWeekBtn.addEventListener('click', () => { weekOffset++; renderWeek(); timeCardsEl.innerHTML = ''; });

// Initial render
document.addEventListener('DOMContentLoaded', () => {
  renderWeek();
  selectDay(iso(new Date()));
  setupUI();
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