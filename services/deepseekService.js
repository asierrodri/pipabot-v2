const axios = require('axios');
const db = require('../config/db');

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

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

async function askDeepseek(historial, username) {
    const prompt = await getPromptFromSections(username);

    const mensajes = [
        { role: 'system', content: prompt },
        ...historial.map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.text
        }))
    ];

    if (!mensajes.length) {
        mensajes.push({ role: 'user', content: 'Hola' });
    }

    try {
        const res = await axios.post(
            DEEPSEEK_API_URL,
            {
                model: 'deepseek-chat', // o 'deepseek-reasoner' si estás usando ese modelo
                messages: mensajes,
            },
            {
                headers: {
                    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return res.data.choices[0].message.content;
    } catch (err) {
        console.error('❌ Error al usar DeepSeek:', err.response?.data || err.message);
        throw new Error('Error con DeepSeek API');
    }
}

module.exports = { askDeepseek };
