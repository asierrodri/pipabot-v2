require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const promptRoutes = require('./routes/promptRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas de API
app.use('/preguntar', promptRoutes);
app.use('/auth', authRoutes);

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Rutas HTML
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;
