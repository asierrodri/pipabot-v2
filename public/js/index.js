// Verificar si el usuario ha iniciado sesión
if (!localStorage.getItem('username')) {
  window.location.href = '/login.html';
}

// Mostrar nombre de usuario en pantalla
const nombre = localStorage.getItem('username');
if (nombre) {
  document.getElementById('nombreUsuario').textContent = nombre;
}

// Función para preguntar a PipaBot
async function preguntar() {
  const mensajeInput = document.getElementById('mensaje');
  const mensaje = mensajeInput.value.trim();
  const chat = document.getElementById('chat');

  if (!mensaje) return; // No enviar si está vacío

  // Limpiar input
  mensajeInput.value = '';

  // Crear burbuja de usuario
  const burbujaUsuario = document.createElement('div');
  burbujaUsuario.className = 'd-flex justify-content-end w-100 align-items-end gap-2';
  burbujaUsuario.innerHTML = `
  <div class="bg-primary text-white p-2 rounded shadow-sm" style="max-width: 75%; word-wrap: break-word;">
    ${mensaje}
  </div>
  <img src="img/usuario.png" alt="Usuario" class="rounded-circle" width="32" height="32">
`;
  chat.appendChild(burbujaUsuario);


  // Crear burbuja del bot con "..."
  const burbujaBot = document.createElement('div');
  burbujaBot.className = 'd-flex justify-content-start w-100 align-items-end gap-2';
  burbujaBot.innerHTML = `
  <img src="img/maquina.png" alt="Bot" class="rounded-circle" width="32" height="32">
  <div class="bg-light text-dark p-2 rounded shadow-sm" style="max-width: 75%; word-wrap: break-word;">
    ...
  </div>
`;
  chat.appendChild(burbujaBot);


  // Scroll hacia abajo
  chat.scrollTop = chat.scrollHeight;

  try {
    const res = await fetch('/preguntar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensaje })
    });

    const data = await res.json();
    burbujaBot.querySelector('div').textContent = data.respuesta || data.error;
  } catch (err) {
    burbujaBot.textContent = 'Error al conectar con el servidor';
  }

  // Scroll hacia abajo tras respuesta
  chat.scrollTop = chat.scrollHeight;
}

// Cerrar sesión
function cerrarSesion() {
  localStorage.clear();
  window.location.href = '/login.html';
}

// Enviar con Enter
document.getElementById('mensaje').addEventListener('keydown', function (event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    preguntar();
  }
});
