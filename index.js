// pipabot-v2/index.js
const path = require('path');

const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const API_KEY = 'AIzaSyCOQm99Vru2agGrj6guETO4APv3gf2-BQI'; // <-- pega aquí tu API key de Gemini

app.post('/preguntar', async (req, res) => {
  const userMessage = req.body.mensaje;

  try {
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + API_KEY,
      {
        contents: [{ parts: [{ text: userMessage }] }]
      }
    );

    const reply = response.data.candidates[0].content.parts[0].text;
    res.json({ respuesta: reply });
  } catch (error) {
    console.error('Error al llamar a Gemini:', error.message);
    res.status(500).json({ error: 'Algo falló con Gemini' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(3000, () => {
  console.log('Servidor escuchando en http://localhost:3000');
});