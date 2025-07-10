const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Obtener todos los usuarios
router.get('/usuarios', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });

  const username = req.session.user.username;

  db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
    if (err || results.length === 0) return res.status(403).json({ error: 'No autorizado' });

    if (results[0].role !== 'admin') {
      return res.status(403).json({ error: 'Acceso restringido a administradores' });
    }

    db.query('SELECT id, username, role FROM users', (err, users) => {
      if (err) return res.status(500).json({ error: 'Error al obtener usuarios' });
      res.json(users);
    });
  });
});

// Eliminar usuario por ID
router.delete('/usuarios/:id', (req, res) => {
  const id = req.params.id;
  db.query('DELETE FROM users WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: 'Error al eliminar usuario' });
    res.json({ message: 'Usuario eliminado' });
  });
});

module.exports = router;
