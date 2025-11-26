import net from 'net';

const startPort = 5173;
const endPort = 5185;

for (let port = startPort; port <= endPort; port++) {
    const socket = new net.Socket();
    socket.setTimeout(200);
    socket.on('connect', () => {
        console.log(`Port ${port} is open`);
        socket.destroy();
    });
    socket.on('timeout', () => {
        socket.destroy();
    });
    socket.on('error', (e) => {
        socket.destroy();
    });
    socket.connect(port, 'localhost');
}
