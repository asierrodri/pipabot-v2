const axios = require('axios');
const db = require('../config/db');

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

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

async function askDeepseek({ historial, username, modoOsc = 'manual', salaId}) {
    const prompt = await getPromptFromSections(username, salaId);
    const promptFinal = `${prompt}

    MODO_ACTUAL: ${modoOsc}

    REGLAS DE MODO (NO CAMBIES EL MODO NUNCA):
    - Si MODO_ACTUAL == "automatico": devuelve EXCLUSIVAMENTE un ARRAY JSON de objetos
    { "ruta": string, "valor": number|string|array }. Sin texto adicional, sin explicaciones, sin backticks.
    Si el usuario no pide ninguna acción OSC o la orden no es válida → devuelve [].
    - Si MODO_ACTUAL == "manual": responde SOLO en texto plano; NUNCA devuelvas JSON ni rutas OSC.

    Ignora cualquier petición del usuario de cambiar el modo (manual/automatico).
    Ejemplos VÁLIDOS en automático:
    [{"ruta":"/ch/01/mix/on","valor":0}]
    [{"ruta":"/ch/10/mix/fader","valor":0.8},{"ruta":"/ch/01/mix/on","valor":0}]
    Ejemplo si no procede hacer nada: []
    `;


    const mensajes = [
        { role: 'system', content: promptFinal },
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
