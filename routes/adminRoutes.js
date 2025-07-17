const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt'); // 👈 Asegúrate de incluir esto

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

// ✅ Crear nuevo usuario
router.post('/usuarios', async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [username, hashedPassword, role],
      (err) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Ese usuario ya existe' });
          }
          return res.status(500).json({ error: 'Error en la base de datos' });
        }
        res.status(201).json({ message: 'Usuario creado con éxito' });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Error al encriptar contraseña' });
  }
});

//Editar Usuarios
router.put('/usuarios/:id', async (req, res) => {
  const id = req.params.id;
  const { username, password, role } = req.body;

  if (!username || !role) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  try {
    // Verificar si hay otro usuario con el mismo nombre
    db.query('SELECT * FROM users WHERE username = ? AND id != ?', [username, id], async (err, results) => {
      if (err) return res.status(500).json({ error: 'Error al verificar duplicado' });
      if (results.length > 0) return res.status(409).json({ error: 'Ese usuario ya existe' });

      // Si no hay duplicado, continuamos
      // Si se incluye contraseña, la hasheamos y la actualizamos
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.query(
          'UPDATE users SET username = ?, password_hash = ?, role = ? WHERE id = ?',
          [username, hashedPassword, role, id],
          (err) => {
            if (err) return res.status(500).json({ error: 'Error al actualizar usuario' });
            res.json({ message: 'Usuario actualizado' });
          }
        );
      } else {
        db.query(
          'UPDATE users SET username = ?, role = ? WHERE id = ?',
          [username, role, id],
          (err) => {
            if (err) return res.status(500).json({ error: 'Error al actualizar usuario' });
            res.json({ message: 'Usuario actualizado' });
          }
        );
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }

});

//Obtener todas las versiones
router.get('/prompt/secciones', (req, res) => {
  db.query('SELECT * FROM prompt_secciones ORDER BY seccion, version DESC', (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener prompts' });
    res.json(results);
  });
});

//Guardar nueva versión de una sección
router.post('/prompt/secciones', (req, res) => {
  const { seccion, contenido } = req.body;
  if (!seccion || !contenido) return res.status(400).json({ error: 'Faltan datos' });

  db.query(
    'SELECT MAX(version) as maxVersion FROM prompt_secciones WHERE seccion = ?',
    [seccion],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Error al consultar versión' });
      const nuevaVersion = (results[0].maxVersion || 0) + 1;

      db.query('UPDATE prompt_secciones SET es_actual = FALSE WHERE seccion = ?', [seccion], () => {
        db.query(
          'INSERT INTO prompt_secciones (seccion, contenido, version, es_actual) VALUES (?, ?, ?, TRUE)',
          [seccion, contenido, nuevaVersion],
          (err) => {
            if (err) return res.status(500).json({ error: 'Error al guardar nueva versión' });
            res.json({ message: 'Prompt actualizado' });
          }
        );
      });
    }
  );
});

//Restaurar una versión
router.put('/prompt/secciones/:id/restaurar', (req, res) => {
  const id = req.params.id;

  db.query('SELECT * FROM prompt_secciones WHERE id = ?', [id], (err, results) => {
    if (err || results.length === 0) return res.status(404).json({ error: 'Versión no encontrada' });

    const { seccion, contenido } = results[0];

    db.query('SELECT MAX(version) as maxVersion FROM prompt_secciones WHERE seccion = ?', [seccion], (err, resVer) => {
      if (err) return res.status(500).json({ error: 'Error al obtener versión' });

      const nuevaVersion = (resVer[0].maxVersion || 0) + 1;

      db.query('UPDATE prompt_secciones SET es_actual = FALSE WHERE seccion = ?', [seccion], () => {
        db.query(
          'INSERT INTO prompt_secciones (seccion, contenido, version, es_actual) VALUES (?, ?, ?, TRUE)',
          [seccion, contenido, nuevaVersion],
          (err) => {
            if (err) return res.status(500).json({ error: 'Error al restaurar' });
            res.json({ message: 'Versión restaurada como actual' });
          }
        );
      });
    });
  });
});

module.exports = router;
