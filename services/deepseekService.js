const axios = require('axios');
require('dotenv').config();

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

async function askDeepseek(historial) {
    const mensajes = historial.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text
    }));

    if (!mensajes.length) {
        mensajes.push({ role: 'user', content: 'Hola' });
    }

    try {
        const res = await axios.post(
            DEEPSEEK_API_URL,
            {
                model: 'deepseek-chat',
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
