// mesaOSC.js
const osc = require('osc');
const db = require('../config/db');

const puertos = new Map();     // salaId -> UDPPort ya abierto
const abriendo = new Map();    // salaId -> Promise<UDPPort> en apertura

// ====== Metering per sala ======
const meters = new Map(); // salaId -> { ts, main: dB, ch: { '01': dB, ... } }
const xremoteTimers = new Map(); // keepalive por sala

function ensureMetersForSala(salaId) {
  if (!meters.has(salaId)) {
    meters.set(salaId, { ts: 0, main: -90, ch: {} });
  }
  return meters.get(salaId);
}

function buildArgs(valor) {
  const args = Array.isArray(valor)
    ? valor.map(v => (typeof v === 'string'
      ? { type: 's', value: v }
      : Number.isInteger(v)
        ? { type: 'i', value: v }
        : { type: 'f', value: v }))
    : [{ type: typeof valor === 'number' ? 'f' : 's', value: valor }];
  return args;
}

async function getPort(salaId) {
  // Ya abierto
  if (puertos.has(salaId)) return puertos.get(salaId);

  // Ya se está abriendo → espera esa misma promesa
  if (abriendo.has(salaId)) return abriendo.get(salaId);

  // Nueva apertura (una sola vez aunque lleguen 20 lecturas a la vez)
  const prom = new Promise((resolve, reject) => {
    db.query(
      'SELECT ip, port FROM mesas WHERE sala_id = ? ORDER BY id DESC LIMIT 1',
      [salaId],
      (err, rows) => {
        if (err || !rows?.[0]) {
          abriendo.delete(salaId);
          return reject(new Error('La sala no tiene mesa configurada'));
        }
        const { ip, port } = rows[0];

        const udpPort = new osc.UDPPort({
          localAddress: '0.0.0.0',
          localPort: 57121,              // si algún día usas varias salas a la vez: 57121 + Number(salaId)
          remoteAddress: ip,
          remotePort: parseInt(port, 10),
          // metadata: true  // opcional; tu código ya soporta ambos formatos
        });

        udpPort.on('ready', () => {
          console.log(`✅ OSC escuchando en 57121 para sala ${salaId}`);
          puertos.set(salaId, udpPort);   // <-- guardar SOLO cuando está listo
          abriendo.delete(salaId);
          resolve(udpPort);
        });

        udpPort.on('error', (e) => {
          console.error('❌ Error OSC:', e);
          abriendo.delete(salaId);
          reject(e);
        });

        udpPort.open();

        // Suscripción a meters (X32 necesita keepalive cada ~9 s)
        if (!xremoteTimers.has(salaId)) {
          const sendXremote = () => {
            try { udpPort.send({ address: '/xremote', args: [] }); } catch { }
          };
          sendXremote();
          const t = setInterval(sendXremote, 5000);
          xremoteTimers.set(salaId, t);
        }

        // Parsear paquetes de meters
        udpPort.on("message", (oscMsg) => {
          if (!oscMsg || typeof oscMsg.address !== 'string') return;

          // X32 suele enviar /meters o /meters/… con un blob/array de floats
          if (oscMsg.address.startsWith('/meters')) {
            const m = ensureMetersForSala(salaId);
            // Heurística mínima: buscar floats en args y mapear primeras posiciones conocidas.
            // Layout exacto depende del “tap”; para piloto tomamos:
            // [0] = Main L, [1] = Main R, [2..] = ch1..ch32 (RMS aprox)
            const floats = [];
            for (const a of (oscMsg.args || [])) {
              const v = (typeof a === 'object' && a.value !== undefined) ? a.value : a;
              if (typeof v === 'number') floats.push(v);
            }
            if (floats.length >= 34) {
              const mainL = floats[0], mainR = floats[1];
              const main = Math.max(mainL, mainR);
              m.main = linearToDb(main); // convertir 0..1 a dB aprox
              m.ch = m.ch || {};
              for (let i = 0; i < 32; i++) {
                const chDb = linearToDb(floats[2 + i]);
                const NN = String(i + 1).padStart(2, '0');
                m.ch[NN] = chDb;
              }
              m.ts = Date.now();
            }
          }
        });

        // helpers de conversión (aprox log)
        function linearToDb(u) {
          if (typeof u !== 'number' || u <= 0) return -90;
          // proxy log sencillo
          const db = 20 * Math.log10(Math.max(1e-6, Math.min(1, u)));
          return Math.max(-90, Math.min(0, db));
        }
      }
    );
  });

  abriendo.set(salaId, prom);
  return prom;
}

