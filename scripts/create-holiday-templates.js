const db = require('../config/connections');

// Create holiday templates table and populate with Mexican holidays
const createHolidayTemplatesTable = () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS holiday_templates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      month INT NOT NULL,
      day INT NOT NULL,
      is_recurring TINYINT(1) DEFAULT 1,
      is_active TINYINT(1) DEFAULT 1,
      holiday_type ENUM('national', 'religious', 'cultural', 'custom') DEFAULT 'national',
      closure_type ENUM('full_day', 'partial', 'custom_hours') DEFAULT 'full_day',
      custom_open_time TIME NULL,
      custom_close_time TIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_month_day (month, day),
      INDEX idx_active (is_active)
    ) ENGINE=InnoDB
  `;

  db.query(createTableQuery, (err) => {
    if (err) {
      console.error('Error creating holiday_templates table:', err);
      return;
    }
    
    console.log('✅ Holiday templates table created successfully');
    
    // Insert default Mexican holidays
    insertDefaultHolidays();
  });
};

const insertDefaultHolidays = () => {
  const defaultHolidays = [
    {
      name: 'Año Nuevo',
      description: 'Celebración del Año Nuevo',
      month: 1,
      day: 1,
      holiday_type: 'national',
      closure_type: 'full_day'
    },
    {
      name: 'Día de la Constitución',
      description: 'Día de la Constitución Mexicana',
      month: 2,
      day: 5,
      holiday_type: 'national',
      closure_type: 'full_day'
    },
    {
      name: 'Natalicio de Benito Juárez',
      description: 'Conmemoración del nacimiento de Benito Juárez',
      month: 3,
      day: 21,
      holiday_type: 'national',
      closure_type: 'full_day'
    },
    {
      name: 'Viernes Santo',
      description: 'Viernes Santo - Semana Santa',
      month: 4,
      day: 14, // This varies by year, but we'll set a default
      holiday_type: 'religious',
      closure_type: 'full_day'
    },
    {
      name: 'Día del Trabajo',
      description: 'Día Internacional del Trabajo',
      month: 5,
      day: 1,
      holiday_type: 'national',
      closure_type: 'full_day'
    },
    {
      name: 'Día de la Independencia',
      description: 'Independencia de México',
      month: 9,
      day: 16,
      holiday_type: 'national',
      closure_type: 'full_day'
    },
    {
      name: 'Día de la Revolución',
      description: 'Revolución Mexicana',
      month: 11,
      day: 20,
      holiday_type: 'national',
      closure_type: 'full_day'
    },
    {
      name: 'Nochebuena',
      description: 'Víspera de Navidad',
      month: 12,
      day: 24,
      holiday_type: 'religious',
      closure_type: 'partial'
    },
    {
      name: 'Navidad',
      description: 'Celebración de la Navidad',
      month: 12,
      day: 25,
      holiday_type: 'religious',
      closure_type: 'full_day'
    },
    {
      name: 'Fin de Año',
      description: 'Último día del año',
      month: 12,
      day: 31,
      holiday_type: 'cultural',
      closure_type: 'partial'
    }
  ];

  const insertQuery = `
    INSERT IGNORE INTO holiday_templates 
    (name, description, month, day, holiday_type, closure_type) 
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  let completed = 0;
  const total = defaultHolidays.length;

  defaultHolidays.forEach(holiday => {
    db.query(insertQuery, [
      holiday.name,
      holiday.description,
      holiday.month,
      holiday.day,
      holiday.holiday_type,
      holiday.closure_type
    ], (err) => {
      if (err) {
        console.error(`Error inserting holiday ${holiday.name}:`, err);
      } else {
        console.log(`✅ Inserted holiday: ${holiday.name}`);
      }
      
      completed++;
      if (completed === total) {
        console.log('🎉 All default holidays inserted successfully');
        process.exit(0);
      }
    });
  });
};

// Run the script
createHolidayTemplatesTable();
