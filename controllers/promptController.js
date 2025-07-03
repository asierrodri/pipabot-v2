const { askGemini } = require('../services/geminiService');

const handlePrompt = async (req, res) => {
  const userMessage = req.body.mensaje;

  try {
    const respuesta = await askGemini(userMessage);
    res.json({ respuesta });
  } catch (error) {
    console.error('Error en el controlador:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { handlePrompt };
