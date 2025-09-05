// =========================
// 👤 Mostrar nombre de usuario y rol admin
// =========================
fetch('/auth/usuario')
  .then(res => res.json())
  .then(data => {
    if (data.username) {
      document.getElementById('nombreUsuario').textContent = data.username;

      // Mostrar Control Mesa a cualquier usuario autenticado
      const enlaceControlMesa = document.getElementById('enlaceControlMesa');
      if (enlaceControlMesa) enlaceControlMesa.style.display = 'inline-block';

      const enlaceControlMesaMenu = document.getElementById('enlaceControlMesaMenu');
      if (enlaceControlMesaMenu) enlaceControlMesaMenu.style.display = 'block';

      // Solo admin ve el panel admin
      if (localStorage.getItem('role') === 'admin') {
        document.getElementById('enlaceAdmin').style.display = 'inline-block';
        document.getElementById('enlaceAdminMenu').style.display = 'block';
      }
    }

    if (data.sala_id) {
      document.getElementById('nombreSala').textContent = data.sala_id;
    }

  })
  .catch(err => {
    console.error('Error al obtener el nombre de usuario:', err);
  });

// =========================
// 💬 Historial de mensajes (localStorage)
// =========================
let historial = JSON.parse(localStorage.getItem('historial')) || [];

let historialesCache = [];           // cache general
let historialesCacheModal = [];      // cache modal (opcional)

const normalizar = (s) =>
  (s ?? '').toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // sin tildes

function filtrarHistoriales(lista, termino) {
  const q = normalizar(termino);
  if (!q) return lista;
  return lista.filter(h => {
    const titulo = normalizar(h.titulo || '');
    const fecha = normalizar(new Date(h.fecha).toLocaleString());
    const id = String(h.id);
    return titulo.includes(q) || fecha.includes(q) || id.includes(q);
  });
}


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
  actualizarIconoAltavoz();

  // Inicializar selector de modo OSC
  const selectorModo = document.getElementById('selectorModoOsc');
  if (selectorModo) {
    const role = localStorage.getItem('role') || 'user';

    // Ocultar opción automática si no es admin
    if (role !== 'admin') {
      selectorModo.innerHTML = '<option value="manual">Manual</option>';
      localStorage.setItem('modoOsc', 'manual');
    } else {
      // Admin sí puede elegir
      const modoGuardado = localStorage.getItem('modoOsc') === 'automatico' ? 'automatico' : 'manual';
      localStorage.setItem('modoOsc', modoGuardado);
      selectorModo.value = modoGuardado === 'automatico' ? 'auto' : 'manual';

      selectorModo.addEventListener('change', () => {
        const nuevoModo = selectorModo.value === 'auto' ? 'automatico' : 'manual';
        localStorage.setItem('modoOsc', nuevoModo);
      });
    }
  }

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

  document.getElementById('btnAlternarModoMovil')?.addEventListener('click', () => {
    const modoActual = localStorage.getItem('modo') === 'oscuro' ? 'claro' : 'oscuro';
    alternarModo(modoActual);
  });

  document.getElementById('btnAlternarVozMovil')?.addEventListener('click', alternarVoz);


  if (localStorage.getItem('role') === 'admin') {
    document.getElementById('enlaceAdminMenu').style.display = 'block';
  }

  if (window.innerWidth >= 768) {
    cargarHistorialesEnPanelLateral();
  }

});

