require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const driveRoutes = require('./routes/drive');
const scanRoutes = require('./routes/scan');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/drive', driveRoutes);
app.use('/scan', scanRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


