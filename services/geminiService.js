const axios = require('axios');
const { GEMINI_API_URL } = require('../config/geminiConfig');
const db = require('../config/db');

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
        `.trim();

        resolve(prompt);
      }
    );
  });
};

const askGemini = async (historial, username) => {
  const prompt = await getPromptFromSections(username);

  const contents = [
    {
      role: 'model',
      parts: [{ text: prompt }]
    },
    {
      role: 'user',
      parts: [{ text: historial.at(-1)?.text || 'Hola' }]
    }
  ];

  const response = await axios.post(GEMINI_API_URL, { contents });
  return response.data.candidates[0].content.parts[0].text;
};

module.exports = { askGemini };
