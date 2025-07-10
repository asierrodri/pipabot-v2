// Verificar si el usuario es admin
if (localStorage.getItem('role') !== 'admin') {
  alert('Acceso denegado');
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
          <button class="btn btn-sm btn-danger" onclick="eliminarUsuario(${user.id})">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    alert('Error al cargar usuarios');
  }
}

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
  localStorage.removeItem('username');
  localStorage.removeItem('role');
  fetch('/auth/logout', { method: 'POST' }).then(() => {
    window.location.href = '/login.html';
  });
}

// Iniciar
cargarUsuarios();
