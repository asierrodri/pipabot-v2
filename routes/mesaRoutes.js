const express = require('express');
const router = express.Router();
const { enviarOSCConSala, leerOSCConSala, leerBatchOSCConSala } = require('../services/mesaOSC');
const { getMetersSnapshot } = require('../services/mesaOSC');

router.post('/osc', async (req, res) => {
  const { ruta, valor } = req.body;
  const salaId = req.session?.user?.sala_id;
  if (!salaId) return res.status(401).json({ error: 'No autenticado' });
  if (!ruta) return res.status(400).json({ error: 'Falta la ruta OSC' });

  try {
    await enviarOSCConSala(salaId, ruta, valor);
    res.json({ ok: true, mensaje: `Enviado a ${ruta} valor ${JSON.stringify(valor)}` });
  } catch (err) {
    console.error('❌ Error al enviar OSC:', err);
    res.status(500).json({ error: 'Error interno al enviar OSC' });
  }
});

// mesaRoutes.js  (añádelo debajo del POST /osc)
router.get('/osc', async (req, res) => {
  const salaId = req.session?.user?.sala_id;
  if (!salaId) return res.status(401).json({ ok: false, error: 'No autenticado' });

  const ruta = req.query?.ruta;
  if (!ruta) return res.status(400).json({ ok: false, error: 'Falta la ruta OSC' });

  try {
    const valor = await leerOSCConSala(salaId, ruta);
    res.json({ ok: true, valor });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});


// ✅ batch GET
router.post('/osc/batch', async (req, res) => {
  const salaId = req.session?.user?.sala_id;
  if (!salaId) return res.status(401).json({ error: 'No autenticado' });
  const rutas = Array.isArray(req.body?.rutas) ? req.body.rutas : [];
  if (!rutas.length) return res.status(400).json({ error: 'Faltan rutas' });

  try {
    const data = await leerBatchOSCConSala(salaId, rutas);
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ... al final, añade:
router.get('/meters', (req, res) => {
  const salaId = req.session?.user?.sala_id;
  if (!salaId) return res.status(401).json({ error: 'No autenticado' });
  try {
    const snap = getMetersSnapshot(salaId);
    res.json({ ok: true, data: snap });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
