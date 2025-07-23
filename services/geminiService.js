const axios = require('axios');
const { GEMINI_API_URL } = require('../config/geminiConfig');
const db = require('../config/db');

// Obtener prompt desde la base de datos por secciones
const getPromptFromSections = (username) => {
  return new Promise((resolve, reject) => {
    db.query(
      'SELECT seccion, contenido FROM prompt_secciones WHERE es_actual = TRUE',
      (err, results) => {
        if (err || !results.length) return reject('❌ No hay prompts activos');

        const secciones = {
          modo: '',
          espacio: '',
          material: '',
          normas: ''
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

Responde siempre de forma breve, directa y sin repetir cosas.
        `.trim();

        resolve(prompt);
      }
    );
  });
};

// Función principal para enviar conversación a Gemini
const askGemini = async (historial, username) => {
  const prompt = await getPromptFromSections(username);

  // Limitar historial a los últimos 10 mensajes si es muy largo
  const historialReciente = historial.slice(-10);

  const contents = [
    {
      role: 'model',
      parts: [{ text: prompt }]
    },
    ...historialReciente.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }))
  ];

  const response = await axios.post(GEMINI_API_URL, { contents });
  return response.data.candidates[0].content.parts[0].text;
};

const generarTituloConGemini = async (historial) => {
  const intro = `Genera un título breve y descriptivo para esta conversación. No uses comillas ni puntuación innecesaria. Máximo 100 caracteres.`;

  const resumen = historial.slice(0, 2).map(m =>
    `${m.role === 'user' ? 'Usuario' : 'Bot'}: ${m.text}`
  ).join('\n');

  const contents = [
    {
      role: 'user',
      parts: [{ text: `${intro}\n\n${resumen}` }]
    }
  ];

  const response = await axios.post(GEMINI_API_URL, { contents });
  return response.data.candidates[0].content.parts[0].text.trim().slice(0, 100);
};

module.exports = { askGemini, generarTituloConGemini };

