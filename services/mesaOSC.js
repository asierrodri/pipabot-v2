const osc = require('osc');

const udpPort = new osc.UDPPort({
  localAddress: '0.0.0.0',
  localPort: 57121,
  remoteAddress: process.env.MESA_IP || '192.168.1.100',
  remotePort: parseInt(process.env.MESA_PORT || '10023')
});

udpPort.open();

function enviarOSC(ruta, valor) {
  let tipo = typeof valor === 'number' ? 'f' : 's';
  let val = valor;

  udpPort.on("ready", () => {
    // /save "scene" 83 "Nueva83" ""
    udpPort.send({
      address: "/save",
      args: [
        { type: "s", value: "scene" },
        { type: "i", value: 83 },
        { type: "s", value: "Nueva83" },
        { type: "s", value: "" }
      ]
    });
  });

  // Para /-ssave o /-sload, asegúrate de que el valor sea un string entre comillas
  if ((ruta === '/-ssave' || ruta === '/-sload') && typeof valor === 'string') {
    if (!valor.startsWith('"')) {
      val = `"${valor}"`;
    }
    tipo = 's'; // Asegura que sea string
  }

  udpPort.send({
    address: ruta,
    args: [
      {
        type: tipo,
        value: val
      }
    ]
  });
}

module.exports = { enviarOSC };
