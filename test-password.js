const bcrypt = require('bcrypt');

// Test password verification
const testPassword = 'Password123!';
const hashFromDB = '$2b$10$kYkpiM/aLk1DpF/xOn8Ww.O7Q7I16EaE6UrmI1BtNQIHhsblT0Dky';

bcrypt.compare(testPassword, hashFromDB).then(result => {
  console.log('Password match result:', result);
  if (result) {
    console.log('✅ Password is correct!');
  } else {
    console.log('❌ Password is incorrect!');
    // Let's generate a new hash
    bcrypt.hash(testPassword, 10).then(newHash => {
      console.log('New hash for Password123!:', newHash);
    });
  }
}).catch(err => {
  console.error('Error testing password:', err);
});
