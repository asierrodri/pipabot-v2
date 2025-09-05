const osc = require('osc');
const db = require('../config/db');

// Cache de puertos por sala
const puertos = new Map(); // salaId -> UDPPort

function buildArgs(valor) {
  const args = Array.isArray(valor)
    ? valor.map(v => {
      if (typeof v === 'string') return { type: 's', value: v };
      if (Number.isInteger(v)) return { type: 'i', value: v };
      if (typeof v === 'number') return { type: 'f', value: v };
      return { type: 's', value: String(v) };
    })
    : [{ type: typeof valor === 'number' ? 'f' : 's', value: valor }];
  return args;
}

async function getPort(salaId) {
  if (puertos.has(salaId)) return puertos.get(salaId);

  const mesa = await new Promise((resolve, reject) => {
    db.query('SELECT ip, port FROM mesas WHERE sala_id = ? ORDER BY id DESC LIMIT 1',
      [salaId],
      (err, rows) => err ? reject(err) : resolve(rows?.[0]));
  });
  if (!mesa) throw new Error('La sala no tiene mesa configurada');

  const udpPort = new osc.UDPPort({
    localAddress: '0.0.0.0',
    localPort: 57121,
    remoteAddress: mesa.ip,
    remotePort: parseInt(mesa.port)
  });
  udpPort.open();
  puertos.set(salaId, udpPort);
  return udpPort;
}

async function enviarOSCConSala(salaId, ruta, valor) {
  const udpPort = await getPort(salaId);
  const args = buildArgs(valor);
  console.log(`🔁 [sala ${salaId}] ${ruta} → ${JSON.stringify(args)}`);
  udpPort.send({ address: ruta, args });
}

module.exports = { enviarOSCConSala };
