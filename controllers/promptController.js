const handlePrompt = (req, res) => {
  const { mensaje } = req.body;

  if (!mensaje) {
    return res.status(400).json({ error: 'Falta el campo "mensaje"' });
  }

  res.json({
    respuesta: `Paco ha recibido tu mensaje: "${mensaje}"`
  });
};

module.exports = { handlePrompt };
