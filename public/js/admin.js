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
          <button class="btn btn-sm btn-warning me-2" onclick="abrirModalEditar(${user.id}, '${user.username}', '${user.role}')">Editar</button>
          <button class="btn btn-sm btn-danger" onclick="eliminarUsuario(${user.id})">Eliminar</button>
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
