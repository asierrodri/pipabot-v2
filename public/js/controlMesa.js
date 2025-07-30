const numCanales = 8; // Puedes ampliarlo según lo que necesites

function crearPanel() {
    const contenedor = document.getElementById('panelCanales');
    for (let i = 1; i <= numCanales; i++) {
        const canal = i.toString().padStart(2, '0');

        const col = document.createElement('div');
        col.className = 'col-12 col-sm-6 col-md-4 col-lg-3 mb-4';
        col.innerHTML = `
      <div class="card shadow-sm">
        <div class="card-body">
          <h5 class="card-title text-center">Canal ${i}</h5>
          <input type="range" min="0" max="1" step="0.01" value="0.5" class="form-range mb-3" 
            onchange="ajustarFader('${canal}', this.value)">
          <div class="d-grid gap-2">
            <button class="btn btn-danger" onclick="mutear('${canal}')">Mute</button>
            <button class="btn btn-success" onclick="desmutear('${canal}')">Unmute</button>
          </div>
        </div>
      </div>
    `;
        contenedor.appendChild(col);
    }
}

function enviarOSC(ruta, valor) {
    fetch('/mesa/osc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruta, valor })
    })
        .then(res => res.json())
        .then(data => console.log('✅ OSC enviado:', data))
        .catch(err => console.error('❌ Error OSC:', err));
}

function ajustarFader(canal, valor) {
    enviarOSC(`/ch/${canal}/mix/fader`, parseFloat(valor));
}

function mutear(canal) {
    enviarOSC(`/ch/${canal}/mix/on`, 0);
}

function desmutear(canal) {
    enviarOSC(`/ch/${canal}/mix/on`, 1);
}

function cerrarSesion() {
    fetch('/auth/logout', { method: 'POST' }).then(() => {
        localStorage.clear();
        window.location.href = '/login.html';
    });
}

crearPanel();
