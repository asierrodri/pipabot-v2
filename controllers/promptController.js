const { askGemini } = require('../services/geminiService');
const { askDeepseek } = require('../services/deepseekService');
const { leerBatchOSCConSala } = require('../services/mesaOSC'); // ← añadimos lectura real de la mesa

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

  if (comandos.length === 0) return String(texto);
  return JSON.stringify(comandos); // "[]" si no hay nada
}


// ===== Helpers de render de lectura (mute/fader) =====
function unitToDbApprox(x) {
  if (typeof x !== 'number') return null;
  if (x <= 0) return -90;
  if (x >= 0.75) return 0; // 0 dB real ≈ 0.75 en X32
  const t = x / 0.75;
  return (Math.pow(t, 1 / 1.7) * 90) - 90;
}
function looksLikeDb(v) {
  return typeof v === 'number' && v <= 0 && v >= -120;
}
function renderLectura(rutas, data) {
  const partes = [];
  for (const ruta of rutas) {
    const v = data[ruta];
    if (ruta.endsWith('/mix/on')) {
      const muted = parseInt(v, 10) === 0;
      const ch = ruta.match(/\/ch\/(\d{2})\//)?.[1];
      const label = ch ? `Canal ${ch}` : 'Master';
      partes.push(`${label}: ${muted ? 'muteado' : 'activo'}`);
    } else if (ruta.endsWith('/mix/fader')) {
      const ch = ruta.match(/\/ch\/(\d{2})\//)?.[1];
      const label = ch ? `Canal ${ch}` : 'Master';
      const db = looksLikeDb(v) ? v : unitToDbApprox(v);
      partes.push(`${label} fader: ${Number.isFinite(db) ? db.toFixed(1) : v} dB`);
    } else {
      partes.push(`${ruta}: ${v}`);
    }
  }
  return partes.join(' · ');
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
  const salaId = req.session?.user?.sala_id || null;
  let modoOsc = req.body.modoOsc === 'automatico' ? 'automatico' : 'manual';
  if (modoOsc === 'automatico' && role !== 'admin') {
    modoOsc = 'manual';
  }

  // 4) Llamar al modelo
  try {
    const username = req.session?.user?.username || 'Usuario desconocido';
    const salaId = req.session?.user?.sala_id || null;
    const respuestaRaw = (modelo.toUpperCase() === 'DEEPSEEK')
      ? await askDeepseek({ historial, username, modoOsc, salaId })
      : await askGemini({ historial, username, modoOsc, salaId });

    // ——— Interpretación avanzada: si viene un ARRAY JSON ———
    const trimmed = (respuestaRaw || '').trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      let bloques;
      try { bloques = JSON.parse(trimmed); } catch (_) { bloques = null; }

      if (Array.isArray(bloques) && bloques.length > 0) {
        // 1) Caso LECTURA: [{"accion":"leer","rutas":[...]}]
        const leer = bloques.find(b => b && b.accion === 'leer' && Array.isArray(b.rutas) && b.rutas.length > 0);
        if (leer) {
          if (!salaId) {
            return res.status(401).json({ error: 'No hay sala en sesión para consultar la mesa' });
          }
          try {
            const data = await leerBatchOSCConSala(salaId, leer.rutas);
            const texto = renderLectura(leer.rutas, data);
            return res.json({ respuesta: texto });
          } catch (e) {
            console.error('❌ Error leyendo mesa:', e.message);
            return res.status(500).json({ error: 'No se pudo consultar la mesa' });
          }
        }

        // 2) Caso COMANDOS (ejecución): [{ "ruta": "...", "valor": ... }]
        //    - Si estamos en AUTOMÁTICO → devolvemos array JSON normalizado (tu front/servidor ya lo procesa)
        //    - Si estamos en MANUAL → convertimos a líneas "/ruta valor" para mostrar bonito
        const esComandos = bloques.every(b => b && typeof b.ruta === 'string' && 'valor' in b);
        if (esComandos) {
          if (modoOsc === 'automatico') {
            const respuesta = normalizarAArrayComandos(trimmed);
            return res.json({ respuesta });
          } else {
            const manual = bloques.map(b => {
              const val = Array.isArray(b.valor) ? b.valor.join(' ') : String(b.valor);
              return `${b.ruta} ${val}`;
            }).join('\n');
            return res.json({ respuesta: manual });
          }
        }
        // Si no es lectura ni comandos claros, cae a comportamiento por defecto
      }
    }

    // ——— Fallback: si el modelo NO devolvió lectura, pero el usuario ha preguntado por estado ———
    try {
      if (salaId) {
        const m = (mensaje || '').toLowerCase();
        const num = m.match(/(?:canal|el|del)\s*(\d{1,2})\b/);
        const ch = num ? String(parseInt(num[1], 10)).padStart(2, '0') : null;

        const pideMute = /(mute|desmute|estado|activo|silencio|cómo está|como esta)/.test(m);
        const pideFader = /(fader|nivel|cu[aá]nto|valor|volumen)/.test(m);
        const pideMaster = /(master|main|lr)/.test(m);

        const rutas = [];
        if (pideMaster) {
          if (pideMute || !pideFader) rutas.push('/main/st/mix/on');
          if (pideFader || !pideMute) rutas.push('/main/st/mix/fader');
        } else if (ch) {
          if (pideMute || !pideFader) rutas.push(`/ch/${ch}/mix/on`);
          if (pideFader || !pideMute) rutas.push(`/ch/${ch}/mix/fader`);
        }

        if (rutas.length > 0) {
          const data = await leerBatchOSCConSala(salaId, rutas);
          const texto = renderLectura(rutas, data);
          return res.json({ respuesta: texto });
        }
      }
    } catch (e) {
      console.warn('⚠️ Fallback lectura fallido:', e.message);
    }


    // ——— Comportamiento por defecto de tu app ———
    const respuesta = (modoOsc === 'automatico')
      ? normalizarAArrayComandos(respuestaRaw) // garantizamos array JSON en automático
      : respuestaRaw;                          // en manual, text tal cual

    return res.json({ respuesta });

  } catch (error) {
    console.error('❌ Error en el controlador:', error.message);
    console.error('🔍 Detalle:', error.response?.data || error);
    res.status(500).json({ error: 'Error al generar respuesta' });
  }
};

module.exports = { handlePrompt };

