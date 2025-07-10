require('dotenv').config();
const session = require('express-session');
const express = require('express');
const cors = require('cors');
const path = require('path');

const promptRoutes = require('./routes/promptRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

// Middlewares
app.use(cors());

app.use(session({
  secret: 'clave-secreta-segura',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 2
  }
}));

app.use(express.json());

// Middleware para proteger rutas
function verificarSesion(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login.html');
  }
}

// Rutas de API
app.use('/preguntar', (req, res, next) => {
  if (req.session.user) next();
  else res.status(401).json({ error: 'No autorizado' });
});
app.use('/preguntar', promptRoutes);
app.use('/auth', authRoutes);

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Rutas HTML
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/', verificarSesion, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;