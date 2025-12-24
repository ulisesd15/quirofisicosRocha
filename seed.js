const { sequelize, User, BusinessHour, Appointment, Announcement, ScheduleException } = require('./models');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected.');

    // Optional: Sync database (use with caution in production)
    // await sequelize.sync({ alter: true });

    // ==========================================
    // 1. SEED USERS
    // ==========================================
    const passwordHash = await bcrypt.hash('password123', 10);
    
    const users = [
      {
        fullName: 'Admin User',
        email: 'admin@example.com',
        phone: '555-000-0001',
        password: passwordHash,
        role: 'admin',
        isVerified: true,
        authProvider: 'local'
      },
      {
        fullName: 'Verified Client',
        email: 'client@example.com',
        phone: '555-000-0002',
        password: passwordHash,
        role: 'user',
        isVerified: true,
        authProvider: 'local'
      },
      {
        fullName: 'New User',
        email: 'new@example.com',
        phone: '555-000-0003',
        password: passwordHash,
        role: 'user',
        isVerified: false,
        authProvider: 'local'
      },
      {
        fullName: 'Receptionist User',
        email: 'reception@example.com',
        phone: '555-000-0004',
        password: passwordHash,
        role: 'admin',
        isVerified: true,
        authProvider: 'local'
      }
    ];

    for (const u of users) {
      const existing = await User.findOne({ where: { email: u.email } });
      if (existing) {
        console.log(`   User already exists: ${u.email}`);
      } else {
        try {
          await User.create(u);
          console.log(`   Created user: ${u.email}`);
        } catch (err) {
          console.error(`   ❌ Failed to create user ${u.email}: ${err.message}`);
        }
      }
    }

    // ==========================================
    // 2. SEED BUSINESS HOURS (Versioning)
    // ==========================================
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    // A. Baseline Schedule (Effective 2025-01-01)
    // Mon-Fri: 9-6, Sat: 9-2, Sun: Closed
    const baselineDate = '2025-01-01';
    await BusinessHour.destroy({ where: { effectiveDate: baselineDate } }); // Clean start for this date
    
    const baselineHours = days.map(day => ({
      dayOfWeek: day,
      isOpen: day !== 'sunday',
      openTime: '09:00',
      closeTime: day === 'saturday' ? '14:00' : '18:00',
      effectiveDate: baselineDate
    }));
    await BusinessHour.bulkCreate(baselineHours);
    console.log(`✅ Seeded baseline business hours (Effective: ${baselineDate})`);

    // B. Future Schedule (Effective 2025-12-26)
    // Holiday Season: Opens later (10am), Closes earlier (4pm)
    const futureDate = '2025-12-26';
    await BusinessHour.destroy({ where: { effectiveDate: futureDate } });

    const futureHours = days.map(day => ({
      dayOfWeek: day,
      isOpen: true, // Open every day during this special week
      openTime: '10:00',
      closeTime: '16:00',
      effectiveDate: futureDate
    }));
    await BusinessHour.bulkCreate(futureHours);
    console.log(`✅ Seeded future business hours (Effective: ${futureDate})`);

    // ==========================================
    // 3. SEED APPOINTMENTS
    // ==========================================
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Calculate future dates to avoid "past date" validation errors
    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = tomorrowDate.toISOString().split('T')[0];

    const nextWeekDate = new Date(now);
    nextWeekDate.setDate(nextWeekDate.getDate() + 7);
    const nextWeek = nextWeekDate.toISOString().split('T')[0];
    
    // Create appointments for tomorrow and next week
    const appointments = [
      { date: tomorrow, time: '09:00', fullName: 'Morning Patient', email: 'p1@test.com', status: 'confirmed' },
      { date: tomorrow, time: '09:00', fullName: 'Double Booked Patient', email: 'p2@test.com', status: 'pending' }, // Testing slot limit
      { date: tomorrow, time: '10:00', fullName: 'Mid-morning Patient', email: 'p3@test.com', status: 'confirmed' },
      { date: nextWeek, time: '11:00', fullName: 'Future Patient', email: 'p4@test.com', status: 'pending' },
      { date: nextWeek, time: '15:00', fullName: 'Verified Client', email: 'client@example.com', status: 'confirmed', userId: 2 } // Linked to existing user
    ];

    for (const appt of appointments) {
      try {
        // Check for duplicates to avoid errors on re-run
        const exists = await Appointment.findOne({ where: { date: appt.date, time: appt.time, email: appt.email } });
        if (!exists) {
          await Appointment.create(appt);
        }
      } catch (err) {
        console.error(`   ❌ Failed to create appointment for ${appt.email}: ${err.message}`);
      }
    }
    console.log(`✅ Seeded appointments`);

    // ==========================================
    // 4. SEED ANNOUNCEMENTS & EXCEPTIONS
    // ==========================================
    const annExists = await Announcement.findOne({ where: { title: 'Welcome to the New System' } });
    if (!annExists) {
      await Announcement.create({
        title: 'Welcome to the New System',
        message: 'We have updated our online booking system. Please update your profile.',
        priority: 'high',
        startDate: today,
        isActive: true,
        createdBy: 1 // Assuming ID 1 is admin
      });
      console.log('✅ Seeded announcement');
    }

    const excExists = await ScheduleException.findOne({ where: { reason: 'Christmas Day', startDate: '2025-12-25' } });
    if (!excExists) {
      await ScheduleException.create({
        type: 'CLOSURE',
        startDate: '2025-12-25',
        endDate: '2025-12-25',
        reason: 'Christmas Day',
        name: 'Christmas Day',
        isActive: true,
        isRecurring: true,
        recurringType: 'yearly'
      });
      console.log('✅ Seeded Christmas holiday exception');
    }

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

seedDatabase();