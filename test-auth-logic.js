const bcrypt = require('bcrypt');

// Test the exact same logic as the auth controller
const testUser = {
  password: '$2b$10$TftI8BrtnSax2zjIjq7zx.MhW7EtwYT5qM/l1k4G.MqFpc0d/pF2u',
  auth_provider: 'local'
};

const testPassword = 'Password123!';

console.log('Testing auth logic...');
console.log('User auth_provider:', testUser.auth_provider);
console.log('Testing password:', testPassword);

if (testUser.auth_provider !== 'local') {
  console.log('❌ Auth provider check failed');
} else {
  console.log('✅ Auth provider check passed');
  
  bcrypt.compare(testPassword, testUser.password).then(isValid => {
    console.log('Password comparison result:', isValid);
    if (isValid) {
      console.log('✅ LOGIN SUCCESS!');
    } else {
      console.log('❌ Password verification failed');
    }
  });
}
