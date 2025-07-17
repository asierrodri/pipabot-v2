const seccionesPrompt = ['modo', 'espacio', 'material', 'normas'];

async function cargarSeccionesPrompt() {
  try {
    const res = await fetch('/admin/prompt/secciones');
    const data = await res.json();

    const editor = document.getElementById('editorPromptSecciones');
    editor.innerHTML = '';

    seccionesPrompt.forEach(seccion => {
      const actual = data.find(p => p.seccion === seccion && p.es_actual);

      editor.innerHTML += `
        <div class="col-md-6 mb-4">
          <h6 class="text-capitalize">${seccion}</h6>
          <textarea class="form-control" rows="10" id="textarea-${seccion}" placeholder="Contenido de ${seccion}...">${actual?.contenido || ''}</textarea>
          <div class="d-flex mt-2 gap-2">
            <button class="btn btn-sm btn-primary" onclick="guardarSeccionPrompt('${seccion}')">Guardar nueva versión</button>
            <button class="btn btn-sm btn-secondary" onclick="verHistorialSeccion('${seccion}')">Ver historial</button>
          </div>
        </div>
      `;
    });
  } catch (err) {
    console.error('Error al cargar prompt base:', err);
  }
}

async function guardarSeccionPrompt(seccion) {
  const contenido = document.getElementById(`textarea-${seccion}`).value.trim();
  if (!contenido) return alert(`El contenido de ${seccion} no puede estar vacío`);

  const res = await fetch('/admin/prompt/secciones', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seccion, contenido })
  });

  const data = await res.json();
  if (res.ok) {
    alert(`Sección "${seccion}" actualizada`);
    cargarSeccionesPrompt();
  } else {
    alert(data.error || 'Error al guardar');
  }
}

function verHistorialSeccion(seccion) {
  fetch('/admin/prompt/secciones')
    .then(res => res.json())
    .then(data => {
      const historial = data.filter(p => p.seccion === seccion).sort((a, b) => b.version - a.version);
      const container = document.getElementById('historialPromptContainer');
      const lista = document.getElementById('listaHistorialPrompt');

      lista.innerHTML = `<h6>Historial de <strong>${seccion}</strong></h6>`;

      historial.forEach(p => {
        const item = document.createElement('div');
        item.className = 'list-group-item';

        item.innerHTML = `
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <strong>Versión ${p.version}</strong> – ${new Date(p.fecha).toLocaleString()}
              ${p.es_actual ? '<span class="badge bg-success ms-2">Actual</span>' : ''}
              <pre class="mt-2 small bg-light p-2 border">${p.contenido.slice(0, 300)}${p.contenido.length > 300 ? '...' : ''}</pre>
            </div>
            <div>
              <button class="btn btn-sm btn-outline-primary" onclick="restaurarVersionPrompt(${p.id})">Restaurar</button>
            </div>
          </div>
        `;
        lista.appendChild(item);
      });

      container.style.display = 'block';
    });
}

async function restaurarVersionPrompt(id) {
  if (!confirm('¿Restaurar esta versión como actual?')) return;

  const res = await fetch(`/admin/prompt/secciones/${id}/restaurar`, { method: 'PUT' });
  const data = await res.json();

  if (res.ok) {
    alert('Versión restaurada');
    cargarSeccionesPrompt();
  } else {
    alert(data.error || 'Error al restaurar');
  }
}

// Cargar automáticamente al iniciar admin
cargarSeccionesPrompt();
