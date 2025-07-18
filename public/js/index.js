// =========================
// 👤 Mostrar nombre de usuario y rol admin
// =========================
fetch('/auth/usuario')
  .then(res => res.json())
  .then(data => {
    if (data.username) {
      document.getElementById('nombreUsuario').textContent = data.username;
      if (localStorage.getItem('role') === 'admin') {
        const enlaceAdmin = document.getElementById('enlaceAdmin');
        if (enlaceAdmin) enlaceAdmin.style.display = 'inline-block';
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
  // 🧹 Si no hay usuario guardado, borrar historial por seguridad
  if (!localStorage.getItem('username')) {
    localStorage.removeItem('historial');
  }

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
  const archivo = archivoSeleccionado;

  if (!mensaje && !archivo) return;

  // 🔸 Construir texto que se mostrará en la burbuja del usuario
  let textoUsuario = '';
  if (mensaje) textoUsuario += mensaje;
  if (archivo) {
    textoUsuario += mensaje ? '\n\n' : '';
    textoUsuario += `[Archivo adjunto: ${archivo.name}]`;
  }

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

  mensajeInput.value = '';
  archivoInput.value = ''; // limpia el input real
  archivoSeleccionado = null; // limpia variable de referencia
  document.getElementById('archivoNombre').textContent = ''; // limpia el texto visible

  // Mostrar burbuja "..." mientras responde
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

  // Preparar FormData para enviar al servidor
  const formData = new FormData();
  if (mensaje) formData.append('mensaje', mensaje);
  if (archivo) formData.append('archivo', archivo);
  formData.append('historial', JSON.stringify(historial));

  try {
    if ('speechSynthesis' in window) speechSynthesis.cancel(); // Detener voz si ya está hablando

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
      if ('speechSynthesis' in window) speechSynthesis.cancel();
      hablar(data.respuesta);
    }

    // Guardar historial
    const timestamp = new Date().toISOString();
    historial.push({ role: 'user', text: textoUsuario, timestamp });
    historial.push({ role: 'model', text: data.respuesta || data.error, timestamp: new Date().toISOString() });
    localStorage.setItem('historial', JSON.stringify(historial));

  } catch (err) {
    burbujaBot.querySelector('div').textContent = 'Error al conectar con el servidor';
  }

  chat.scrollTop = chat.scrollHeight;
}

//Guardar historial
async function guardarHistorial() {
  if (!historial.length) return;

  const original = localStorage.getItem('historialOriginal');
  if (original && JSON.stringify(historial) === original) {
    return; // ⛔ No guardar si no hay cambios
  }

  const idActual = localStorage.getItem('historialIdActual');
  const endpoint = idActual ? `/auth/historiales/${idActual}` : '/auth/guardar-historial';
  const method = idActual ? 'PUT' : 'POST';

  try {
    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ historial })
    });

    const data = await res.json();

    if (res.ok && data.id) {
      // Si es una conversación nueva, guarda su ID para futuras actualizaciones
      localStorage.setItem('historialIdActual', data.id);
    }
    localStorage.setItem('historialOriginal', JSON.stringify(historial))
  } catch (err) {
    console.error('❌ Error al guardar historial:', err);
  }
}

