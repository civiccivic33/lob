const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Lob server online');
});

const wss = new WebSocket.Server({ server });

const players = new Map();

wss.on('connection', (ws) => {
  const id = Math.random().toString(36).slice(2, 10);
  const xf = Math.random() * 0.5 + 0.15;
  const yOff = 0;

  const player = { id, xf, yOff, ws };
  players.set(id, player);

  ws.send(JSON.stringify({
    type: 'init',
    id,
    xf,
    yOff,
    players: Array.from(players.values()).map(p => ({ id: p.id, xf: p.xf, yOff: p.yOff, nick: p.nick || '' }))
  }));

  broadcast({ type: 'player_joined', id, xf, yOff, nick: '' }, id);

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'join') {
        player.nick = msg.nick;
        broadcast({ type: 'player_nick', id, nick: msg.nick }, id);
      } else if (msg.type === 'move') {
        player.xf = msg.xf;
        player.yOff = msg.yOff;
        broadcast({ type: 'player_moved', id, xf: msg.xf, yOff: msg.yOff }, id);
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
