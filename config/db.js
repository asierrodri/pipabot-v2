const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',           // Usuario por defecto de XAMPP
  password: '',           // Vacío si no configuraste contraseña
  database: 'pipabot'
});

connection.connect(error => {
  if (error) {
    console.error('Error al conectar a la base de datos:', error);
  } else {
    console.log('Conectado a la base de datos MySQL');
  }
});

module.exports = connection;
