const express = require('express');
const router = express.Router();
const { enviarOSCConSala } = require('../services/mesaOSC'); // nuevo API


router.post('/osc', async (req, res) => {
  const { ruta, valor } = req.body;
  if (!ruta) return res.status(400).json({ error: 'Falta la ruta OSC' });
  const salaId = req.session?.user?.sala_id;
  if (!salaId) return res.status(401).json({ error: 'No autenticado' });

  try {
    await enviarOSCConSala(salaId, ruta, valor);
    res.json({ ok: true, mensaje: `Enviado a ${ruta} valor ${JSON.stringify(valor)}` });
  } catch (err) {
    console.error('❌ Error al enviar OSC:', err);
    res.status(500).json({ error: 'Error interno al enviar OSC' });
  }
});

module.exports = router;
