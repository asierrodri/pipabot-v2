// Verificar si el usuario es admin
if (localStorage.getItem('role') !== 'admin') {
  window.location.href = '/index.html';
}

// Cargar y mostrar usuarios
async function cargarUsuarios() {
  try {
    const res = await fetch('/admin/usuarios');
    const usuarios = await res.json();
    const tbody = document.getElementById('tablaUsuarios');

    tbody.innerHTML = '';

    usuarios.forEach(user => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
      <td>${user.id}</td>
      <td>${user.username}</td>
      <td>${user.role}</td>
      <td>
        <div class="dropdown">
          <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
        Opciones
          </button>
          <ul class="dropdown-menu">
            <li><button class="dropdown-item" onclick="verConversacionesUsuario('${user.username}')">Ver conversaciones</button></li>
            <li><button class="dropdown-item" onclick="abrirModalEditar(${user.id}, '${user.username}', '${user.role}')">Editar</button></li>
            <li><button class="dropdown-item text-danger" onclick="eliminarUsuario(${user.id})">Eliminar</button></li>
          </ul>
        </div>
      </td>
      `;

      tbody.appendChild(tr);
    });
  } catch (err) {
    alert('Error al cargar usuarios');
  }
}

//Eliminar usuarios
async function eliminarUsuario(id) {
  if (!confirm('¿Estás seguro de eliminar este usuario?')) return;

  try {
    const res = await fetch(`/admin/usuarios/${id}`, { method: 'DELETE' });
    const data = await res.json();
    alert(data.message);
    cargarUsuarios();
  } catch (err) {
    alert('Error al eliminar usuario');
  }
}

// Cerrar sesión
function cerrarSesion() {
  localStorage.removeItem('historial');
  localStorage.removeItem('username');
  localStorage.removeItem('role');
  fetch('/auth/logout', { method: 'POST' }).then(() => {
    window.location.href = '/login.html';
  });
}

// Iniciar y crear usuarios
cargarUsuarios();

document.getElementById('formCrearUsuario').addEventListener('submit', async function (e) {
  e.preventDefault();

  const username = document.getElementById('nuevoUsuario').value.trim();
  const password = document.getElementById('nuevaPassword').value.trim();
  const role = document.getElementById('nuevoRol').value;

  if (!username || !password || !role) {
    alert('Por favor completa todos los campos');
    return;
  }

  try {
    const res = await fetch('/admin/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role })
    });

    const data = await res.json();
    if (res.ok) {
      document.getElementById('mensajeUsuario').textContent = data.message;
      document.getElementById('formCrearUsuario').reset();
      cargarUsuarios();
      // Cerrar modal si se creó correctamente
      const modal = bootstrap.Modal.getInstance(document.getElementById('modalCrearUsuario'));
      modal.hide();
    } else {
      document.getElementById('mensajeUsuario').textContent = '';
      alert(data.error === 'Ese usuario ya existe' ? 'El nombre de usuario ya está en uso.' : (data.error || 'Error al crear usuario'));
    }

  } catch (err) {
    alert('Error al conectar con el servidor');
  }
});

//Modal para editar usuarios
function abrirModalEditar(id, username, role) {
  document.getElementById('editUserId').value = id;
  document.getElementById('editUsername').value = username;
  document.getElementById('editPassword').value = ''; // Vacío por defecto
  document.getElementById('editRole').value = role;

  const modal = new bootstrap.Modal(document.getElementById('modalEditarUsuario'));
  modal.show();
}

document.getElementById('formEditarUsuario').addEventListener('submit', async function (e) {
  e.preventDefault();

  const id = document.getElementById('editUserId').value;
  const username = document.getElementById('editUsername').value.trim();
  const password = document.getElementById('editPassword').value.trim();
  const role = document.getElementById('editRole').value;

  if (!username || !role) {
    alert('Faltan datos');
    return;
  }

  try {
    const res = await fetch(`/admin/usuarios/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role })
    });

    const data = await res.json();
    if (res.ok) {
      const modal = bootstrap.Modal.getInstance(document.getElementById('modalEditarUsuario'));
      modal.hide();
      cargarUsuarios();
    } else {
      alert(data.error === 'Ese usuario ya existe' ? 'El nombre de usuario ya está en uso.' : (data.error || 'Error al editar usuario'));
    }
  } catch (err) {
    alert('Error al conectar con el servidor');
  }
});

