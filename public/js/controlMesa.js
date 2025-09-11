// ======== Config ========
const NUM_CANALES = 16;   // sube a 32 cuando quieras
const NUM_BUSES = 8;    // sube a 16 si usas todos
const NUM_FXR = 4;    // FX returns visibles (opcional)
const POLLING_MS = 400;  // refresco

// Helpers
const pad2 = n => String(n).padStart(2, '0');

// Rutas por canal seleccionado
function rutasCanal(NN) {
    const rutas = [
        // label
        `/ch/${NN}/config/name`,
        `/ch/${NN}/config/color`,
        // preamp
        `/ch/${NN}/preamp/gain`,
        `/ch/${NN}/preamp/phantom`,
        `/ch/${NN}/preamp/invert`,
        // mix
        `/ch/${NN}/mix/fader`,
        `/ch/${NN}/mix/on`,
        `/ch/${NN}/mix/pan`,
        `/ch/${NN}/mix/solo`,
        // eq on
        `/ch/${NN}/eq/on`,
        // gate
        `/ch/${NN}/gate/on`,
        `/ch/${NN}/gate/thr`,
        `/ch/${NN}/gate/att`,
        `/ch/${NN}/gate/rel`,
        // dyn (comp)
        `/ch/${NN}/dyn/on`,
        `/ch/${NN}/dyn/thr`,
        `/ch/${NN}/dyn/ratio`,
        `/ch/${NN}/dyn/att`,
        `/ch/${NN}/dyn/rel`,
        `/ch/${NN}/dyn/makeup`,
    ];

    // EQ 4 bandas
    for (let b = 1; b <= 4; b++) {
        rutas.push(`/ch/${NN}/eq/${b}/type`);
        rutas.push(`/ch/${NN}/eq/${b}/f`);
        rutas.push(`/ch/${NN}/eq/${b}/g`);
        rutas.push(`/ch/${NN}/eq/${b}/q`);
    }

    // Sends a buses
    for (let bb = 1; bb <= NUM_BUSES; bb++) {
        const BB = pad2(bb);
        rutas.push(`/ch/${NN}/mix/${BB}/level`);
        rutas.push(`/ch/${NN}/mix/${BB}/on`);
    }

    return rutas;
}

// Rutas overview (lista lateral)
function rutasOverview() {
    const rutas = [];
    for (let i = 1; i <= NUM_CANALES; i++) {
        const NN = pad2(i);
        rutas.push(`/ch/${NN}/mix/fader`);
        rutas.push(`/ch/${NN}/mix/on`);
        rutas.push(`/ch/${NN}/config/name`);
        rutas.push(`/ch/${NN}/config/color`);
    }
    return rutas;
}

// Rutas master/buses
function rutasMaster() {
    const rutas = [
        `/main/st/mix/fader`,
        `/main/st/mix/on`,
    ];
    for (let bb = 1; bb <= NUM_BUSES; bb++) {
        const BB = pad2(bb);
        rutas.push(`/bus/${BB}/mix/fader`);
        rutas.push(`/bus/${BB}/mix/on`);
    }
    // opcional FX returns
    for (let r = 1; r <= NUM_FXR; r++) {
        const RR = pad2(r);
        rutas.push(`/fxr/${RR}/mix/fader`);
        rutas.push(`/fxr/${RR}/mix/on`);
    }
    return rutas;
}

