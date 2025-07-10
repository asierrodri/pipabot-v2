// Mostrar nombre de usuario en pantalla
fetch('/auth/usuario')
  .then(res => res.json())
  .then(data => {
    if (data.username) {
      document.getElementById('nombreUsuario').textContent = data.username;
    }
  })
  .catch(err => {
    console.error('Error al obtener el nombre de usuario:', err);
  });

// Cargar historial si existe
let historial = JSON.parse(localStorage.getItem('historial')) || [];

// Mostrar historial al cargar
window.addEventListener('DOMContentLoaded', () => {
  const modoGuardado = localStorage.getItem('modo') || 'claro';
  alternarModo(modoGuardado);

  const chat = document.getElementById('chat');
  for (const msg of historial) {
    const burbuja = document.createElement('div');
    burbuja.className = msg.role === 'user'
      ? 'd-flex justify-content-end w-100 align-items-end gap-2'
      : 'd-flex justify-content-start w-100 align-items-end gap-2';

    burbuja.innerHTML = msg.role === 'user'
      ? `
        <div class="bg-primary text-white p-2 rounded shadow-sm" style="max-width: 75%; word-wrap: break-word;">
          ${msg.text}
        </div>
        <img src="img/usuario.png" alt="Usuario" class="rounded-circle" width="32" height="32">
      `
      : `
        <img src="img/maquina.png" alt="Bot" class="rounded-circle" width="32" height="32">
        <div class="bg-light text-dark p-2 rounded shadow-sm" style="max-width: 75%; word-wrap: break-word;">
          ${msg.text}
        </div>
      `;
    chat.appendChild(burbuja);
  }
  chat.scrollTop = chat.scrollHeight;
});

// Función para preguntar a PipaBot
async function preguntar() {
  const mensajeInput = document.getElementById('mensaje');
  const mensaje = mensajeInput.value.trim();
  const chat = document.getElementById('chat');
  const archivoInput = document.getElementById('archivo');
  const archivo = archivoInput.files[0];

  if (!mensaje && !archivo) return;

  mensajeInput.value = '';
  document.getElementById('archivoNombre').textContent = '';
  archivoInput.value = '';
  archivoSeleccionado = null;

  const burbujaUsuario = document.createElement('div');
  burbujaUsuario.className = 'd-flex justify-content-end w-100 align-items-end gap-2';
  burbujaUsuario.innerHTML = `
    <div class="bg-primary text-white p-2 rounded shadow-sm" style="max-width: 75%; word-wrap: break-word;">
      ${mensaje || '[Archivo enviado]'}
    </div>
    <img src="img/usuario.png" alt="Usuario" class="rounded-circle" width="32" height="32">
  `;
  chat.appendChild(burbujaUsuario);

  const burbujaBot = document.createElement('div');
  burbujaBot.className = 'd-flex justify-content-start w-100 align-items-end gap-2';
  burbujaBot.innerHTML = `
    <img src="img/maquina.png" alt="Bot" class="rounded-circle" width="32" height="32">
    <div class="bg-light text-dark p-2 rounded shadow-sm" style="max-width: 75%; word-wrap: break-word;">
      ...
    </div>
  `;
  chat.appendChild(burbujaBot);
  chat.scrollTop = chat.scrollHeight;

  const formData = new FormData();
  if (mensaje) formData.append('mensaje', mensaje);
  if (archivo) formData.append('archivo', archivo);
  formData.append('historial', JSON.stringify(historial)); // ✅ Enviar historial completo

  try {
    const res = await fetch('/preguntar', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    burbujaBot.querySelector('div').textContent = data.respuesta || data.error;

    // ✅ Guardar en historial actualizado
    historial.push({ role: 'user', text: mensaje || `[Archivo: ${archivo?.name}]` });
    historial.push({ role: 'model', text: data.respuesta || data.error });
    localStorage.setItem('historial', JSON.stringify(historial));

  } catch (err) {
    burbujaBot.querySelector('div').textContent = 'Error al conectar con el servidor';
  }

  chat.scrollTop = chat.scrollHeight;
}

// Cerrar sesión
async function cerrarSesion() {
  await fetch('/auth/logout', { method: 'POST' });
  window.location.href = '/login.html';
}


// Enviar con Enter
document.getElementById('mensaje').addEventListener('keydown', function (event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    preguntar();
  }
});

// Alternar modo claro/oscuro
function alternarModo(modo) {
  const body = document.body;

  if (modo === 'oscuro') {
    body.style.backgroundImage = "url('img/backgroundChatDark.png')";
    localStorage.setItem('modo', 'oscuro');
    document.getElementById('btnModoOscuro').style.display = 'none';
    document.getElementById('btnModoClaro').style.display = 'inline-block';
  } else {
    body.style.backgroundImage = "url('img/backgroundChat.jpg')";
    localStorage.setItem('modo', 'claro');
    document.getElementById('btnModoClaro').style.display = 'none';
    document.getElementById('btnModoOscuro').style.display = 'inline-block';
  }
}

// Manejo del input de archivo
let archivoSeleccionado = null;

document.getElementById('btnUpload').addEventListener('click', () => {
  document.getElementById('archivo').click();
});

document.getElementById('archivo').addEventListener('change', (e) => {
  const archivo = e.target.files[0];
  archivoSeleccionado = archivo;

  const archivoNombre = document.getElementById('archivoNombre');
  if (archivo) {
    archivoNombre.textContent = `Archivo seleccionado: ${archivo.name}`;
  } else {
    archivoNombre.textContent = '';
  }
});
