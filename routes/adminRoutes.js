const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt'); // 👈 Asegúrate de incluir esto

// Obtener todos los usuarios
router.get('/usuarios', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'No autorizado' });

  const username = req.session.user.username;

  db.query('SELECT sala_id, rol_en_sala FROM users WHERE username = ?', [username], (err, results) => {
    if (err || results.length === 0) return res.status(403).json({ error: 'No autorizado' });

    if ((results[0].rol_en_sala || 'user') !== 'admin') {
      return res.status(403).json({ error: 'Acceso restringido a administradores' });
    }
    const salaId = results[0].sala_id;

    db.query('SELECT id, username, rol_en_sala AS role FROM users WHERE sala_id=?', [salaId], (err, users) => {
      if (err) return res.status(500).json({ error: 'Error al obtener usuarios' });
      res.json(users);
    });
  });
});

// Eliminar usuario por ID
router.delete('/usuarios/:id', (req, res) => {
  const id = req.params.id;
  const salaId = req.session?.user?.sala_id;
  db.query('DELETE FROM users WHERE id = ? AND sala_id = ?', [id, salaId], (err) => {
    if (err) return res.status(500).json({ error: 'Error al eliminar usuario' });
    res.json({ message: 'Usuario eliminado' });
  });
});

// ✅ Crear nuevo usuario
router.post('/usuarios', async (req, res) => {
  const { username, password, role } = req.body;
  const salaId = req.session?.user?.sala_id;

  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.query(
      'INSERT INTO users (sala_id, username, password_hash, rol_en_sala) VALUES (?, ?, ?, ?)',
      [salaId, username, hashedPassword, role],
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
  const salaId = req.session?.user?.sala_id;

  if (!username || !role) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  try {
    // Verificar si hay otro usuario con el mismo nombre
    db.query('SELECT * FROM users WHERE username = ? AND id != ? AND sala_id = ?', [username, id, salaId], async (err, results) => {
      if (err) return res.status(500).json({ error: 'Error al verificar duplicado' });
      if (results.length > 0) return res.status(409).json({ error: 'Ese usuario ya existe' });

      // Si no hay duplicado, continuamos
      // Si se incluye contraseña, la hasheamos y la actualizamos
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.query(
          'UPDATE users SET username = ?, password_hash = ?, rol_en_sala = ? WHERE id = ? AND sala_id = ?',
          [username, hashedPassword, role, id, salaId],
          (err) => {
            if (err) return res.status(500).json({ error: 'Error al actualizar usuario' });
            res.json({ message: 'Usuario actualizado' });
          }
        );
      } else {
        db.query(
          'UPDATE users SET username = ?, rol_en_sala = ? WHERE id = ? AND sala_id = ?',
          [username, role, id, salaId],
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

//Obtener todas las versiones (solo de mi sala)
router.get('/prompt/secciones', (req, res) => {
  const salaId = req.session?.user?.sala_id;
  db.query('SELECT * FROM prompt_secciones WHERE sala_id = ? ORDER BY seccion, version DESC', [salaId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener prompts' });
    res.json(results);
  });
});

//Guardar nueva versión de una sección
router.post('/prompt/secciones', (req, res) => {
  const { seccion, contenido } = req.body;
  const salaId = req.session?.user?.sala_id;
  if (!seccion || !contenido) return res.status(400).json({ error: 'Faltan datos' });

  db.query(
    'SELECT MAX(version) as maxVersion FROM prompt_secciones WHERE seccion = ? AND sala_id = ?',
    [seccion, salaId],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Error al consultar versión' });
      const nuevaVersion = (results[0].maxVersion || 0) + 1;

      db.query('UPDATE prompt_secciones SET es_actual = FALSE WHERE seccion = ? AND sala_id = ?', [seccion, salaId], () => {
        db.query(
          'INSERT INTO prompt_secciones (sala_id, seccion, contenido, version, es_actual) VALUES (?, ?, ?, ?, TRUE)',
          [salaId, seccion, contenido, nuevaVersion],
          (err) => {
            if (err) return res.status(500).json({ error: 'Error al guardar nueva versión' });
            res.json({ message: 'Prompt actualizado' });
          }
        );
      });
    }
  );
});

// Restaurar una versión
router.put('/prompt/secciones/:id/restaurar', (req, res) => {
  const id = req.params.id;
  const salaId = req.session?.user?.sala_id;

  db.query('SELECT * FROM prompt_secciones WHERE id = ? AND sala_id = ?', [id, salaId], (err, results) => {
    if (err || results.length === 0) return res.status(404).json({ error: 'Versión no encontrada' });

    const { seccion, contenido, es_actual } = results[0];

    if (es_actual) {
      return res.json({ message: 'Ya es la versión actual' }); // ✅ No duplicar si ya lo es
    }

    db.query('SELECT MAX(version) as maxVersion FROM prompt_secciones WHERE seccion = ? AND sala_id = ?', [seccion, salaId], (err, resVer) => {
      if (err) return res.status(500).json({ error: 'Error al obtener versión' });

      const nuevaVersion = (resVer[0].maxVersion || 0) + 1;

      db.query('UPDATE prompt_secciones SET es_actual = FALSE WHERE seccion = ? AND sala_id = ?', [seccion, salaId], () => {
        db.query(
          'INSERT INTO prompt_secciones (sala_id, seccion, contenido, version, es_actual) VALUES (?, ?, ?, ?, TRUE)',
          [salaId, seccion, contenido, nuevaVersion],
          (err) => {
            if (err) return res.status(500).json({ error: 'Error al restaurar versión' });
            res.json({ message: 'Versión restaurada como actual' });
          }
        );
      });
    });
  });
});

// Obtener productos
router.get('/inventario', (req, res) => {
  db.query('SELECT * FROM inventario ORDER BY fecha_agregado DESC', (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener inventario' });
    res.json(results);
  });
});

// Crear producto
router.post('/inventario', (req, res) => {
  const { nombre, descripcion, cantidad, categoria } = req.body;
  if (!nombre || cantidad == null) return res.status(400).json({ error: 'Faltan datos obligatorios' });

  db.query(
    'INSERT INTO inventario (nombre, descripcion, cantidad, categoria) VALUES (?, ?, ?, ?)',
    [nombre, descripcion, cantidad, categoria],
    err => {
      if (err) return res.status(500).json({ error: 'Error al agregar producto' });
      res.json({ message: 'Producto agregado' });
    }
  );
});

// Editar producto
router.put('/inventario/:id', (req, res) => {
  const id = req.params.id;
  const { nombre, descripcion, cantidad, categoria } = req.body;

  db.query(
    'UPDATE inventario SET nombre = ?, descripcion = ?, cantidad = ?, categoria = ? WHERE id = ?',
    [nombre, descripcion, cantidad, categoria, id],
    err => {
      if (err) return res.status(500).json({ error: 'Error al actualizar producto' });
      res.json({ message: 'Producto actualizado' });
    }
  );
});

// Eliminar producto
router.delete('/inventario/:id', (req, res) => {
  const id = req.params.id;
  db.query('DELETE FROM inventario WHERE id = ?', [id], err => {
    if (err) return res.status(500).json({ error: 'Error al eliminar producto' });
    res.json({ message: 'Producto eliminado' });
  });
});


module.exports = router;
