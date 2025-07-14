// =========================
// 👤 Mostrar nombre de usuario y rol admin
// =========================
fetch('/auth/usuario')
  .then(res => res.json())
  .then(data => {
    if (data.username) {
      document.getElementById('nombreUsuario').textContent = data.username;
      if (localStorage.getItem('role') === 'admin') {
        document.getElementById('enlaceAdmin').style.display = 'inline-block';
      }
    }
  })
  .catch(err => {
    console.error('Error al obtener el nombre de usuario:', err);
  });

// =========================
// 💬 Historial de mensajes (localStorage)
// =========================
let historial = JSON.parse(localStorage.getItem('historial')) || [];

// =========================
// 🚀 Ejecutar al cargar página
// =========================
window.addEventListener('DOMContentLoaded', () => {
  const modoGuardado = localStorage.getItem('modo') || 'claro';
  alternarModo(modoGuardado);

  // ✅ Si no hay preferencia de voz, activarla por defecto
  if (localStorage.getItem('vozActivada') === null) {
    localStorage.setItem('vozActivada', 'true');
  }

  actualizarBotonVoz();

  // Mostrar historial
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

// =========================
// 🗣️ Hablar si voz activada
// =========================
function hablar(texto) {
  const activada = localStorage.getItem('vozActivada') === 'true';
  if (!activada) return;

  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = 'es-ES';
    utterance.rate = 1;
    utterance.pitch = 1;
    speechSynthesis.speak(utterance);
  }
}

// =========================
// 🔁 Actualizar botón de voz (texto y estilo)
// =========================
function actualizarBotonVoz() {
  const btn = document.getElementById('toggleVoz');
  if (!btn) return;

  const activada = localStorage.getItem('vozActivada') === 'true';

  btn.className = 'btn btn-sm';
  btn.classList.add(activada ? 'btn-outline-primary' : 'btn-outline-secondary');
  btn.textContent = activada ? '🔈 Voz activada' : '🔇 Voz desactivada';
}

// =========================
// 🔘 Alternar voz y guardar preferencia
// =========================
function alternarVoz() {
  const actual = localStorage.getItem('vozActivada') === 'true';
  const nuevo = !actual;
  localStorage.setItem('vozActivada', nuevo.toString());
  actualizarBotonVoz();
}

// =========================
// 📤 Preguntar a PipaBot
// =========================
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

  // Mostrar mensaje del usuario
  const burbujaUsuario = document.createElement('div');
  burbujaUsuario.className = 'd-flex justify-content-end w-100 align-items-end gap-2';
  burbujaUsuario.innerHTML = `
    <div class="bg-primary text-white p-2 rounded shadow-sm" style="max-width: 75%; word-wrap: break-word;">
      ${mensaje || '[Archivo enviado]'}
    </div>
    <img src="img/usuario.png" alt="Usuario" class="rounded-circle" width="32" height="32">
  `;
  chat.appendChild(burbujaUsuario);

  // Mostrar "..." del bot mientras responde
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
  formData.append('historial', JSON.stringify(historial));

  try {
    const res = await fetch('/preguntar', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    burbujaBot.querySelector('div').textContent = data.respuesta || data.error;

    if (data.respuesta) hablar(data.respuesta); // 🗣️

    // Guardar en historial local
    historial.push({ role: 'user', text: mensaje || `[Archivo: ${archivo?.name}]` });
    historial.push({ role: 'model', text: data.respuesta || data.error });
    localStorage.setItem('historial', JSON.stringify(historial));

  } catch (err) {
    burbujaBot.querySelector('div').textContent = 'Error al conectar con el servidor';
  }

  chat.scrollTop = chat.scrollHeight;
}

// =========================
// ⛔ Cerrar sesión
// =========================
async function cerrarSesion() {
  // 🔄 Eliminar historial y preferencias locales
  localStorage.removeItem('historial');
  localStorage.removeItem('modo');           // ⬅️ reset modo claro/oscuro
  localStorage.removeItem('vozActivada');    // ⬅️ reset voz

  // 🔐 Cerrar sesión en el backend
  await fetch('/auth/logout', { method: 'POST' });

  // 🚪 Redirigir a login
  window.location.href = '/login.html';
}

// =========================
// ⌨️ Enviar mensaje con Enter
// =========================
document.getElementById('mensaje').addEventListener('keydown', function (event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    preguntar();
  }
});

// =========================
// 🌞🌙 Modo claro / oscuro
// =========================
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

// =========================
// 📎 Subir archivo
// =========================
let archivoSeleccionado = null;

document.getElementById('btnUpload').addEventListener('click', () => {
  document.getElementById('archivo').click();
});

document.getElementById('archivo').addEventListener('change', (e) => {
  const archivo = e.target.files[0];
  archivoSeleccionado = archivo;

  const archivoNombre = document.getElementById('archivoNombre');
  archivoNombre.textContent = archivo
    ? `Archivo seleccionado: ${archivo.name}`
    : '';
});

//hablar
function escuchar() {
  if (!('webkitSpeechRecognition' in window)) {
    alert('Tu navegador no soporta reconocimiento por voz');
    return;
  }

  const reconocimiento = new webkitSpeechRecognition();
  reconocimiento.lang = 'es-ES';
  reconocimiento.interimResults = false;
  reconocimiento.maxAlternatives = 1;

  reconocimiento.onstart = () => {
    console.log('🎙️ Escuchando...');
  };

  reconocimiento.onresult = (event) => {
    const texto = event.results[0][0].transcript;
    console.log('✅ Reconocido:', texto);

    const input = document.getElementById('mensaje');
    input.value = texto;
    preguntar(); // enviar automáticamente
  };

  reconocimiento.onerror = (event) => {
    console.error('❌ Error en reconocimiento:', event.error);
  };

  reconocimiento.start();
}

