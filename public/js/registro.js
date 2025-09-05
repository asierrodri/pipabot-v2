// registro.js
const SITE_KEY = '6LdKi5ErAAAAAM6LputYNJNW9Kn7ZJfKFfbaSrt7';

const selectSala = document.getElementById('selectSala');
const bloqueJoin = document.getElementById('bloqueJoin');
const bloqueCreate = document.getElementById('bloqueCreate');
const modoJoin = document.getElementById('modoJoin');
const modoCreate = document.getElementById('modoCreate');
const respuestaDiv = document.getElementById('registroRespuesta');

// Toggle UI por modo
function actualizarModo() {
    if (modoJoin.checked) {
        bloqueJoin.style.display = '';
        bloqueCreate.style.display = 'none';
        // Hacer requeridos solo los campos del bloque activo
        selectSala.required = true;
        document.getElementById('nuevaSalaNombre').required = false;
        document.getElementById('nuevaSalaSlug').required = false;
    } else {
        bloqueJoin.style.display = 'none';
        bloqueCreate.style.display = '';
        selectSala.required = false;
        document.getElementById('nuevaSalaNombre').required = true;
        document.getElementById('nuevaSalaSlug').required = true;
    }
}

modoJoin.addEventListener('change', actualizarModo);
modoCreate.addEventListener('change', actualizarModo);
actualizarModo();

// Cargar listado de salas
async function cargarSalas() {
    try {
        const res = await fetch('/auth/salas');
        const salas = await res.json();
        selectSala.innerHTML = '<option value="" disabled selected>Selecciona una sala…</option>';
        salas.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.slug;
            opt.textContent = s.nombre;
            selectSala.appendChild(opt);
        });
    } catch (err) {
        console.error('Error al cargar salas', err);
    }
}
cargarSalas();

// Submit
document.getElementById('registroForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    respuestaDiv.textContent = '';
    respuestaDiv.className = 'mt-3 text-center';

    const username = document.getElementById('nuevoUsuario').value.trim();
    const password = document.getElementById('nuevaPassword').value.trim();

    if (!username || !password) {
        respuestaDiv.textContent = 'Completa usuario y contraseña';
        respuestaDiv.classList.add('text-danger');
        return;
    }

    const modo = modoJoin.checked ? 'join' : 'create';

    const payload = { username, password, modo };

    if (modo === 'join') {
        const salaSlug = selectSala.value;
        if (!salaSlug) {
            respuestaDiv.textContent = 'Selecciona una sala';
            respuestaDiv.classList.add('text-danger');
            return;
        }
        payload.salaSlug = salaSlug;
    } else {
        const nombre = document.getElementById('nuevaSalaNombre').value.trim();
        const slug = document.getElementById('nuevaSalaSlug').value.trim();
        const mesaIp = document.getElementById('nuevaMesaIp').value.trim();
        const mesaPort = document.getElementById('nuevaMesaPort').value.trim();

        if (!nombre || !slug) {
            respuestaDiv.textContent = 'Completa nombre y slug de la sala';
            respuestaDiv.classList.add('text-danger');
            return;
        }

        payload.salaNueva = {
            nombre,
            slug,
            ...(mesaIp ? { mesaIp } : {}),
            ...(mesaPort ? { mesaPort: parseInt(mesaPort, 10) } : {})
        };
    }

    try {
        const token = await grecaptcha.execute(SITE_KEY, { action: 'registro' });
        payload.token = token;

        const res = await fetch('/auth/registro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok) {
            respuestaDiv.textContent = 'Registro exitoso. Redirigiendo...';
            respuestaDiv.classList.add('text-success');
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 1200);
        } else {
            respuestaDiv.textContent = data.error || 'Error al registrarse';
            respuestaDiv.classList.add('text-danger');
        }
    } catch (err) {
        respuestaDiv.textContent = 'Error de conexión con el servidor';
        respuestaDiv.classList.add('text-danger');
    }
});
