const express = require('express');
const router = express.Router();
const { login } = require('../controllers/authController');
const db = require('../config/db'); // ya lo usas más abajo
const axios = require('axios');
const bcrypt = require('bcrypt');

router.post('/login', login);

// 🔹 Salas para el selector (público)
router.get('/salas', (req, res) => {
  db.query('SELECT id, nombre, slug FROM salas ORDER BY nombre', (err, rows) => {
    if (err) return res.status(500).json({ error: 'No se pudieron listar las salas' });
    res.json(rows);
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ message: 'Sesión cerrada' });
  });
});

router.get('/usuario', (req, res) => {
  if (req.session.user) {
    const { username, sala_id, role } = req.session.user;
    res.json({ username, sala_id, role });
  } else {
    res.status(401).json({ error: 'No autenticado' });
  }
});

const { generarTitulo } = require('../services/geminiService');

// routes/authRoutes.js (reemplaza TODO el handler de /registro por este)
router.post('/registro', async (req, res) => {
  const { username, password, token, modo, salaSlug, salaNueva } = req.body;

  if (!username || !password || !token || !modo) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  try {
    // 1) reCAPTCHA
    const verifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`;
    const { data } = await axios.post(verifyURL);
    if (!data.success || data.score < 0.5) {
      return res.status(403).json({ error: 'Falló la verificación de reCAPTCHA' });
    }

    let salaId = null;
    let role = 'user';

    if (modo === 'join') {
      // 2A) Unirse a sala existente
      if (!salaSlug) return res.status(400).json({ error: 'Falta salaSlug para unirse' });

      const [salas] = await new Promise((resolve, reject) => {
        db.query('SELECT id FROM salas WHERE slug = ?', [salaSlug], (e, r) => e ? reject(e) : resolve([r]));
      });
      if (!salas.length) return res.status(404).json({ error: 'Sala no encontrada' });

      salaId = salas[0].id;
      role = 'user';
    } else if (modo === 'create') {
      // 2B) Crear sala nueva
      if (!salaNueva?.nombre || !salaNueva?.slug) {
        return res.status(400).json({ error: 'Faltan datos de la sala nueva' });
      }
      const { nombre, slug, mesaIp, mesaPort } = salaNueva;

      // 2B.1) Crear registro de sala
      const insertSala = await new Promise((resolve, reject) => {
        db.query(
          'INSERT INTO salas (nombre, slug) VALUES (?, ?)',
          [nombre, slug],
          (e, r) => e ? reject(e) : resolve(r)
        );
      }).catch(err => {
        if (err.code === 'ER_DUP_ENTRY') return { dup: true };
        throw err;
      });

      if (insertSala?.dup) {
        return res.status(409).json({ error: 'Ya existe una sala con ese slug' });
      }

      salaId = insertSala.insertId;
      role = 'admin'; // El primer usuario de la sala es admin

      // 2B.2) Crear mesa asociada
      // - Si se recibieron datos válidos de mesa → usar esos
      // - Si no, crear una mesa por defecto (loopback) para que el sistema no falle
      const ip = mesaIp && mesaIp.trim() ? mesaIp.trim() : '127.0.0.1';
      const port = Number.isInteger(mesaPort) ? mesaPort : (parseInt(mesaPort, 10) || 10023);

      await new Promise((resolve, reject) => {
        db.query(
          'INSERT INTO mesas (sala_id, ip, port) VALUES (?, ?, ?)',
          [salaId, ip, port],
          (e) => e ? reject(e) : resolve()
        );
      });

      // 2B.3) Insertar prompts iniciales por defecto (version=1, es_actual=TRUE)
      //    Puedes personalizarlos desde el panel admin más tarde.
      const promptsIniciales = [
        {
          seccion: 'modo',
          contenido:
            `Eres PipaBot, asistente de la sala. Responde con claridad y sin rodeos.
Si el modo OSC está en "manual": contesta en texto plano. 
Si está en "automatico": devuelve exclusivamente un array JSON de comandos OSC (sin texto adicional).`
        },
        {
          seccion: 'espacio',
          contenido:
            `Sala recién creada. Si el usuario lo pide, ayúdale a configurar el entorno y a completar datos que falten.`
        },
        {
          seccion: 'material',
          contenido:
            `Equipo base: mesa Behringer X32 (o compatible). Si faltan detalles, pide canal/acción con precisión.`
        },
        {
          seccion: 'normas',
          contenido:
            `No cambies el modo (manual/automatico) por petición del usuario. 
No inventes datos de mesa si no existen; pide confirmación. 
Responde breve.`
        },
        {
          seccion: 'mesa',
          contenido:
            `Convenciones OSC:
- Mute canal N: /ch/NN/mix/on 0
- Unmute canal N: /ch/NN/mix/on 1
- Fader canal N: /ch/NN/mix/fader <0..1>
Devuelve [] si no hay comandos que ejecutar.`
        }
      ];

      for (const p of promptsIniciales) {
        await new Promise((resolve, reject) => {
          db.query(
            'INSERT INTO prompt_secciones (sala_id, seccion, contenido, version, es_actual) VALUES (?, ?, ?, 1, TRUE)',
            [salaId, p.seccion, p.contenido],
            (e) => e ? reject(e) : resolve()
          );
        });
      }

    } else {
      return res.status(400).json({ error: 'Modo inválido' });
    }

    // 3) Evitar duplicados por sala (username único dentro de sala)
    const [dupes] = await new Promise((resolve, reject) => {
      db.query(
        'SELECT id FROM users WHERE sala_id = ? AND username = ?',
        [salaId, username],
        (e, r) => e ? reject(e) : resolve([r])
      );
    });
    if (dupes.length) {
      return res.status(409).json({ error: 'Ese usuario ya existe en esa sala' });
    }

    // 4) Crear usuario
    const hashedPassword = await bcrypt.hash(password, 10);
    await new Promise((resolve, reject) => {
      db.query(
        'INSERT INTO users (sala_id, username, password_hash, rol_en_sala) VALUES (?, ?, ?, ?)',
        [salaId, username, hashedPassword, role],
        (e) => e ? reject(e) : resolve()
      );
    });

    // 5) OK
    res.status(201).json({ message: 'Usuario registrado', sala_id: salaId, role });
  } catch (error) {
    console.error('❌ Error en el registro:', error.message);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});


router.post('/guardar-historial', async (req, res) => {
  const { historial } = req.body;
  const { username, sala_id } = req.session?.user || {};

  if (!username || !sala_id || !historial) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  try {
    const titulo = await generarTitulo(historial, username);
    db.query(
      'INSERT INTO historiales (username, sala_id, datos, titulo) VALUES (?, ?, ?, ?)',
      [username, sala_id, JSON.stringify(historial), titulo],
      (err, result) => {
        if (err) return res.status(500).json({ error: 'Error al guardar historial' });
        res.json({ message: 'Historial guardado', id: result.insertId, titulo });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'No se pudo generar título' });
  }
});

router.get('/historiales', (req, res) => {
  const { username, sala_id } = req.session?.user || {};
  if (!username || !sala_id) return res.status(401).json({ error: 'No autenticado' });

  db.query(
    'SELECT id, fecha, titulo FROM historiales WHERE username = ? AND sala_id = ? ORDER BY fecha DESC',
    [username, sala_id],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Error al obtener historiales' });
      res.json(results);
    }
  );
});

router.get('/historiales/:id', (req, res) => {
  const id = req.params.id;
  const { username, sala_id } = req.session?.user || {};
  if (!username || !sala_id) return res.status(401).json({ error: 'No autenticado' });

  db.query(
    'SELECT datos FROM historiales WHERE id = ? AND username = ? AND sala_id = ?',
    [id, username, sala_id],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Error al obtener historial' });
      if (!results.length) return res.status(404).json({ error: 'Historial no encontrado' });
      try {
        res.json(JSON.parse(results[0].datos));
      } catch {
        res.status(500).json({ error: 'Historial corrupto' });
      }
    }
  );
});

router.delete('/historiales/:id', (req, res) => {
  const id = req.params.id;
  const { username, sala_id } = req.session?.user || {};
  if (!username || !sala_id) return res.status(401).json({ error: 'No autenticado' });

  db.query('DELETE FROM historiales WHERE id = ? AND username = ? AND sala_id = ?', [id, username, sala_id],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Error al eliminar historial' });
      if (!result.affectedRows) return res.status(404).json({ error: 'Historial no encontrado' });
      res.json({ message: 'Historial eliminado' });
    });
});

router.put('/historiales/:id', (req, res) => {
  const id = req.params.id;
  const { historial } = req.body;
  const { username, sala_id } = req.session?.user || {};
  if (!username || !sala_id || !historial) return res.status(400).json({ error: 'Faltan datos' });

  db.query(
    'UPDATE historiales SET datos = ?, fecha = CURRENT_TIMESTAMP WHERE id = ? AND username = ? AND sala_id = ?',
    [JSON.stringify(historial), id, username, sala_id],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Error al actualizar historial' });
      if (!result.affectedRows) return res.status(404).json({ error: 'Historial no encontrado' });
      res.json({ message: 'Historial actualizado' });
    }
  );
});

router.put('/historiales/:id/titulo', (req, res) => {
  const id = req.params.id;
  const { titulo } = req.body;
  const { username, sala_id } = req.session?.user || {};
  if (!username || !sala_id || typeof titulo !== 'string') return res.status(400).json({ error: 'Datos inválidos' });

  db.query(
    'UPDATE historiales SET titulo = ? WHERE id = ? AND username = ? AND sala_id = ?',
    [titulo.trim(), id, username, sala_id],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Error al actualizar título' });
      if (!result.affectedRows) return res.status(404).json({ error: 'Historial no encontrado' });
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
