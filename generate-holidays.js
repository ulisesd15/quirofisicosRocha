const fetch = require('node-fetch');

async function generateHolidaysFor5Years() {
  const baseUrl = 'http://localhost:3001';
  
  try {
    // First, login as admin to get a token
    console.log('🔑 Logging in as admin...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@quirofisicosrocha.com',
        password: 'admin123'
      })
    });

    if (!loginResponse.ok) {
      console.log('❌ Admin login failed, trying alternative...');
      const altLoginResponse = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admindev@quirofisicosrocha.com',
          password: 'admin123'
        })
      });
      
      if (!altLoginResponse.ok) {
        console.log('❌ Both admin logins failed');
        return;
      }
      
      const altData = await altLoginResponse.json();
      console.log('✅ Admin login successful with alternative account');
      await generateHolidays(altData.token);
    } else {
      const data = await loginResponse.json();
      console.log('✅ Admin login successful');
      await generateHolidays(data.token);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function generateHolidays(token) {
  const baseUrl = 'http://localhost:3001';
  const years = [2025, 2026, 2027, 2028, 2029];
  
  console.log('\n🎉 Generating holidays for years:', years.join(', '));
  
  for (const year of years) {
    console.log(`\n📅 Generating holidays for ${year}...`);
    
    try {
      const response = await fetch(`${baseUrl}/api/admin/schedule/generate-holidays/${year}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ ${year}: ${result.message}`);
      } else {
        console.log(`❌ ${year}: ${result.message || 'Error generating holidays'}`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`❌ ${year}: Error generating holidays:`, error.message);
    }
  }
  
  // Test the availability after generating holidays
  console.log('\n🔍 Testing availability for some holiday dates...');
  await testHolidayAvailability(baseUrl);
}

async function testHolidayAvailability(baseUrl) {
  // Test some known holiday dates
  const testDates = [
    '2025-01-01', // New Year
    '2025-12-25', // Christmas
    '2025-05-01', // Labor Day
    '2025-09-16', // Independence Day
    '2026-01-01', // New Year 2026
  ];
  
  for (const date of testDates) {
    try {
      const response = await fetch(`${baseUrl}/api/available-slots/${date}`);
      const data = await response.json();
      
      console.log(`📅 ${date}:`, {
        available_slots: data.availableSlots?.length || 0,
        restrictions: data.restrictions || [],
        message: data.message || 'No message'
      });
      
    } catch (error) {
      console.error(`❌ Error testing ${date}:`, error.message);
    }
  }
}

// Run the holiday generation
generateHolidaysFor5Years();