async function cargarHistorialesEnPanelLateral() {
  const lista = document.getElementById('listaHistorialesLateral');
  if (!lista) return;

  lista.innerHTML = '<li class="list-group-item text-muted">Cargando...</li>';

  try {
    const res = await fetch('/auth/historiales');
    const historiales = await res.json();
    historialesCache = Array.isArray(historiales) ? historiales : [];

    const input = document.getElementById('buscadorLateral');
    const fil = filtrarHistoriales(historialesCache, input?.value || '');

    lista.innerHTML = '';

    if (!fil.length) {
      lista.innerHTML = '<li class="list-group-item text-muted">Sin conversaciones</li>';
      return;
    }

    fil.forEach(hist => {
      const fecha = new Date(hist.fecha).toLocaleDateString();
      const titulo = hist.titulo || `Conversación del ${fecha}`;

      const li = document.createElement('li');
      li.className = 'list-group-item py-1 px-2';
      li.style.cursor = 'pointer';
      li.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
          <span class="me-2 multi-line-ellipsis" title="${titulo}">${titulo}</span>
          <div class="dropdown">
            <button class="btn btn-sm btn-light border dropdown-toggle p-0 px-1" type="button" data-bs-toggle="dropdown" aria-expanded="false">
              <img src="img/dots.svg" alt="Menú" width="16" height="16">
            </button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li><a class="dropdown-item editar-lateral" data-id="${hist.id}" data-titulo="${escapeHtml(titulo)}">Editar</a></li>
              <li><a class="dropdown-item text-danger" onclick="eliminarHistorialLateral(${hist.id})">Eliminar</a></li>
            </ul>
          </div>
        </div>
      `;

      li.addEventListener('click', e => {
        if (!e.target.closest('.dropdown')) {
          cargarHistorialPorId(hist.id);
        }
      });

      li.querySelector('.dropdown-toggle')?.addEventListener('click', e => {
        e.stopPropagation();
      });

      lista.appendChild(li);
    });

    // listener de búsqueda (solo lo añadimos una vez)
    if (input && !input.dataset.bound) {
      input.addEventListener('input', () => cargarHistorialesEnPanelLateral());
      input.dataset.bound = '1';
    }

  } catch (err) {
    lista.innerHTML = '<li class="list-group-item text-danger">Error al cargar</li>';
  }
}

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
  const btnMovil = document.getElementById('btnAlternarVozMovil');

  if (btnMenu) btnMenu.textContent = activada ? 'Desactivar voz' : 'Activar voz';
  if (btnMovil) btnMovil.textContent = activada ? 'Desactivar voz' : 'Activar voz';
}

function actualizarIconoAltavoz() {
  const activada = localStorage.getItem('vozActivada') === 'true';
  const icono = document.getElementById('iconoAltavoz');
  if (!icono) return;

  icono.src = activada ? 'img/altavoz-on.svg' : 'img/altavoz-off.svg';
  icono.alt = activada ? 'Voz activada' : 'Voz desactivada';
}

// =========================
// 🔘 Alternar voz y guardar preferencia
// =========================
function alternarVoz() {
  const actual = localStorage.getItem('vozActivada') === 'true';
  const nuevo = !actual;
  localStorage.setItem('vozActivada', nuevo.toString());
  actualizarBotonVoz();
  actualizarIconoAltavoz();

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
  archivoInput.value = '';
  archivoSeleccionado = null;
  document.getElementById('archivoNombre').textContent = '';

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
  formData.append('modoOsc', localStorage.getItem('modoOsc') || 'manual'); // ← el back lo validará por rol

  try {
    if ('speechSynthesis' in window) speechSynthesis.cancel();

    const res = await fetch('/preguntar', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    let respuesta = data.respuesta || '';

    // ←— NUEVO: lee el modo actual del cliente
    const modoActual = localStorage.getItem('modoOsc') === 'automatico' ? 'automatico' : 'manual';

    // Limpieza de bloque ```json
    let textoLimpio = respuesta.trim();
    if (textoLimpio.startsWith('```json') || textoLimpio.startsWith('```')) {
      textoLimpio = textoLimpio.replace(/^```(?:json)?/, '').replace(/```$/, '').trim();
    }

    // ←— NUEVO: solo intentamos parsear/ejecutar JSON si el modo es automático
    if (modoActual === 'automatico') {
      try {
        const comandos = JSON.parse(textoLimpio);
        // tras: const comandos = JSON.parse(textoLimpio);
        if (Array.isArray(comandos)) {
          if (comandos.length === 0) {
            const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            burbujaBot.querySelector('div').innerHTML = `
      <div class="small text-muted mb-1">${hora}</div>
      (Automático) No se detectaron comandos para ejecutar.
    `;
            const timestamp = new Date().toISOString();
            historial.push({ role: 'user', text: textoUsuario, timestamp });
            historial.push({ role: 'model', text: '(Automático) No se detectaron comandos para ejecutar.', timestamp });
            localStorage.setItem('historial', JSON.stringify(historial));
            chat.scrollTop = chat.scrollHeight;
            return;
          }
          // ...tu bloque actual que ejecuta comandos y hace return...
        }

        if (Array.isArray(comandos) && comandos.every(c => c.ruta && c.valor !== undefined)) {
          for (const cmd of comandos) {
            await fetch('/mesa/osc', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ruta: cmd.ruta, valor: cmd.valor })
            });
          }

          const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          burbujaBot.querySelector('div').innerHTML = `
            <div class="small text-muted mb-1">${hora}</div>
            Comandos ejecutados correctamente ✅
          `;
          chat.scrollTop = chat.scrollHeight;

          const timestamp = new Date().toISOString();
          historial.push({ role: 'user', text: textoUsuario, timestamp });
          historial.push({ role: 'model', text: 'Comandos ejecutados correctamente ✅', timestamp });
          localStorage.setItem('historial', JSON.stringify(historial));
          return; // ← importante: no seguir mostrando texto
        }
      } catch (e) {
        // No era JSON válido → caerá a mostrar texto plano
      }
    }

    // Modo manual (o no era un JSON válido): muestra texto plano
    const horaBot = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    burbujaBot.querySelector('div').innerHTML = `
      <div class="small text-muted mb-1">${horaBot}</div>
      ${respuesta}
    `;

    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      hablar(respuesta);
    }

    const timestamp = new Date().toISOString();
    historial.push({ role: 'user', text: textoUsuario, timestamp });
    historial.push({ role: 'model', text: respuesta, timestamp });
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
      localStorage.setItem('historialIdActual', data.id);

      if (data.titulo) {
        // Guardar el título localmente si se genera automáticamente
        localStorage.setItem('tituloHistorialActual', data.titulo);
      }
    }

    localStorage.setItem('historialOriginal', JSON.stringify(historial))
  } catch (err) {
    console.error('❌ Error al guardar historial:', err);
  }

  if (window.innerWidth >= 768) {
    cargarHistorialesEnPanelLateral();
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
    document.getElementById('btnAlternarModoMovil').textContent = 'Modo claro';
  } else {
    body.style.backgroundImage = "url('img/backgroundChat.jpg')";
    localStorage.setItem('modo', 'claro');
    document.getElementById('btnAlternarModo').textContent = 'Modo oscuro';
    document.getElementById('btnAlternarModoMovil').textContent = 'Modo oscuro';
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

function irAlControlMesa() {
  if ('speechSynthesis' in window) speechSynthesis.cancel(); // detener voz si está activa
  window.location.href = '/control-mesa.html';
}

async function abrirModalHistoriales(noAbrirModal = false) {
  const lista = document.getElementById('listaHistoriales');
  lista.innerHTML = '<li class="list-group-item text-muted">Cargando...</li>';

  try {
    const res = await fetch('/auth/historiales');
    const historiales = await res.json();
    historialesCacheModal = Array.isArray(historiales) ? historiales : [];

    const input = document.getElementById('buscadorModal');
    const fil = filtrarHistoriales(historialesCacheModal, input?.value || '');

    lista.innerHTML = '';

    if (!fil.length) {
      const li = document.createElement('li');
      li.className = 'list-group-item text-muted text-center';
      li.textContent = 'No hay historiales guardados';
      lista.appendChild(li);
    } else {
      fil.forEach(hist => {
        const fecha = new Date(hist.fecha).toLocaleString();
        const titulo = hist.titulo || `Conversación del ${fecha}`;

        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.style.cursor = 'pointer';

        li.addEventListener('click', e => {
          if (!e.target.closest('.dropdown')) {
            cargarHistorialPorId(hist.id);
          }
        });

        const contenedor = document.createElement('div');
        contenedor.className = 'd-flex justify-content-between align-items-center';

        const span = document.createElement('span');
        span.innerHTML = `
          <strong>${escapeHtml(titulo)}</strong><br>
          <small class="text-muted">${fecha}</small>
        `;

        const dropdown = document.createElement('div');
        dropdown.className = 'dropdown';
        dropdown.innerHTML = `
          <button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Opciones">
            <img src="img/dots.svg" width="18" height="18" alt="Menú">
          </button>
          <ul class="dropdown-menu dropdown-menu-end">
            <li><a class="dropdown-item editar-titulo" data-id="${hist.id}" data-titulo="${escapeHtml(hist.titulo || '')}">Editar</a></li>
            <li><a class="dropdown-item text-danger" onclick="eliminarHistorial(${hist.id})">Eliminar</a></li>
          </ul>
        `;

        contenedor.appendChild(span);
        contenedor.appendChild(dropdown);
        li.appendChild(contenedor);
        lista.appendChild(li);
      });
    }

    if (!noAbrirModal) {
      const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalHistoriales'));
      modal.show();

      // Enfocar y vincular búsqueda cuando se abra
      const input = document.getElementById('buscadorModal');
      if (input && !input.dataset.bound) {
        setTimeout(() => input.focus(), 150);
        input.addEventListener('input', () => abrirModalHistoriales(true));
        input.dataset.bound = '1';
      }
    }

  } catch (err) {
    console.error('❌ Error al cargar historiales:', err);
    lista.innerHTML = '<li class="list-group-item text-danger text-center">Error al cargar historiales</li>';
  }
}

async function cargarHistorialPorId(id) {
  if ('speechSynthesis' in window) speechSynthesis.cancel();

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

    localStorage.setItem('historialIdActual', id);

    document.querySelectorAll('#listaHistorialesLateral .list-group-item').forEach(li => {
      if (li.innerHTML.includes(`data-id="${id}"`)) {
        li.classList.add('activa');
      } else {
        li.classList.remove('activa');
      }
    });


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
  if (nuevoTitulo === null) return;

  try {
    const res = await fetch(`/auth/historiales/${id}/titulo`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: nuevoTitulo })
    });

    const data = await res.json();
    if (res.ok) {
      if (window.innerWidth >= 768) {
        cargarHistorialesEnPanelLateral(); // ✅ recarga lateral
      } else {
        await abrirModalHistoriales(true); // ✅ recarga modal
      }
    } else {
      alert(data.error || 'No se pudo actualizar el título');
    }
  } catch (err) {
    console.error('❌ Error al editar título:', err);
    alert('Error al actualizar el título');
  }
}

