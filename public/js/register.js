document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    
    try{
      const res = await fetch('api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: data.full_name,
          username: data.username,
          email: data.email,
          phone: data.phone
        })

      });console.log(data);

      const result = await res.json();
      console.log(result);
    if (res.ok) {
      // Store user_id so it's available later
      localStorage.setItem('user_id', result.userId);

      window.location.href = '/appointment.html'; // redirect
      e.target.reset();
    }
    else {
        alert(`Error: ${result.message || 'No se pudo registrar'}`);
      }
    } catch (error) {
      console.error('Error al registrar:', error);
      alert('Error al registrar. Inténtalo de nuevo más tarde.');
    }
 

  });

  