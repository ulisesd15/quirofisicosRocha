/**
 * Schedule Management Test and Debug Script
 * 
 * This script helps test and debug the integration between admin schedule management
 * and the appointment booking system.
 */

// Test the enhanced available slots API
async function testAvailableSlots(date) {
  console.log(`\n🧪 Testing available slots for ${date}`);
  console.log('='.repeat(50));
  
  try {
    const response = await fetch(`/api/available-slots/${date}`);
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Available slots:', data.availableSlots?.length || 0);
    console.log('Business hours:', data.business_hours);
    console.log('Restrictions:', data.restrictions);
    console.log('Blocked slots:', data.blocked_slots);
    console.log('Existing appointments:', data.existing_appointments);
    console.log('Custom hours:', data.custom_hours);
    
    if (data.message) {
      console.log('Message:', data.message);
    }
    
    if (data.exception) {
      console.log('Exception details:', data.exception);
    }
    
    return data;
  } catch (error) {
    console.error('Error testing available slots:', error);
    return null;
  }
}

// Test schedule exceptions
async function testScheduleExceptions() {
  console.log('\n🧪 Testing schedule exceptions');
  console.log('='.repeat(50));
  
  try {
    const token = localStorage.getItem('user_token') || localStorage.getItem('token');
    const response = await fetch('/api/admin/schedule-exceptions', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('Schedule exceptions:', data);
    return data;
  } catch (error) {
    console.error('Error testing schedule exceptions:', error);
    return null;
  }
}

// Test business hours
async function testBusinessHours() {
  console.log('\n🧪 Testing business hours');
  console.log('='.repeat(50));
  
  try {
    const token = localStorage.getItem('user_token') || localStorage.getItem('token');
    const response = await fetch('/api/admin/schedule/business-hours', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('Business hours:', data);
    return data;
  } catch (error) {
    console.error('Error testing business hours:', error);
    return null;
  }
}

// Run comprehensive test
async function runScheduleTests() {
  console.log('🚀 Starting Schedule Management Tests');
  console.log('='*60);
  
  // Test today and next week
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  
  const formatDate = (date) => date.toISOString().split('T')[0];
  
  // Test different dates
  await testAvailableSlots(formatDate(today));
  await testAvailableSlots(formatDate(tomorrow));
  await testAvailableSlots(formatDate(nextWeek));
  
  // Test admin endpoints
  await testBusinessHours();
  await testScheduleExceptions();
  
  console.log('\n✅ Schedule tests completed');
  console.log('Check the console output above for detailed results.');
}

// Expose functions to global scope for manual testing
window.scheduleDebug = {
  testAvailableSlots,
  testScheduleExceptions,
  testBusinessHours,
  runScheduleTests
};

console.log('📋 Schedule Debug Tools Loaded');
console.log('Available functions:');
console.log('- scheduleDebug.testAvailableSlots(date)');
console.log('- scheduleDebug.testScheduleExceptions()');
console.log('- scheduleDebug.testBusinessHours()');
console.log('- scheduleDebug.runScheduleTests()');
console.log('\nExample usage:');
console.log('scheduleDebug.runScheduleTests()');
