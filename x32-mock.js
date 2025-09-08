// x32-mock.js
// Simulador amplio de Behringer X32 para desarrollo UI.
// - Responde a GET de cualquier ruta con un valor por defecto razonable
// - En SET guarda el valor en memoria y lo devuelve (eco)
// - Suficiente para probar panel completo (preamp, mix, eq, gate, dyn, sends, buses, main, fxr)

const osc = require('osc');

const REMOTE_PORT = process.env.MOCK_REMOTE_PORT ? parseInt(process.env.MOCK_REMOTE_PORT, 10) : 10023; // <-- pon este port en tu tabla "mesas"
const REMOTE_ADDR = '127.0.0.1';

const CLIENT_ADDR = '127.0.0.1';
const CLIENT_PORT = 57121; // Debe coincidir con localPort del mesaOSC.js

// Memoria clave-valor para cualquier address recibido
// Ej: state['/ch/01/mix/fader'] = 0.73
const state = Object.create(null);

// Defaults genéricos para cualquier ruta que no esté en 'state'
function getDefault(address) {
    // Mix y routing básicos
    if (address.endsWith('/mix/fader')) return 0.50;
    if (address.endsWith('/mix/on')) return 1;
    if (address.endsWith('/mix/pan')) return 0.0;

    // Sends (nivel a buses)
    if (/\/mix\/\d{2}\/level$/.test(address)) return 0.00;    // /ch/NN/mix/BB/level
    if (/\/mix\/\d{2}\/on$/.test(address)) return 0;           // /ch/NN/mix/BB/on (0=off)

    // Preamp
    if (address.includes('/preamp/gain')) return 20.0;
    if (address.includes('/preamp/phantom')) return 0;         // 0/1
    if (address.includes('/preamp/invert')) return 0;          // 0/1

    // EQ (4 bandas)
    if (address.includes('/eq/on')) return 0;                  // 0/1
    if (/\/eq\/\d+\/type$/.test(address)) return 0;            // 0=Peak, 1=LShelf, etc.
    if (/\/eq\/\d+\/f$/.test(address)) return 1000;            // Hz
    if (/\/eq\/\d+\/g$/.test(address)) return 0.0;             // dB
    if (/\/eq\/\d+\/q$/.test(address)) return 1.0;

    // Gate
    if (address.includes('/gate/on')) return 0;                // 0/1
    if (address.includes('/gate/thr')) return -40;             // dB
    if (address.includes('/gate/att')) return 10;              // ms
    if (address.includes('/gate/rel')) return 100;             // ms

    // Dynamics (compresor)
    if (address.includes('/dyn/on')) return 0;                 // 0/1
    if (address.includes('/dyn/thr')) return -20;              // dB
    if (address.includes('/dyn/ratio')) return 2.0;
    if (address.includes('/dyn/att')) return 10;               // ms
    if (address.includes('/dyn/rel')) return 100;              // ms
    if (address.includes('/dyn/makeup')) return 0;             // dB

    // Labels y color
    if (address.includes('/config/name')) return 0;            // usaremos 0 como “sin nombre” (tu UI lo pinta como string)
    if (address.includes('/config/color')) return 0;           // mapea a tu gusto en UI

    // Main, Buses, FX Returns
    if (address.startsWith('/main/st/') && address.endsWith('/mix/fader')) return 0.70;
    if (address.startsWith('/main/st/') && address.endsWith('/mix/on')) return 1;

    if (/^\/bus\/\d{2}\/mix\/fader$/.test(address)) return 0.50;
    if (/^\/bus\/\d{2}\/mix\/on$/.test(address)) return 1;

    if (/^\/fxr\/\d{2}\/mix\/fader$/.test(address)) return 0.50;
    if (/^\/fxr\/\d{2}\/mix\/on$/.test(address)) return 1;

    // Fallback
    return 0;
}

// Determinar si una ruta es entera (on/off, flags, etc.)
function isIntegerAddress(address) {
    return (
        address.endsWith('/mix/on') ||
        address.endsWith('/mix/solo') ||
        address.endsWith('/preamp/phantom') ||
        address.endsWith('/preamp/invert') ||
        address.endsWith('/eq/on') ||
        address.endsWith('/gate/on') ||
        address.endsWith('/dyn/on') ||
        /\/mix\/\d{2}\/on$/.test(address) // sends on
    );
}

// Servidor “mesa”
const server = new osc.UDPPort({
    localAddress: REMOTE_ADDR,
    localPort: REMOTE_PORT,
    metadata: true
});

server.on('ready', () => {
    console.log(`🟢 X32 MOCK escuchando en ${REMOTE_ADDR}:${REMOTE_PORT} → reenviando respuestas a ${CLIENT_ADDR}:${CLIENT_PORT}`);
});

server.on('message', (msg) => {
    const addr = msg.address;
    const args = msg.args;

    // GET (sin args): devolvemos el valor actual o el default
    if (!args || args.length === 0) {
        const value = Object.prototype.hasOwnProperty.call(state, addr)
            ? state[addr]
            : getDefault(addr);

        const type = Number.isInteger(value) || isIntegerAddress(addr) ? 'i' : 'f';
        server.send({
            address: addr,
            args: [{ type, value }]
        }, CLIENT_ADDR, CLIENT_PORT);
        // console.log(`📤 GET ${addr} → ${value}`);
        return;
    }

    // SET: guardamos y hacemos echo
    const arg = args[0];
    let v;

    // Si sabemos que la ruta es entera, forzamos int
    if (isIntegerAddress(addr)) {
        v = parseInt(arg.value, 10);
        if (Number.isNaN(v)) v = 0;
    } else {
        // Float por defecto
        v = parseFloat(arg.value);
        if (Number.isNaN(v)) v = 0.0;
    }

    state[addr] = v;

    const type = Number.isInteger(v) || isIntegerAddress(addr) ? 'i' : 'f';
    server.send({
        address: addr,
        args: [{ type, value: v }]
    }, CLIENT_ADDR, CLIENT_PORT);

    // console.log(`✅ SET ${addr} = ${v}`);
});

server.open();