/* function crearPanel() {
    const contenedor = document.getElementById('panelCanales');
    contenedor.innerHTML = ''; // por si recargas el panel
    for (let i = 1; i <= numCanales; i++) {
        const canal = i.toString().padStart(2, '0');

        const col = document.createElement('div');
        col.className = 'col-12 col-sm-6 col-md-4 col-lg-3 mb-4';
        col.innerHTML = `
      <div class="card shadow-sm">
        <div class="card-body">
          <h5 class="card-title text-center">Canal ${i}</h5>
          <div class="d-flex align-items-center gap-2">
            <input id="fader-${canal}" data-canal="${canal}"
              type="range" min="0" max="1" step="0.01" value="0.5"
              class="form-range mb-1 flex-grow-1"
              onchange="ajustarFader('${canal}', this.value)"
              oninput="actualizarValor('${canal}', this.value)">
            <small id="valor-${canal}" style="min-width: 40px;">0.50</small>
          </div>

          <div class="d-grid gap-2">
            <button id="mute-${canal}" class="btn btn-danger" onclick="mutear('${canal}')">Mute</button>
            <button id="unmute-${canal}" class="btn btn-success" onclick="desmutear('${canal}')">Unmute</button>
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

async function leerValor(ruta) {
    const res = await fetch(`/mesa/osc?ruta=${encodeURIComponent(ruta)}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Lectura OSC fallida');
    return data.valor;
}

function setUIFader(canal, valor) {
    const slider = document.getElementById(`fader-${canal}`);
    if (slider) {
        slider.value = valor;
        actualizarValor(canal, valor);
    }
}

function setUIMute(canal, onValue) {
    const bMute = document.getElementById(`mute-${canal}`);
    const bUnmute = document.getElementById(`unmute-${canal}`);
    const isOn = parseInt(onValue, 10) === 1; // 1 = unmute, 0 = mute
    // Marcar visualmente
    bUnmute?.classList.toggle('active', isOn);
    bMute?.classList.toggle('active', !isOn);
}

async function cargarEstadoCanal(canal) {
    try {
        const [fader, on] = await Promise.all([
            leerValor(`/ch/${canal}/mix/fader`),
            leerValor(`/ch/${canal}/mix/on`)
        ]);
        if (!Number.isNaN(parseFloat(fader))) setUIFader(canal, fader);
        setUIMute(canal, on);
    } catch (e) {
        console.warn(`No se pudo leer canal ${canal}:`, e.message);
    }
}

async function cargarEstadoInicial() {
    const tareas = [];
    for (let i = 1; i <= numCanales; i++) {
        const canal = i.toString().padStart(2, '0');
        tareas.push(cargarEstadoCanal(canal));
    }
    await Promise.all(tareas);
} 

// 🔁 Refresco periódico (simple). Ajusta el intervalo si lo necesitas.
let refrescoTimer = null;
function iniciarRefresco(ms = 1000) {
    if (refrescoTimer) clearInterval(refrescoTimer);
    refrescoTimer = setInterval(() => {
        for (let i = 1; i <= numCanales; i++) {
            const canal = i.toString().padStart(2, '0');
            // Solo leer valores que cambian en directo
            cargarEstadoCanal(canal);
        }
    }, ms);
}
*/
async function oscLeerBatch(rutas) {
    const res = await fetch('/mesa/osc/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rutas })
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Batch read fail');
    return data.data || {};
}

async function oscEnviar(ruta, valor) {
    await fetch('/mesa/osc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruta, valor })
    });
}

