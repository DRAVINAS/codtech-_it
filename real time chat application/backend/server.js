
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

// Map to store clients by username
const clients = new Map();

wss.on('connection', function connection(ws) {
  let username = null;

  ws.on('message', function incoming(message) {
    try {
      const data = JSON.parse(message);

      if (data.type === 'register') {
        username = data.username;
        clients.set(username, ws);
        console.log(`User registered: ${username}`);
        return;
      }

      if (data.type === 'message') {
        const toUser = data.to;
        const fromUser = data.from;
        const msg = data.message;
        const msgType = data.msgType || 'text'; // text, file, url

        const recipientWs = clients.get(toUser);
        if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
          recipientWs.send(JSON.stringify({ from: fromUser, message: msg, msgType }));
        }
      }
    } catch (e) {
      console.error('Invalid message format', e);
    }
  });

  ws.on('close', () => {
    if (username) {
      clients.delete(username);
      console.log(`User disconnected: ${username}`);
    }
  });

  console.log('New client connected.');
});

console.log('WebSocket server is running on ws://localhost:8080');
