const ws = require('ws');
const server = new ws.Server({ port: 3000 });

server.on('connection', (socket) => {
  socket.on('message', message => {
    console.log(`Received message => ${message}`);
    socket.send(`You said: ${message}`);
  })

})