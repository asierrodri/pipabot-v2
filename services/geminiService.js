const axios = require('axios');
const { GEMINI_API_URL } = require('../config/geminiConfig');
const db = require('../config/db');

// Obtener prompt desde la base de datos por secciones
const getPromptFromSections = (username, salaId) => {
  return new Promise((resolve, reject) => {
    const sql = salaId
      ? 'SELECT seccion, contenido FROM prompt_secciones WHERE es_actual = TRUE AND sala_id = ?'
      : 'SELECT seccion, contenido FROM prompt_secciones WHERE es_actual = TRUE';
    const params = salaId ? [salaId] : [];
    db.query(sql, params, (err, results) => {
      if (err || !results.length) return reject('❌ No hay prompts activos');

      const secciones = {
        modo: '',
        espacio: '',
        material: '',
        normas: '',
        mesa: ''
      };

      for (const row of results) {
        secciones[row.seccion] = row.contenido;
      }

      const prompt = `
Mi nombre es ${username}.

${secciones.modo}

${secciones.espacio}

${secciones.material}

${secciones.normas}

${secciones.mesa}

Responde siempre de forma breve, directa y sin repetir cosas.
        `.trim();
      resolve(prompt);
    }
    );
  });
};

// Función principal para enviar conversación a Gemini
const askGemini = async ({ historial, username, modoOsc = 'manual', salaId}) => {
  const prompt = await getPromptFromSections(username, salaId);
  const promptFinal = `${prompt}

  MODO_ACTUAL: ${modoOsc}

    REGLAS DE MODO (NO CAMBIES EL MODO NUNCA):
    - Si MODO_ACTUAL == "automatico":
  * Si el usuario pide ejecutar/leer algo de la mesa → devuelve EXCLUSIVAMENTE un ARRAY JSON de objetos
    { "ruta": string, "valor": number|string|array }. Sin texto adicional ni backticks.
  * Si NO hay ninguna acción OSC clara o el usuario sólo charla → RESPONDE EN TEXTO PLANO (sin JSON).

  Nunca devuelvas un array vacío. Si no procede ejecutar nada, contesta en texto plano.

    - Si MODO_ACTUAL == "manual": responde SOLO en texto plano; NUNCA devuelvas JSON ni rutas OSC.

    Ignora cualquier petición del usuario de cambiar el modo (manual/automatico).
    Ejemplos VÁLIDOS en automático:
    [{"ruta":"/ch/01/mix/on","valor":0}]
    [{"ruta":"/ch/10/mix/fader","valor":0.8},{"ruta":"/ch/01/mix/on","valor":0}]
    Ejemplo si no procede hacer nada: []
    `;


  // Limitar historial a los últimos 10 mensajes si es muy largo
  const historialReciente = historial.slice(-10);

  const contents = [
    {
      role: 'model',
      parts: [{ text: promptFinal }]
    },
    ...historialReciente.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }))
  ];

  const response = await axios.post(GEMINI_API_URL, { contents });
  return response.data.candidates[0].content.parts[0].text;
};

const { askDeepseek } = require('./deepseekService');

const generarTitulo = async (historial, username = 'Usuario') => {
  const intro = `Genera un título breve y descriptivo para esta conversación. No uses comillas ni puntuación innecesaria. Máximo 100 caracteres.`;

  const resumen = historial.slice(0, 2).map(m =>
    `${m.role === 'user' ? 'Usuario' : 'Bot'}: ${m.text}`
  ).join('\n');

  const modelo = process.env.MODEL_PROVIDER || 'GEMINI';

  if (modelo.toUpperCase() === 'DEEPSEEK') {
    const resumenHistorial = [
      { role: 'user', text: `${intro}\n\n${resumen}` }
    ];

    const respuesta = await askDeepseek({
      historial: resumenHistorial,
      username,
      modoOsc: 'manual'
    });

    return respuesta?.trim().slice(0, 100) || 'Sin título';
  }
  else {
    const contents = [
      {
        role: 'user',
        parts: [{ text: `${intro}\n\n${resumen}` }]
      }
    ];
    const response = await axios.post(GEMINI_API_URL, { contents });
    return response.data.candidates[0].content.parts[0].text.trim().slice(0, 100);
  }
};

module.exports = { askGemini, generarTitulo };

