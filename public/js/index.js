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
document.addEventListener('DOMContentLoaded', () => {
  if ('speechSynthesis' in window) speechSynthesis.cancel();

  const modoGuardado = localStorage.getItem('modo') || 'claro';
  alternarModo(modoGuardado);

  if (localStorage.getItem('vozActivada') === null) {
    localStorage.setItem('vozActivada', 'true');
  }

  actualizarBotonVoz();

  // Mostrar historial con hora
  const chat = document.getElementById('chat');
  for (const msg of historial) {
    const burbuja = document.createElement('div');
    burbuja.className = msg.role === 'user'
      ? 'd-flex justify-content-end w-100 align-items-end gap-2'
      : 'd-flex justify-content-start w-100 align-items-end gap-2';

    const hora = msg.timestamp
      ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    const contenido = `
      <div class="small ${msg.role === 'user' ? 'text-white-50 text-end' : 'text-muted'} mb-1">${hora}</div>
      ${msg.text}
    `;

    burbuja.innerHTML = msg.role === 'user'
      ? `
        <div class="bg-primary text-white p-2 rounded shadow-sm" style="max-width: 75%; word-wrap: break-word;">
          ${contenido}
        </div>
        <img src="img/usuario.png" alt="Usuario" class="rounded-circle" width="32" height="32">
      `
      : `
        <img src="img/maquina.png" alt="Bot" class="rounded-circle" width="32" height="32">
        <div class="bg-light text-dark p-2 rounded shadow-sm" style="max-width: 75%; word-wrap: break-word;">
          ${contenido}
        </div>
      `;
    chat.appendChild(burbuja);
  }

  chat.scrollTop = chat.scrollHeight;


  // Listener botones del menú
  document.getElementById('btnAlternarModo')?.addEventListener('click', () => {
    const modoActual = localStorage.getItem('modo') === 'oscuro' ? 'claro' : 'oscuro';
    alternarModo(modoActual);
  });

  document.getElementById('btnAlternarVoz')?.addEventListener('click', alternarVoz);

  if (localStorage.getItem('role') === 'admin') {
    document.getElementById('enlaceAdminMenu').style.display = 'block';
  }
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
    utterance.rate = 1.2;
    utterance.pitch = 1.1;

    // Intentar seleccionar una voz española más natural (Google si está disponible)
    const seleccionarVoz = () => {
      const voces = speechSynthesis.getVoices();
      const vozNatural = voces.find(v => v.lang.startsWith('es') && v.name.includes('Google'));
      if (vozNatural) utterance.voice = vozNatural;
      speechSynthesis.speak(utterance);
    };

    if (speechSynthesis.getVoices().length === 0) {
      speechSynthesis.onvoiceschanged = seleccionarVoz;
    } else {
      seleccionarVoz();
    }
  }
}


// =========================
// 🔁 Actualizar botón de voz (texto y estilo)
// =========================
function actualizarBotonVoz() {
  const activada = localStorage.getItem('vozActivada') === 'true';

  const btnMenu = document.getElementById('btnAlternarVoz');
  if (btnMenu) {
    btnMenu.textContent = activada ? 'Desactivar voz' : 'Activar voz';
  }
}

// =========================
// 🔘 Alternar voz y guardar preferencia
// =========================
function alternarVoz() {
  const actual = localStorage.getItem('vozActivada') === 'true';
  const nuevo = !actual;
  localStorage.setItem('vozActivada', nuevo.toString());
  actualizarBotonVoz();

  // Si se desactiva la voz, detener inmediatamente cualquier síntesis en curso
  if (!nuevo && 'speechSynthesis' in window) {
    speechSynthesis.cancel();
  }
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

  // 🔸 Capturar nombre del archivo antes de resetear input
  const nombreArchivo = archivo ? archivo.name : null;

  mensajeInput.value = '';
  document.getElementById('archivoNombre').textContent = '';
  archivoInput.value = '';
  archivoSeleccionado = null;

  // Mostrar mensaje del usuario
  const textoUsuario = mensaje || `[Archivo enviado: ${nombreArchivo}]`;

  const horaUsuario = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const burbujaUsuario = document.createElement('div');
  burbujaUsuario.className = 'd-flex justify-content-end w-100 align-items-end gap-2';
  burbujaUsuario.innerHTML = `
    <div class="bg-primary text-white p-2 rounded shadow-sm" style="max-width: 75%; word-wrap: break-word;">
      <div class="small text-white-50 text-end mb-1">${horaUsuario}</div>
      ${textoUsuario}
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
      <div class="typing"><span>.</span><span>.</span><span>.</span></div>
    </div>
  `;

  chat.appendChild(burbujaBot);
  chat.scrollTop = chat.scrollHeight;

  const formData = new FormData();
  if (mensaje) formData.append('mensaje', mensaje);
  if (archivo) formData.append('archivo', archivo);
  formData.append('historial', JSON.stringify(historial));

  try {
    if ('speechSynthesis' in window) speechSynthesis.cancel(); // ⬅️ Detener voz si el usuario manda otra pregunta
    const res = await fetch('/preguntar', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    const horaBot = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    burbujaBot.querySelector('div').innerHTML = `
    <div class="small text-muted mb-1">${horaBot}</div>
    ${data.respuesta || data.error}
  `;


    if (data.respuesta) {
      if ('speechSynthesis' in window) speechSynthesis.cancel(); // Detener cualquier habla en curso
      hablar(data.respuesta);
    }


    // Guardar en historial correctamente
    const timestamp = new Date().toISOString();
    historial.push({ role: 'user', text: textoUsuario, timestamp });
    historial.push({ role: 'model', text: data.respuesta || data.error, timestamp: new Date().toISOString() });
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
    document.getElementById('btnAlternarModo').textContent = 'Modo claro';
  } else {
    body.style.backgroundImage = "url('img/backgroundChat.jpg')";
    localStorage.setItem('modo', 'claro');
    document.getElementById('btnAlternarModo').textContent = 'Modo oscuro';
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
    if (event.error === 'not-allowed') {
      alert('Permiso de micrófono denegado. Actívalo en la configuración del navegador.');
    } else if (event.error === 'no-speech') {
      alert('No se detectó voz. Asegúrate de tener un micrófono conectado y habla claramente.');
    } else if (event.error === 'audio-capture') {
      alert('No se detectó ningún micrófono. Conecta uno y vuelve a intentarlo.');
    } else {
      alert('Error de reconocimiento de voz: ' + event.error);
    }
  };

  reconocimiento.start();
}

// 🗑 Nueva conversación (botón normal y menú hamburguesa)
function borrarConversacion() {
  if (!confirm('¿Seguro que quieres borrar todo el historial de la conversación?')) return;

  // Detener cualquier voz en curso
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
  }

  // Borrar historial
  localStorage.removeItem('historial');
  historial = [];

  // Vaciar visualmente el chat
  document.getElementById('chat').innerHTML = '';
}

document.getElementById('btnNuevaConversacion')?.addEventListener('click', borrarConversacion);
document.getElementById('btnNuevaConversacionMenu')?.addEventListener('click', borrarConversacion);
