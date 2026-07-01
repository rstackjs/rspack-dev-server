const kProxySockets = Symbol('proxySockets');

function listenProxyServer(app, port, host, callback) {
  const proxy = app.listen(port, host, callback);
  const proxySockets = new Set();

  proxy[kProxySockets] = proxySockets;

  proxy.on('upgrade', (_req, socket) => {
    trackProxySocket(proxy, socket);
  });

  return proxy;
}

function trackProxySocket(proxy, socket) {
  const proxySockets = proxy[kProxySockets];

  if (!proxySockets) {
    return;
  }

  proxySockets.add(socket);
  socket.on('error', noop);
  socket.once('close', () => {
    proxySockets.delete(socket);
  });
}

async function closeProxyServer(proxy) {
  const proxySockets = proxy[kProxySockets];
  const socketClosePromises = [];

  if (proxySockets) {
    for (const socket of proxySockets) {
      socketClosePromises.push(waitForSocketClose(socket));
      socket.destroy();
    }
  }

  await Promise.all([closeServer(proxy), ...socketClosePromises]);
}

function closeServer(proxy) {
  return new Promise((resolve, reject) => {
    proxy.close((error) => {
      if (error && error.code !== 'ERR_SERVER_NOT_RUNNING') {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function waitForSocketClose(socket) {
  if (socket.closed) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    socket.once('close', resolve);
  });
}

function noop() {}

module.exports = {
  closeProxyServer,
  listenProxyServer,
  trackProxySocket,
};