// mesaOSC.js
function clamp01(x) { return Math.max(0, Math.min(1, Number(x) || 0)); }
function dbToUnitLinear(db) { // mapeo simple -90..0 → 0..1 (aprox)
  const clamped = Math.max(-90, Math.min(0, Number(db) || -90));
  return (clamped + 90) / 90;
}
function isLikelyDb(v) { return typeof v === 'number' && v <= 0 && v >= -120; }

async function enviarOSCConSala(salaId, ruta, valor) {
  const udpPort = await getPort(salaId);

  // Normaliza faders
  if (typeof ruta === 'string' && ruta.endsWith('/mix/fader')) {
    let unit;
    if (isLikelyDb(valor)) {
      unit = dbToUnitLinear(valor);
    } else {
      unit = clamp01(valor);
    }
    // 0 dB real en X32 ~ 0.75. Clampa para no pasar de 0 dB.
    valor = Math.min(unit, 0.75);
  }

  const args = buildArgs(valor);
  console.log(`🔁 [sala ${salaId}] ${ruta} → ${JSON.stringify(args)}`);
  udpPort.send({ address: ruta, args });
}


async function leerOSCConSala(salaId, ruta) {
  const udpPort = await getPort(salaId);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      udpPort.removeListener('message', onMsg);
      reject(new Error('Timeout leyendo OSC'));
    }, 700);

    function onMsg(oscMsg) {
      if (oscMsg.address === ruta && oscMsg.args?.length) {
        clearTimeout(timeout);
        udpPort.removeListener('message', onMsg);
        const arg = oscMsg.args[0];
        const raw = (arg && (arg.value ?? arg));
        const valor = typeof raw === 'object' ? raw.value : raw;
        resolve(typeof valor === 'string' ? parseFloat(valor) : valor);
      }
    }

    udpPort.on('message', onMsg);
    udpPort.send({ address: ruta, args: [] }); // GET
  });
}

async function leerBatchOSCConSala(salaId, rutas = []) {
  const udpPort = await getPort(salaId);
  if (!Array.isArray(rutas) || rutas.length === 0) return {};

  return new Promise((resolve) => {
    const pendientes = new Set(rutas);
    const resultados = {};

    const to = setTimeout(() => {
      udpPort.removeListener('message', onMsg);
      resolve(resultados);
    }, 200); // timeout total

    function onMsg(oscMsg) {
      const addr = oscMsg?.address;
      if (!addr || !pendientes.has(addr)) return;

      const arg = oscMsg.args?.[0];
      const raw = (arg && (arg.value ?? arg));
      const valor = typeof raw === 'object' ? raw.value : raw;
      resultados[addr] = (typeof valor === 'string') ? parseFloat(valor) : valor;
      pendientes.delete(addr);

      if (pendientes.size === 0) {
        clearTimeout(to);
        udpPort.removeListener('message', onMsg);
        resolve(resultados);
      }
    }

    udpPort.on('message', onMsg);
    // Disparamos todas las lecturas (GET) sin args
    rutas.forEach(r => udpPort.send({ address: r, args: [] }));
  });
}

function getMetersSnapshot(salaId) {
  const m = meters.get(salaId) || { ts: 0, main: -90, ch: {} };
  return m;
}

module.exports = { enviarOSCConSala, leerOSCConSala, leerBatchOSCConSala, getMetersSnapshot };