async function eliminarHistorialLateral(id) {
  if (!confirm('¿Seguro que quieres eliminar esta conversación?')) return;

  try {
    const res = await fetch(`/auth/historiales/${id}`, { method: 'DELETE' });
    const data = await res.json();

    if (res.ok) {
      // 🧹 Si la conversación eliminada es la activa, limpiar todo
      const idActual = localStorage.getItem('historialIdActual');
      if (idActual === String(id)) {
        localStorage.removeItem('historial');
        localStorage.removeItem('historialIdActual');
        localStorage.removeItem('historialOriginal');
        historial = [];
        document.getElementById('chat').innerHTML = '';
      }

      // Recargar la lista lateral
      if (window.innerWidth >= 768) {
        cargarHistorialesEnPanelLateral();
      }
    } else {
      alert(data.error || 'No se pudo eliminar el historial');
    }
  } catch (err) {
    console.error('❌ Error al eliminar historial:', err);
    alert('Error al eliminar historial');
  }
}


document.addEventListener('click', function (e) {
  if (e.target.classList.contains('editar-titulo') || e.target.classList.contains('editar-lateral')) {
    const id = e.target.dataset.id;
    const titulo = e.target.dataset.titulo || '';
    editarTituloHistorial(id, titulo);
    e.stopPropagation();
  }
});
