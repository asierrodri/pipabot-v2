const bcrypt = require('bcrypt');
const db = require('../config/db');

const login = (req, res) => {
  const { username, password } = req.body;

  db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Error en la base de datos' });

    if (results.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    // ✅ Guardar sesión
    req.session.user = { username: user.username };

    res.status(200).json({ message: 'Login exitoso', username: user.username });
  });
};

module.exports = { login };
