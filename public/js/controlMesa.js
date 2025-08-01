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
                    <div class="d-flex align-items-center gap-2">
                        <input type="range" min="0" max="1" step="0.01" value="0.5" class="form-range mb-1 flex-grow-1"
                            onchange="ajustarFader('${canal}', this.value)" oninput="actualizarValor('${canal}', this.value)">
                        <small id="valor-${canal}" style="min-width: 40px;">0.50</small>
                    </div>

                    <div class="d-grid gap-2">
                        <button class="btn btn-danger" onclick="mutear('${canal}')">Mute</button>
                        <button class="btn btn-success" onclick="desmutear('${canal}')">Unmute</button>
                        <button class="btn btn-secondary" onclick="resetearCanal('${canal}')">Reset</button>
                    </div>
                </div>
            </div>
        `;
        contenedor.appendChild(col);
    }
}

function actualizarValor(canal, valor) {
    const span = document.getElementById(`valor-${canal}`);
    if (span) span.textContent = parseFloat(valor).toFixed(2);
}

function enviarOSC(ruta, valor) {
    fetch('/mesa/osc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruta, valor })
    })
        .then(res => res.json())
        .then(data => {
            console.log('✅ OSC enviado:', data);
            agregarLog(`✅ Enviado a ${ruta} valor ${valor}`);
        })
        .catch(err => {
            console.error('❌ Error OSC:', err);
            agregarLog(`❌ Error al enviar a ${ruta}`);
        });
}

function agregarLog(mensaje) {
    const log = document.getElementById('logComandos');
    const li = document.createElement('li');
    li.className = 'list-group-item';
    li.textContent = mensaje;

    log.prepend(li);
    if (log.children.length > 10) log.removeChild(log.lastChild);
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

function resetearCanal(canal) {
    const valorPorDefecto = 0.5;
    ajustarFader(canal, valorPorDefecto);
    desmutear(canal);
    const slider = document.querySelector(`input[type="range"][onchange*="${canal}"]`);
    if (slider) {
        slider.value = valorPorDefecto;
        actualizarValor(canal, valorPorDefecto);
    }
}

function resetearTodos() {
    for (let i = 1; i <= numCanales; i++) {
        const canal = i.toString().padStart(2, '0');
        resetearCanal(canal);
    }
}

function mutearTodos() {
    for (let i = 1; i <= numCanales; i++) {
        mutear(i.toString().padStart(2, '0'));
    }
}

function desmutearTodos() {
    for (let i = 1; i <= numCanales; i++) {
        desmutear(i.toString().padStart(2, '0'));
    }
}

function enviarComandoManual() {
    const ruta = document.getElementById('rutaOsc').value.trim();
    const valorStr = document.getElementById('valorOsc').value.trim();
    const respuesta = document.getElementById('respuestaOsc');

    if (!ruta || valorStr === '') {
        respuesta.innerHTML = '<span class="text-danger">Debes completar ambos campos.</span>';
        return;
    }

    const valor = isNaN(valorStr) ? valorStr : parseFloat(valorStr);

    fetch('/mesa/osc', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ruta, valor })
    })
        .then(res => res.json())
        .then(data => {
            if (data.ok) {
                respuesta.innerHTML = `<span class="">✅ Comando enviado correctamente a ${ruta}</span>`;
            } else {
                respuesta.innerHTML = `<span class="text-danger">❌ Error: ${data.error || 'No se pudo enviar el comando'}</span>`;
            }
        })
        .catch(err => {
            respuesta.innerHTML = `<span class="text-danger">❌ Error de red</span>`;
        });
}

function enviarComandosMultiples() {
    const textarea = document.getElementById('comandosOsc');
    const respuesta = document.getElementById('respuestaComandosOsc');
    const lineas = textarea.value.trim().split('\n');

    if (lineas.length === 0 || textarea.value.trim() === '') {
        respuesta.innerHTML = '<span class="text-danger">Introduce al menos un comando.</span>';
        return;
    }

    let resultados = [];

    Promise.all(lineas.map(linea => {
        const partes = linea.trim().split(' ');
        const ruta = partes.shift();
        const valorParts = partes;

        if (!ruta || valorParts.length === 0) {
            resultados.push(`❌ [${linea}] → formato inválido`);
            return Promise.resolve();
        }

        // Detectar si es un comando compuesto (más de un valor)
        const valor = valorParts.length > 1
            ? valorParts.map(val => (isNaN(val) ? val : (val.includes('.') ? parseFloat(val) : parseInt(val))))
            : isNaN(valorParts[0])
                ? valorParts[0]
                : (valorParts[0].includes('.') ? parseFloat(valorParts[0]) : parseInt(valorParts[0]));

        return fetch('/mesa/osc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ruta, valor })
        })
            .then(res => res.json())
            .then(data => {
                if (data.ok) {
                    resultados.push(`✅ [${linea}] enviado`);
                } else {
                    resultados.push(`❌ [${linea}] error`);
                }
            })
            .catch(() => {
                resultados.push(`❌ [${linea}] error de red`);
            });
    })).then(() => {
        respuesta.innerHTML = resultados.map(r => `<div>${r}</div>`).join('');
    });
}


crearPanel();
