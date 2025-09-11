// mesaOSC.js
const osc = require('osc');
const db = require('../config/db');

const puertos = new Map();     // salaId -> UDPPort ya abierto
const abriendo = new Map();    // salaId -> Promise<UDPPort> en apertura

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
      }
    );
  });

  abriendo.set(salaId, prom);
  return prom;
}

async function enviarOSCConSala(salaId, ruta, valor) {
  const udpPort = await getPort(salaId);
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

module.exports = { enviarOSCConSala, leerOSCConSala, leerBatchOSCConSala };
