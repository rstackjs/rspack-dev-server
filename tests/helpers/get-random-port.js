const net = require('node:net');

const minRandomPort = 15000;
const maxRandomPort = 45000;

async function isPortAvailable(port, host = '0.0.0.0') {
  try {
    const server = net.createServer();

    server.unref();

    return await new Promise((resolve) => {
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

function getDefaultPort() {
  return Math.ceil(Math.random() * 30000) + minRandomPort;
}

async function findAvailablePort(startPort, count, host) {
  let port = Math.max(startPort, minRandomPort);
  const maxStartPort = maxRandomPort - count + 1;

  while (port <= maxStartPort) {
    let isAvailable = true;

    for (let index = 0; index < count; index += 1) {
      const currentPort = port + index;

      if (
        portMap.get(currentPort) ||
        !(await isPortAvailable(currentPort, host))
      ) {
        isAvailable = false;
        break;
      }
    }

    if (isAvailable) {
      return port;
    }

    port += 1;
  }

  throw new Error('No available ports found');
}

/**
 * Get a random port.
 * Available port ranges: 1024 ~ 65535
 * `10080` is not available on macOS CI, `> 50000` gets "permission denied" on Windows,
 * so we use `15000` ~ `45000`.
 */
async function getRandomPort(defaultPort = getDefaultPort(), host) {
  const port = await findAvailablePort(defaultPort, 1, host);

  portMap.set(port, 1);

  return port;
}

async function getRandomPorts(count, host) {
  if (count < 1) {
    throw new Error('Port count must be greater than 0');
  }

  const port = await findAvailablePort(getDefaultPort(), count, host);
  const ports = [];

  for (let index = 0; index < count; index += 1) {
    const currentPort = port + index;

    portMap.set(currentPort, 1);
    ports.push(currentPort);
  }

  return ports;
}

function releaseRandomPorts(ports = []) {
  for (const port of ports) {
    portMap.delete(port);
  }
}

module.exports = {
  getRandomPort,
  getRandomPorts,
  releaseRandomPorts,
};
