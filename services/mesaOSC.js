const osc = require('osc');

const udpPort = new osc.UDPPort({
  localAddress: '0.0.0.0',
  localPort: 57121,
  remoteAddress: process.env.MESA_IP || '192.168.1.100',
  remotePort: parseInt(process.env.MESA_PORT || '10023')
});

udpPort.open();

function enviarOSC(ruta, valor) {
  udpPort.send({
    address: ruta,
    args: [
      {
        type: typeof valor === 'number' ? 'f' : 'i',
        value: valor
      }
    ]
  });
}

module.exports = { enviarOSC };
