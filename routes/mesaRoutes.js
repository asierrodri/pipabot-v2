const express = require('express');
const router = express.Router();
const { enviarOSC } = require('../services/mesaOSC');

router.post('/osc', (req, res) => {
  const { ruta, valor } = req.body;
  if (!ruta) return res.status(400).json({ error: 'Falta la ruta OSC' });

  try {
    enviarOSC(ruta, valor);
    res.json({ ok: true, mensaje: `Enviado a ${ruta} valor ${valor}` });
  } catch (err) {
    console.error('❌ Error al enviar OSC:', err);
    res.status(500).json({ error: 'Error interno al enviar OSC' });
  }
});

module.exports = router;
