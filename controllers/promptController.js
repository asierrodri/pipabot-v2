const { askGemini } = require('../services/geminiService');
const { askDeepseek } = require('../services/deepseekService');


function normalizarAArrayComandos(texto) {
  // 1) Si ya es JSON array válido → lo devolvemos tal cual (stringificado)
  try {
    const parsed = JSON.parse(texto);
    if (Array.isArray(parsed)) return JSON.stringify(parsed);
  } catch (_) { }

  // 2) Extraer líneas tipo "/ruta valor"
  const comandos = [];
  const lines = String(texto).split(/\r?\n/);
  for (const line of lines) {
    const l = line.trim();
    if (!l.startsWith('/')) continue;

    // "/ch/01/mix/on 0"  |  "/save scene 83 pipabot"
    const parts = l.split(/\s+/);
    const ruta = parts.shift();              // "/ch/01/mix/on"
    if (!parts.length) continue;
    const rest = parts.join(' ');            // "0" | "scene 83 pipabot"

    let valor;
    if (/^-?\d+(\.\d+)?$/.test(rest)) {
      valor = parseFloat(rest);
    } else if (rest.includes(' ')) {
      valor = rest.split(/\s+/).map(t => (/^-?\d+(\.\d+)?$/.test(t) ? parseFloat(t) : t));
    } else {
      valor = rest;                           // string
    }

    comandos.push({ ruta, valor });
  }

  return JSON.stringify(comandos); // "[]" si no hay nada
}

const handlePrompt = async (req, res) => {
  const mensaje = req.body.mensaje;
  const archivo = req.file;
  const modelo = process.env.MODEL_PROVIDER || 'GEMINI';

  // 1) Leer historial
  let historial = [];
  if (req.body.historial) {
    try {
      historial = JSON.parse(req.body.historial);
    } catch (error) {
      console.error('❌ Error al parsear historial:', error.message);
      return res.status(400).json({ error: 'Formato de historial inválido' });
    }
  }

  // 2) Añadir mensaje/archivo al historial
  if (mensaje) historial.push({ role: 'user', text: mensaje });
  if (archivo) {
    const contenido = archivo.buffer.toString('utf-8');
    historial.push({
      role: 'user',
      text: `Contenido del archivo "${archivo.originalname}":\n${contenido}`
    });
  }
  if (historial.length === 0) return res.status(400).json({ error: 'No se recibió mensaje ni archivo' });

  // 3) Bloquear modo automático a no-admin
  const role = req.session?.user?.role || 'user';
  let modoOsc = req.body.modoOsc === 'automatico' ? 'automatico' : 'manual';
  if (modoOsc === 'automatico' && role !== 'admin') {
    modoOsc = 'manual';
  }

  // 4) Llamar al modelo
  try {
    const username = req.session?.user?.username || 'Usuario desconocido';
    const respuestaRaw = (modelo.toUpperCase() === 'DEEPSEEK')
      ? await askDeepseek({ historial, username, modoOsc })
      : await askGemini({ historial, username, modoOsc });

    // 🔒 Garantizar array JSON cuando estamos en automático
    const respuesta = (modoOsc === 'automatico')
      ? normalizarAArrayComandos(respuestaRaw)
      : respuestaRaw;

    res.json({ respuesta });
  } catch (error) {
    console.error('❌ Error en el controlador:', error.message);
    console.error('🔍 Detalle:', error.response?.data || error);
    res.status(500).json({ error: 'Error al generar respuesta' });
  }
};

module.exports = { handlePrompt };

