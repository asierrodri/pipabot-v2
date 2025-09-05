// controllers/authController.js
const bcrypt = require('bcrypt');
const db = require('../config/db');

const login = (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Faltan datos' });

  db.query('SELECT * FROM users WHERE username = ?', [username], async (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error en la base de datos' });
    if (!rows.length) return res.status(401).json({ error: 'Usuario no encontrado' });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Contraseña incorrecta' });

    // Guarda sala y rol de ESA cuenta
    const role = user.rol_en_sala || 'user';
    req.session.user = { username: user.username, sala_id: user.sala_id, role };

    res.json({
      message: 'Login exitoso',
      username: user.username,
      role,
      sala_id: user.sala_id
    });
  });
};

module.exports = { login };
