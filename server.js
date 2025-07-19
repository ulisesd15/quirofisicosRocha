const express = require('express');

const routes = require('./routes/apiRoutes');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/api', routes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
