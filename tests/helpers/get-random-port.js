const net = require('node:net');

function isPortAvailable(port, host = '0.0.0.0') {
  try {
    const server = net.createServer();

    server.unref();

    return new Promise((resolve) => {
      server.on('listening', () => {
        server.close(() => {
          resolve(true);
        });
      });
      server.on('error', () => {
        resolve(false);
      });
      server.listen(port, host);
    });
  } catch {
    return false;
  }
}

const portMap = new Map();

/**
 * Get a random port.
 * Available port ranges: 1024 ~ 65535
 * `10080` is not available on macOS CI, `> 50000` gets "permission denied" on Windows,
 * so we use `15000` ~ `45000`.
 */
async function getRandomPort(
  defaultPort = Math.ceil(Math.random() * 30000) + 15000,
  host,
) {
  let port = defaultPort;

  while (true) {
    if (!portMap.get(port) && (await isPortAvailable(port, host))) {
      portMap.set(port, 1);

      return port;
    }

    port += 1;
  }
}

async function getRandomPorts(count, host) {
  let port = await getRandomPort(undefined, host);

  while (true) {
    let isAvailable = true;

    for (let index = 0; index < count; index += 1) {
      const currentPort = port + index;

      if (
        portMap.get(currentPort) ||
        !(await isPortAvailable(currentPort, host))
      ) {
        isAvailable = false;
        port = currentPort + 1;
        break;
      }
    }

    if (isAvailable) {
      const ports = [];

      for (let index = 0; index < count; index += 1) {
        const currentPort = port + index;

        portMap.set(currentPort, 1);
        ports.push(currentPort);
      }

      return ports;
    }
  }
}

module.exports = {
  getRandomPort,
  getRandomPorts,
};
