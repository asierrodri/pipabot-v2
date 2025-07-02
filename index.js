const express = require('express');
const app = express();
const promptRoutes = require('./routes/prompt');

app.use(express.json());

// Rutas
app.use('/api/prompt', promptRoutes);

// Ruta por defecto
app.get('/', (req, res) => {
  res.send('¡Paco está en la casa!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
