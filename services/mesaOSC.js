const osc = require('osc');

const udpPort = new osc.UDPPort({
  localAddress: '0.0.0.0',
  localPort: 57121,
  remoteAddress: process.env.MESA_IP || '192.168.1.100',
  remotePort: parseInt(process.env.MESA_PORT || '10023')
});

udpPort.open();

function enviarOSC(ruta, valor) {
  const args = Array.isArray(valor)
    ? valor.map(v => {
      if (typeof v === 'string') return { type: 's', value: v };
      if (Number.isInteger(v)) return { type: 'i', value: v };
      if (typeof v === 'number') return { type: 'f', value: v };
      return { type: 's', value: String(v) };
    })
    : [{ type: typeof valor === 'number' ? 'f' : 's', value: valor }];

  udpPort.send({ address: ruta, args });
}


module.exports = { enviarOSC };