async function verConversacionesUsuario(username) {
  document.getElementById('nombreHistorialAdmin').textContent = username;
  const lista = document.getElementById('listaHistorialesUsuario');
  lista.innerHTML = '<li class="list-group-item text-muted">Cargando...</li>';

  try {
    const res = await fetch(`/auth/historiales/usuario/${username}`);
    const historiales = await res.json();

    if (!Array.isArray(historiales) || historiales.length === 0) {
      lista.innerHTML = '<li class="list-group-item text-muted">No hay historiales guardados</li>';
    } else {
      lista.innerHTML = '';
      historiales.forEach(hist => {
        const fecha = new Date(hist.fecha).toLocaleString();
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <span style="cursor: pointer;" onclick="cargarHistorialAdmin(${hist.id})">
          ${hist.titulo ? escapeHtml(hist.titulo) : `Conversación del ${fecha}`}
        </span>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-secondary editar-titulo-admin" 
            data-id="${hist.id}" 
            data-titulo="${hist.titulo ? escapeHtml(hist.titulo) : ''}">
            Editar
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="eliminarHistorialAdmin(${hist.id}, '${username}')">
            Eliminar
          </button>
        </div>
      </div>
    `;
        lista.appendChild(li);
      });
    }

    // Mostrar siempre el modal
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalHistorialesAdmin'));
    modal.show();

  } catch (err) {
    console.error('❌ Error al obtener historiales:', err);
    lista.innerHTML = '<li class="list-group-item text-danger">Error al cargar historiales</li>';
  }
}

async function cargarHistorialAdmin(id) {
  try {
    const res = await fetch(`/auth/historiales/${id}`);
    const data = await res.json();

    if (!Array.isArray(data)) {
      alert('Error: formato de historial inválido');
      return;
    }

    const chat = document.getElementById('chatVisualizador');
    chat.innerHTML = '';

    for (const msg of data) {
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

    const modal = bootstrap.Modal.getInstance(document.getElementById('modalHistorialesAdmin'));
    modal.hide();

  } catch (err) {
    console.error('❌ Error al cargar historial por ID:', err);
    alert('Error al cargar la conversación seleccionada');
  }
}

// función para evitar problemas con caracteres especiales en los títulos
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

async function eliminarHistorialAdmin(id, username) {
  if (!confirm('¿Seguro que quieres eliminar esta conversación?')) return;

  try {
    const res = await fetch(`/auth/historiales/${id}`, { method: 'DELETE' });
    const data = await res.json();

    if (res.ok) {
      await verConversacionesUsuario(username); // recarga
    } else {
      alert(data.error || 'No se pudo eliminar el historial');
    }
  } catch (err) {
    console.error('❌ Error al eliminar historial (admin):', err);
    alert('Error al eliminar historial');
  }
}

document.addEventListener('click', function (e) {
  if (e.target.classList.contains('editar-titulo-admin')) {
    const id = e.target.dataset.id;
    const tituloActual = e.target.dataset.titulo || '';
    const nuevoTitulo = prompt('Nuevo título:', tituloActual);

    if (nuevoTitulo !== null) {
      fetch(`/auth/historiales/${id}/titulo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: nuevoTitulo })
      })
        .then(res => res.json())
        .then(data => {
          if (data.message) {
            const username = document.getElementById('nombreHistorialAdmin').textContent;
            verConversacionesUsuario(username);
          } else {
            alert(data.error || 'No se pudo editar el título');
          }
        })
        .catch(err => {
          console.error('❌ Error al editar título:', err);
          alert('Error al editar título');
        });
    }
  }
});
