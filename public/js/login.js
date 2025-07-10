document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const responseDiv = document.getElementById('loginResponse');
  responseDiv.textContent = 'Verificando...';

  try {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (res.ok) {
      // Guardar en localStorage
      localStorage.setItem('username', data.username);
      localStorage.setItem('role', data.role);

      window.location.href = '/index.html';
    } else {
      responseDiv.textContent = data.error || 'Error en el inicio de sesión';
    }
  } catch (err) {
    responseDiv.textContent = 'Error de conexión con el servidor';
  }
});
