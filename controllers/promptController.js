const { askGemini } = require('../services/geminiService');
const { askDeepseek } = require('../services/deepseekService');

const handlePrompt = async (req, res) => {
  const mensaje = req.body.mensaje;
  const archivo = req.file;
  const modelo = process.env.MODEL_PROVIDER || 'GEMINI';

  let historial = [];

  if (req.body.historial) {
    try {
      historial = JSON.parse(req.body.historial);
    } catch (error) {
      console.error('❌ Error al parsear historial:', error.message);
      return res.status(400).json({ error: 'Formato de historial inválido' });
    }
  }

  if (mensaje) {
    historial.push({ role: 'user', text: mensaje });
  }

  if (archivo) {
    const contenido = archivo.buffer.toString('utf-8');
    historial.push({
      role: 'user',
      text: `Contenido del archivo "${archivo.originalname}":\n${contenido}`
    });
  }

  if (historial.length === 0) {
    return res.status(400).json({ error: 'No se recibió mensaje ni archivo' });
  }

  try {
    const username = req.session?.user?.username || 'Usuario desconocido';
    let respuesta;

    if (modelo.toUpperCase() === 'DEEPSEEK') {
      respuesta = await askDeepseek(historial, username);
    } else {
      respuesta = await askGemini(historial, username);
    }

    res.json({ respuesta });
  } catch (error) {
    console.error('❌ Error en el controlador:', error.message);
    console.error('🔍 Detalle:', error.response?.data || error);
    res.status(500).json({ error: 'Error al generar respuesta' });
  }

};

module.exports = { handlePrompt };
