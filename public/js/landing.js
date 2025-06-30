document.getElementById('registerBtn').addEventListener('click', () => {
    window.location.href = 'register.html';
  });
  
  document.getElementById('guestBtn').addEventListener('click', () => {
    window.location.href = 'appointment.html?guest=true';
  });
  

// Redirect to appointment page if user_id is in localStorage
  if (localStorage.getItem('user_id')) {
    window.location.href = 'appointment.html';
}