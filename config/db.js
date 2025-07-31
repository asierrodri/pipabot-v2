require('dotenv').config();
const mysql = require('mysql2');

const pool = mysql.createPool({
  connectionLimit: 10, // número de conexiones simultáneas permitidas
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Opcional: comprobar conexión inicial
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Error al conectar al pool de MySQL:', err);
  } else {
    console.log('✅ Pool de MySQL conectado');
    connection.release(); // liberamos la conexión
  }
});

module.exports = pool;
