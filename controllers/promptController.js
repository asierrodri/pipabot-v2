const { askGemini } = require('../services/geminiService');

const handlePrompt = async (req, res) => {
  const mensaje = req.body.mensaje;
  const archivo = req.file;

  let historial = [];

  // Cargar historial del body si lo hay
  if (req.body.historial) {
    try {
      historial = JSON.parse(req.body.historial);
    } catch (error) {
      console.error('❌ Error al parsear historial:', error.message);
      return res.status(400).json({ error: 'Formato de historial inválido' });
    }
  }

  // Añadir mensaje si existe
  if (mensaje) {
    historial.push({ role: 'user', text: mensaje });
  }

  // Añadir contenido del archivo si existe
  if (archivo) {
    const contenido = archivo.buffer.toString('utf-8');
    historial.push({
      role: 'user',
      text: `Contenido del archivo "${archivo.originalname}":\n${contenido}`
    });
  }

  // Validación final
  if (historial.length === 0) {
    return res.status(400).json({ error: 'No se recibió mensaje ni archivo' });
  }

  try {
    const respuesta = await askGemini(historial);
    res.json({ respuesta });
  } catch (error) {
    console.error('❌ Error en el controlador:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { handlePrompt };
