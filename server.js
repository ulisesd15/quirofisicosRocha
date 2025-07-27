const express = require('express');
const passport = require('passport');
require('./config/passport'); // Load passport strategy
require('dotenv').config();

const routes = require('./routes/apiRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/admin', express.static('admin')); // Serve admin files under /admin path

app.use(passport.initialize()); 

app.use('/api/auth', authRoutes); 
app.use('/api/admin', adminRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api', routes);          

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
