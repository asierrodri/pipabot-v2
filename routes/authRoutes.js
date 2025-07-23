const express = require('express');
const router = express.Router();
const { login } = require('../controllers/authController');

router.post('/login', login);

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ message: 'Sesión cerrada' });
  });
});

router.get('/usuario', (req, res) => {
  if (req.session.user) {
    res.json({ username: req.session.user.username });
  } else {
    res.status(401).json({ error: 'No autenticado' });
  }
});

const db = require('../config/db'); // 👈 asegúrate de tener esta línea arriba

const { generarTituloConGemini } = require('../services/geminiService');

router.post('/guardar-historial', async (req, res) => {
  const { historial } = req.body;
  const username = req.session?.user?.username;

  if (!username || !historial) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  try {
    const titulo = await generarTituloConGemini(historial);

    db.query(
      'INSERT INTO historiales (username, datos, titulo) VALUES (?, ?, ?)',
      [username, JSON.stringify(historial), titulo],
      (err, result) => {
        if (err) {
          console.error('❌ Error al guardar historial:', err);
          return res.status(500).json({ error: 'Error al guardar historial' });
        }
        res.json({ message: 'Historial guardado', id: result.insertId, titulo });
      }
    );
  } catch (error) {
    console.error('❌ Error al generar título con Gemini:', error);
    res.status(500).json({ error: 'No se pudo generar título' });
  }
});


router.get('/historiales', (req, res) => {
  const username = req.session?.user?.username;

  if (!username) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  db.query(
    'SELECT id, fecha, titulo FROM historiales WHERE username = ? ORDER BY fecha DESC',
    [username],
    (err, results) => {
      if (err) {
        console.error('❌ Error al obtener historiales:', err);
        return res.status(500).json({ error: 'Error al obtener historiales' });
      }
      res.json(results);
    }
  );
});

router.get('/historiales/:id', (req, res) => {
  const id = req.params.id;
  const username = req.session?.user?.username;

  if (!username) return res.status(401).json({ error: 'No autenticado' });

  db.query(
    'SELECT datos FROM historiales WHERE id = ? AND username = ?',
    [id, username],
    (err, results) => {
      if (err) {
        console.error('❌ Error al recuperar historial por ID:', err);
        return res.status(500).json({ error: 'Error al obtener historial' });
      }
      if (results.length === 0) return res.status(404).json({ error: 'Historial no encontrado' });

      try {
        const historial = JSON.parse(results[0].datos);
        res.json(historial);
      } catch (parseErr) {
        console.error('❌ Error al parsear historial:', parseErr);
        res.status(500).json({ error: 'Historial corrupto' });
      }
    }
  );
});

router.delete('/historiales/:id', (req, res) => {
  const id = req.params.id;
  const username = req.session?.user?.username;

  if (!username) return res.status(401).json({ error: 'No autenticado' });

  db.query('DELETE FROM historiales WHERE id = ? AND username = ?', [id, username], (err, result) => {
    if (err) {
      console.error('❌ Error al eliminar historial:', err);
      return res.status(500).json({ error: 'Error al eliminar historial' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Historial no encontrado o no te pertenece' });
    }

    res.json({ message: 'Historial eliminado' });
  });
});

router.put('/historiales/:id', (req, res) => {
  const id = req.params.id;
  const { historial } = req.body;
  const username = req.session?.user?.username;

  if (!username || !historial) return res.status(400).json({ error: 'Faltan datos' });

  db.query(
    'UPDATE historiales SET datos = ?, fecha = CURRENT_TIMESTAMP WHERE id = ? AND username = ?',
    [JSON.stringify(historial), id, username],
    (err, result) => {
      if (err) {
        console.error('❌ Error al actualizar historial:', err);
        return res.status(500).json({ error: 'Error al actualizar historial' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Historial no encontrado o no te pertenece' });
      }

      res.json({ message: 'Historial actualizado' });
    }
  );
});

router.put('/historiales/:id/titulo', (req, res) => {
  const id = req.params.id;
  const { titulo } = req.body;
  const username = req.session?.user?.username;

  if (!username || typeof titulo !== 'string') {
    return res.status(400).json({ error: 'Datos inválidos' });
  }

  db.query(
    'UPDATE historiales SET titulo = ? WHERE id = ? AND username = ?',
    [titulo.trim(), id, username],
    (err, result) => {
      if (err) {
        console.error('❌ Error al actualizar título:', err);
        return res.status(500).json({ error: 'Error al actualizar título' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Historial no encontrado o no te pertenece' });
      }

      res.json({ message: 'Título actualizado' });
    }
  );
});

router.get('/historiales/usuario/:username', (req, res) => {
  const sessionUser = req.session?.user;
  const targetUsername = req.params.username;

  if (!sessionUser || sessionUser.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  db.query(
    'SELECT id, fecha, titulo FROM historiales WHERE username = ? ORDER BY fecha DESC',
    [targetUsername],
    (err, results) => {
      if (err) {
        console.error('❌ Error al obtener historiales del usuario:', err);
        return res.status(500).json({ error: 'Error al obtener historiales' });
      }
      res.json(results);
    }
  );
});

module.exports = router;
