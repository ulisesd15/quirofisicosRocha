const form = document.getElementById('bookingForm');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());

  try {
    const res = await fetch('/api/appointment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await res.json();
    alert(result.message || 'Cita agendada correctamente');
    form.reset();
  } catch (err) {
    alert('Error al agendar la cita');
    console.error(err);
  }
});