// =========================
// ⛔ Cerrar sesión
// =========================
async function cerrarSesion() {
  if ('speechSynthesis' in window) speechSynthesis.cancel(); // Cortar voz al cerrar sesión

  await guardarHistorial(); // ⬅️ Guardar antes de cerrar

  // 🔄 Eliminar historial y preferencias locales
  localStorage.removeItem('historial');
  localStorage.removeItem('historialIdActual');

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
  const nuevoArchivo = e.target.files[0];

  if (nuevoArchivo) {
    archivoSeleccionado = nuevoArchivo;
    document.getElementById('archivoNombre').textContent = `Archivo seleccionado: ${nuevoArchivo.name}`;
  } else {
    // ❌ NO se borra archivoSeleccionado si no se ha elegido nada nuevo
    document.getElementById('archivo').value = ''; // ⚠️ para evitar errores con el mismo archivo
  }
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
async function borrarConversacion() {
  // No preguntar nada, directamente guardar y borrar
  await guardarHistorial();

  // Detener cualquier voz en curso
  if ('speechSynthesis' in window) speechSynthesis.cancel();

  // Borrar historial
  localStorage.removeItem('historial');
  historial = [];
  localStorage.removeItem('historialIdActual');

  // Vaciar visualmente el chat
  document.getElementById('chat').innerHTML = '';
}

document.getElementById('btnNuevaConversacion')?.addEventListener('click', borrarConversacion);
document.getElementById('btnNuevaConversacionMenu')?.addEventListener('click', borrarConversacion);

function irAlPanelAdmin() {
  if ('speechSynthesis' in window) speechSynthesis.cancel(); // ⬅️ Detener voz al ir al admin
  window.location.href = '/admin';
}

async function abrirModalHistoriales(noAbrirModal = false) {
  const lista = document.getElementById('listaHistoriales');
  lista.innerHTML = '<li class="list-group-item text-muted">Cargando...</li>';

  try {
    const res = await fetch('/auth/historiales');
    const historiales = await res.json();

    lista.innerHTML = ''; // limpiar antes de rellenar

    // Mostrar mensaje si no hay historiales
    if (!Array.isArray(historiales) || historiales.length === 0) {
      const li = document.createElement('li');
      li.className = 'list-group-item text-muted text-center';
      li.textContent = 'No hay historiales guardados';
      lista.appendChild(li);
    } else {
      // Mostrar lista de historiales
      historiales.forEach(hist => {
        const fecha = new Date(hist.fecha).toLocaleString();
        const li = document.createElement('li');
        li.className = 'list-group-item';

        const titulo = hist.titulo || `Conversación del ${fecha}`;

        const contenedor = document.createElement('div');
        contenedor.className = 'd-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2';

        const span = document.createElement('span');
        span.textContent = titulo;
        span.style.cursor = 'pointer';
        span.onclick = () => cargarHistorialPorId(hist.id);

        const btnEditar = document.createElement('button');
        btnEditar.className = 'btn btn-sm btn-outline-secondary editar-titulo';
        btnEditar.textContent = 'Editar';
        btnEditar.dataset.id = hist.id;
        btnEditar.dataset.titulo = hist.titulo || '';

        const btnEliminar = document.createElement('button');
        btnEliminar.className = 'btn btn-sm btn-outline-danger';
        btnEliminar.textContent = 'Eliminar';
        btnEliminar.onclick = () => eliminarHistorial(hist.id);

        const btnGroup = document.createElement('div');
        btnGroup.className = 'd-flex gap-2';
        btnGroup.appendChild(btnEditar);
        btnGroup.appendChild(btnEliminar);

        contenedor.appendChild(span);
        contenedor.appendChild(btnGroup);
        li.appendChild(contenedor);
        lista.appendChild(li);
      });
    }

    if (!noAbrirModal) {
      const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalHistoriales'));
      modal.show();
    }

  } catch (err) {
    console.error('❌ Error al cargar historiales:', err);
    lista.innerHTML = '<li class="list-group-item text-danger text-center">Error al cargar historiales</li>';
  }
}

async function cargarHistorialPorId(id) {
  const idActual = localStorage.getItem('historialIdActual');

  // 🟡 Siempre guardar primero la conversación actual
  await guardarHistorial();

  try {
    const res = await fetch(`/auth/historiales/${id}`);
    const data = await res.json();

    if (!Array.isArray(data)) {
      alert('Error: formato de historial inválido');
      return;
    }

    // 🔄 Cargar nuevo historial en memoria y en localStorage
    historial = data;
    localStorage.setItem('historial', JSON.stringify(historial));
    localStorage.setItem('historialOriginal', JSON.stringify(historial));
    localStorage.setItem('historialIdActual', id); // ✅ Actualizar ID incluso si es el mismo

    // 🧹 Vaciar visualmente el chat y mostrar nuevo
    const chat = document.getElementById('chat');
    chat.innerHTML = '';

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

    // 🧩 Cerrar modal si estaba abierto
    const modal = bootstrap.Modal.getInstance(document.getElementById('modalHistoriales'));
    if (modal) modal.hide();

  } catch (err) {
    console.error('❌ Error al cargar historial por ID:', err);
    alert('Error al cargar la conversación seleccionada');
  }
}

async function eliminarHistorial(id) {
  if (!confirm('¿Seguro que quieres eliminar esta conversación?')) return;

  try {
    const res = await fetch(`/auth/historiales/${id}`, { method: 'DELETE' });

    const data = await res.json();
    if (res.ok) {
      await abrirModalHistoriales(true); // Recargar la lista
    } else {
      alert(data.error || 'No se pudo eliminar el historial');
    }
  } catch (err) {
    console.error('❌ Error al eliminar historial:', err);
    alert('Error al eliminar historial');
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}

async function editarTituloHistorial(id, actualTitulo = '') {
  const nuevoTitulo = prompt('Nuevo nombre para esta conversación:', actualTitulo);
  if (nuevoTitulo === null) return; // Cancelado

  try {
    const res = await fetch(`/auth/historiales/${id}/titulo`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: nuevoTitulo })
    });

    const data = await res.json();
    if (res.ok) {
      await abrirModalHistoriales(true); // Recargar lista sin reabrir el modal
    } else {
      alert(data.error || 'No se pudo actualizar el título');
    }
  } catch (err) {
    console.error('❌ Error al editar título:', err);
    alert('Error al actualizar el título');
  }
}

document.addEventListener('click', function (e) {
  if (e.target.classList.contains('editar-titulo')) {
    const id = e.target.dataset.id;
    const titulo = e.target.dataset.titulo || '';
    editarTituloHistorial(id, titulo);
  }
});
