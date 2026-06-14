const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Lob server online');
});

const wss = new WebSocket.Server({ server });

const players = new Map();
let nextX = 100;

function spawnX() {
  const x = nextX;
  nextX += 70;
  if (nextX > 1200) nextX = 100;
  return x;
}

wss.on('connection', (ws) => {
  const id = Math.random().toString(36).slice(2, 10);
  const x = spawnX();
  const y = 0;

  const player = { id, x, y, ws };
  players.set(id, player);

  ws.send(JSON.stringify({
    type: 'init',
    id,
    x,
    y,
    players: Array.from(players.values()).map(p => ({ id: p.id, x: p.x, y: p.y }))
  }));

  broadcast({ type: 'player_joined', id, x, y }, id);

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'move') {
        player.x = msg.x;
        player.y = msg.y;
        broadcast({ type: 'player_moved', id, x: msg.x, y: msg.y }, id);
      }
    } catch (_) {}
  });

  ws.on('close', () => {
    players.delete(id);
    broadcast({ type: 'player_left', id }, null);
  });
});

function broadcast(data, excludeId) {
  const json = JSON.stringify(data);
  for (const p of players.values()) {
    if (p.id !== excludeId) {
      try { p.ws.send(json); } catch (_) {}
    }
  }
}

server.listen(PORT, () => {
  console.log('Serwer WebSocket dziala na porcie ' + PORT);
});
