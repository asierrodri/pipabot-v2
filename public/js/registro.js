document.getElementById('registroForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const username = document.getElementById('nuevoUsuario').value;
    const password = document.getElementById('nuevaPassword').value;
    const respuestaDiv = document.getElementById('registroRespuesta');

    try {
        const token = await grecaptcha.execute('6LdKi5ErAAAAAM6LputYNJNW9Kn7ZJfKFfbaSrt7', { action: 'registro' });

        const res = await fetch('/auth/registro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, token })
        });

        const data = await res.json();
        if (res.ok) {
            respuestaDiv.textContent = 'Registro exitoso. Redirigiendo...';
            respuestaDiv.className = 'text-success mt-3';

            setTimeout(() => {
                window.location.href = '/login.html';
            }, 1500); // redirige después de 1.5 segundos

        } else {
            respuestaDiv.textContent = data.error || 'Error al registrarse';
            respuestaDiv.className = 'text-danger mt-3';
        }
    } catch (err) {
        respuestaDiv.textContent = 'Error de conexión con el servidor';
        respuestaDiv.className = 'text-danger mt-3';
    }
});
