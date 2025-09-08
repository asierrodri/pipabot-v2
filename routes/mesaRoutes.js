const express = require('express');
const router = express.Router();
const { enviarOSCConSala, leerOSCConSala, leerBatchOSCConSala } = require('../services/mesaOSC');

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

module.exports = router;