// ======= UI build =======
function buildListaCanales() {
    const ul = document.getElementById('listaCanales');
    ul.innerHTML = '';
    for (let i = 1; i <= NUM_CANALES; i++) {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.dataset.canal = pad2(i);
        li.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        <span class="canal-color-dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#888"></span>
        <strong>Ch ${i}</strong>
        <span class="small text-muted canal-name">—</span>
      </div>
      <div class="d-flex align-items-center gap-2">
        <span class="badge bg-secondary fader-badge">0.00</span>
        <span class="badge estado-mute badge-pill">—</span>
      </div>
    `;
        li.addEventListener('click', () => seleccionarCanal(pad2(i)));
        ul.appendChild(li);
    }
}

function buildSelectorCanal() {
    const sel = document.getElementById('selectorCanal');
    sel.innerHTML = '';
    for (let i = 1; i <= NUM_CANALES; i++) {
        const opt = document.createElement('option');
        opt.value = pad2(i);
        opt.textContent = `Canal ${i}`;
        sel.appendChild(opt);
    }
    sel.addEventListener('change', e => seleccionarCanal(e.target.value));
}

function buildSendsGrid() {
    const grid = document.getElementById('sends-grid');
    grid.innerHTML = '';
    for (let b = 1; b <= NUM_BUSES; b++) {
        const BB = pad2(b);
        const col = document.createElement('div');
        col.className = 'col-6 col-md-3';
        col.innerHTML = `
      <div class="border rounded p-2">
        <div class="d-flex justify-content-between align-items-center">
          <strong>B${b}</strong>
          <div class="form-check form-switch m-0">
            <input class="form-check-input send-on" data-bus="${BB}" type="checkbox">
          </div>
        </div>
        <input class="form-range send-level mt-1" data-bus="${BB}" type="range" min="0" max="1" step="0.01">
      </div>
    `;
        grid.appendChild(col);
    }
}

function buildEQ() {
    const wrap = document.getElementById('eq-bandas');
    wrap.innerHTML = '';
    for (let b = 1; b <= 4; b++) {
        const col = document.createElement('div');
        col.className = 'col-12 col-md-6 col-xl-3';
        col.innerHTML = `
      <div class="border rounded p-2">
        <div class="d-flex justify-content-between align-items-center">
          <strong>B${b}</strong>
          <select class="form-select form-select-sm eq-type" data-band="${b}">
            <option value="0">Peak</option>
            <option value="1">LShelf</option>
            <option value="2">HShelf</option>
            <option value="3">LPF</option>
            <option value="4">HPF</option>
          </select>
        </div>
        <label class="form-label small mb-0">Freq</label>
        <input class="form-range eq-f" data-band="${b}" type="range" min="20" max="20000" step="1">
        <label class="form-label small mb-0">Gain</label>
        <input class="form-range eq-g" data-band="${b}" type="range" min="-15" max="15" step="0.5">
        <label class="form-label small mb-0">Q</label>
        <input class="form-range eq-q" data-band="${b}" type="range" min="0.3" max="10" step="0.1">
      </div>
    `;
        wrap.appendChild(col);
    }
}

function buildBusesRight() {
    const cont = document.getElementById('buses-list');
    cont.innerHTML = '';
    for (let b = 1; b <= NUM_BUSES; b++) {
        const BB = pad2(b);
        const col = document.createElement('div');
        col.className = 'col-6';
        col.innerHTML = `
      <div class="border rounded p-2">
        <div class="d-flex justify-content-between">
          <strong>Bus ${b}</strong>
          <div class="form-check form-switch m-0">
            <input class="form-check-input bus-mute" data-bus="${BB}" type="checkbox" title="Mute">
          </div>
        </div>
        <input class="form-range bus-fader mt-1" data-bus="${BB}" type="range" min="0" max="1" step="0.01">
      </div>
    `;
        cont.appendChild(col);
    }
}

let canalActivo = '01';
let timerOverview = null;
let timerCanal = null;
let timerMaster = null;

function iniciarPanel() {
    buildListaCanales();
    buildSelectorCanal();
    buildSendsGrid();
    buildEQ();
    buildBusesRight();

    seleccionarCanal('01'); // por defecto
    // polling
    if (timerOverview) clearInterval(timerOverview);
    timerOverview = setInterval(actualizarOverview, POLLING_MS);

    if (timerMaster) clearInterval(timerMaster);
    timerMaster = setInterval(actualizarMaster, POLLING_MS);

    // listeners de envío (canal)
    wireInputsCanal();
    wireInputsMaster();
}

function seleccionarCanal(NN) {
    canalActivo = NN;
    document.getElementById('selectorCanal').value = NN;
    document.getElementById('cabeceraCanal').textContent = `Canal ${parseInt(NN, 10)}`;

    actualizarCanal(); // primera carga
    if (timerCanal) clearInterval(timerCanal);
    timerCanal = setInterval(actualizarCanal, POLLING_MS);
}

async function actualizarOverview() {
    try {
        const data = await oscLeerBatch(rutasOverview());
        // pintar cada li
        document.querySelectorAll('#listaCanales .list-group-item').forEach(li => {
            const NN = li.dataset.canal;
            const fader = data[`/ch/${NN}/mix/fader`];
            const on = data[`/ch/${NN}/mix/on`];
            const name = data[`/ch/${NN}/config/name`];
            const color = data[`/ch/${NN}/config/color`];

            li.querySelector('.fader-badge').textContent = (typeof fader === 'number' ? fader.toFixed(2) : '--');
            const badge = li.querySelector('.estado-mute');
            const isOn = parseInt(on, 10) === 1;
            badge.textContent = isOn ? 'ON' : 'MUTE';
            badge.className = `estado-mute badge ${isOn ? 'bg-success' : 'bg-danger'}`;

            if (name !== undefined && !Number.isNaN(name)) {
                li.querySelector('.canal-name').textContent = String(name);
            }
            if (color !== undefined) {
                // puedes mapear colores de mesa → CSS; por ahora un gris fijo
                li.querySelector('.canal-color-dot').style.background = '#888';
            }
        });
    } catch (e) {
        // silencioso para no molestar
    }
}

async function actualizarCanal() {
    const NN = canalActivo;
    try {
        const data = await oscLeerBatch(rutasCanal(NN));
        // Preamp
        setRange('#preamp-gain', data[`/ch/${NN}/preamp/gain`], v => v);
        setSwitch('#preamp-phantom', data[`/ch/${NN}/preamp/phantom`]);
        setSwitch('#preamp-invert', data[`/ch/${NN}/preamp/invert`]);

        // Mix
        setRange('#mix-fader', data[`/ch/${NN}/mix/fader`]);
        setSwitch('#mix-mute', (parseInt(data[`/ch/${NN}/mix/on`], 10) === 0) ? 1 : 0, true); // switch "mute": checked=true cuando on=0
        setSwitch('#mix-solo', data[`/ch/${NN}/mix/solo`]);
        setRange('#mix-pan', data[`/ch/${NN}/mix/pan`]);

        // EQ general
        setSwitch('#eq-on', data[`/ch/${NN}/eq/on`]);
        for (let b = 1; b <= 4; b++) {
            setSelect(`.eq-type[data-band="${b}"]`, data[`/ch/${NN}/eq/${b}/type`]);
            setRange(`.eq-f[data-band="${b}"]`, data[`/ch/${NN}/eq/${b}/f`]);
            setRange(`.eq-g[data-band="${b}"]`, data[`/ch/${NN}/eq/${b}/g`]);
            setRange(`.eq-q[data-band="${b}"]`, data[`/ch/${NN}/eq/${b}/q`]);
        }

        // Gate / Dyn
        setSwitch('#gate-on', data[`/ch/${NN}/gate/on`]);
        setRange('#gate-thr', data[`/ch/${NN}/gate/thr`]);
        setRange('#gate-att', data[`/ch/${NN}/gate/att`]);
        setRange('#gate-rel', data[`/ch/${NN}/gate/rel`]);

        setSwitch('#dyn-on', data[`/ch/${NN}/dyn/on`]);
        setRange('#dyn-thr', data[`/ch/${NN}/dyn/thr`]);
        setRange('#dyn-ratio', data[`/ch/${NN}/dyn/ratio`]);
        setRange('#dyn-att', data[`/ch/${NN}/dyn/att`]);
        setRange('#dyn-rel', data[`/ch/${NN}/dyn/rel`]);
        setRange('#dyn-makeup', data[`/ch/${NN}/dyn/makeup`]);

        // Sends
        for (let bb = 1; bb <= NUM_BUSES; bb++) {
            const BB = pad2(bb);
            setRange(`.send-level[data-bus="${BB}"]`, data[`/ch/${NN}/mix/${BB}/level`]);
            setSwitch(`.send-on[data-bus="${BB}"]`, data[`/ch/${NN}/mix/${BB}/on`]);
        }
    } catch (e) {
        // silencioso
    }
}

async function actualizarMaster() {
    try {
        const data = await oscLeerBatch(rutasMaster());
        setRange('#main-fader', data['/main/st/mix/fader']);
        setSwitch('#main-mute', (parseInt(data['/main/st/mix/on'], 10) === 0) ? 1 : 0, true);

        for (let bb = 1; bb <= NUM_BUSES; bb++) {
            const BB = pad2(bb);
            setRange(`.bus-fader[data-bus="${BB}"]`, data[`/bus/${BB}/mix/fader`]);
            setSwitch(`.bus-mute[data-bus="${BB}"]`, (parseInt(data[`/bus/${BB}/mix/on`], 10) === 0) ? 1 : 0, true);
        }
    } catch (e) { }
}

// Helpers de pintado
function setRange(sel, val, mapFn = v => v) {
    const el = document.querySelector(sel);
    if (!el) return;
    if (typeof val === 'number') el.value = mapFn(val);
}

function setSwitch(sel, val, isMuteSwitch = false) {
    const el = document.querySelector(sel);
    if (!el) return;
    // si es “mute-switch”: checked=true cuando on=0
    if (isMuteSwitch) {
        el.checked = parseInt(val, 10) === 1; // val=1 → mute (porque arriba le pasamos 1 cuando on=0)
    } else {
        el.checked = parseInt(val, 10) === 1;
    }
}

function setSelect(sel, val) {
    const el = document.querySelector(sel);
    if (!el) return;
    if (val !== undefined && !Number.isNaN(val)) el.value = String(parseInt(val, 10));
}

function wireInputsCanal() {
    // Preamp
    document.getElementById('preamp-gain')?.addEventListener('change', e => {
        oscEnviar(`/ch/${canalActivo}/preamp/gain`, parseFloat(e.target.value));
    });
    document.getElementById('preamp-phantom')?.addEventListener('change', e => {
        oscEnviar(`/ch/${canalActivo}/preamp/phantom`, e.target.checked ? 1 : 0);
    });
    document.getElementById('preamp-invert')?.addEventListener('change', e => {
        oscEnviar(`/ch/${canalActivo}/preamp/invert`, e.target.checked ? 1 : 0);
    });

    // Mix
    document.getElementById('mix-fader')?.addEventListener('input', e => {
        oscEnviar(`/ch/${canalActivo}/mix/fader`, parseFloat(e.target.value));
    });
    document.getElementById('mix-mute')?.addEventListener('change', e => {
        // switch mute: checked=true ⇒ queremos on=0
        const on = e.target.checked ? 0 : 1;
        oscEnviar(`/ch/${canalActivo}/mix/on`, on);
    });
    document.getElementById('mix-solo')?.addEventListener('change', e => {
        oscEnviar(`/ch/${canalActivo}/mix/solo`, e.target.checked ? 1 : 0);
    });
    document.getElementById('mix-pan')?.addEventListener('input', e => {
        oscEnviar(`/ch/${canalActivo}/mix/pan`, parseFloat(e.target.value));
    });

    // EQ
    document.getElementById('eq-on')?.addEventListener('change', e => {
        oscEnviar(`/ch/${canalActivo}/eq/on`, e.target.checked ? 1 : 0);
    });
    document.querySelectorAll('.eq-type').forEach(el => {
        el.addEventListener('change', e => {
            const band = e.target.dataset.band;
            oscEnviar(`/ch/${canalActivo}/eq/${band}/type`, parseInt(e.target.value, 10));
        });
    });
    document.querySelectorAll('.eq-f').forEach(el => {
        el.addEventListener('input', e => {
            const band = e.target.dataset.band;
            oscEnviar(`/ch/${canalActivo}/eq/${band}/f`, parseFloat(e.target.value));
        });
    });
    document.querySelectorAll('.eq-g').forEach(el => {
        el.addEventListener('input', e => {
            const band = e.target.dataset.band;
            oscEnviar(`/ch/${canalActivo}/eq/${band}/g`, parseFloat(e.target.value));
        });
    });
    document.querySelectorAll('.eq-q').forEach(el => {
        el.addEventListener('input', e => {
            const band = e.target.dataset.band;
            oscEnviar(`/ch/${canalActivo}/eq/${band}/q`, parseFloat(e.target.value));
        });
    });

    // Sends
    document.querySelectorAll('.send-level').forEach(el => {
        el.addEventListener('input', e => {
            const BB = e.target.dataset.bus;
            oscEnviar(`/ch/${canalActivo}/mix/${BB}/level`, parseFloat(e.target.value));
        });
    });
    document.querySelectorAll('.send-on').forEach(el => {
        el.addEventListener('change', e => {
            const BB = e.target.dataset.bus;
            oscEnviar(`/ch/${canalActivo}/mix/${BB}/on`, e.target.checked ? 1 : 0);
        });
    });
}

function wireInputsMaster() {
    document.getElementById('main-fader')?.addEventListener('input', e => {
        oscEnviar(`/main/st/mix/fader`, parseFloat(e.target.value));
    });
    document.getElementById('main-mute')?.addEventListener('change', e => {
        const on = e.target.checked ? 0 : 1;
        oscEnviar(`/main/st/mix/on`, on);
    });

    document.querySelectorAll('.bus-fader').forEach(el => {
        el.addEventListener('input', e => {
            const BB = e.target.dataset.bus;
            oscEnviar(`/bus/${BB}/mix/fader`, parseFloat(e.target.value));
        });
    });
    document.querySelectorAll('.bus-mute').forEach(el => {
        el.addEventListener('change', e => {
            const BB = e.target.dataset.bus;
            const on = e.target.checked ? 0 : 1;
            oscEnviar(`/bus/${BB}/mix/on`, on);
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
  iniciarPanel();
  actualizarOverview();
  actualizarMaster();
});
