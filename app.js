require('dotenv').config();
const express = require('express');
const cors = require('cors');
const promptRoutes = require('./routes/promptRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Cambiado aquí:
app.use('/preguntar', promptRoutes);
app.use('/auth', authRoutes);

module.exports = app;

const path = require('path');

// Servir el index.html desde la raíz
app.use(express.static(path.join(__dirname)));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

