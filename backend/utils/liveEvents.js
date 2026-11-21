const clients = new Set();

// Send keep-alive comment every 25s so Cloudflare Tunnel / reverse proxies never drop idle SSE connections
setInterval(() => {
  for (const client of clients) {
    try {
      client.write(': heartbeat\n\n');
    } catch (_) {
      clients.delete(client);
    }
  }
}, 25000).unref();

const subscribeEvents = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', ts: Date.now() })}\n\n`);
  clients.add(res);

  const cleanup = () => {
    clients.delete(res);
  };

  req.on('close', cleanup);
  req.on('error', cleanup);
};

const broadcastChange = (eventType = 'DATA_UPDATED') => {
  const payload = `data: ${JSON.stringify({ type: eventType, ts: Date.now() })}\n\n`;
  for (const client of clients) {
    try {
      client.write(payload);
    } catch (_) {
      clients.delete(client);
    }
  }
};

module.exports = {
  subscribeEvents,
  broadcastChange,
};
