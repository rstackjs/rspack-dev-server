/**
 * The following code is modified based on
 * https://github.com/webpack/webpack-dev-server
 *
 * MIT Licensed
 * Author Tobias Koppers @sokra
 * Copyright (c) JS Foundation and other contributors
 * https://github.com/webpack/webpack-dev-server/blob/main/LICENSE
 */

/*
 * Based on the packages get-port https://www.npmjs.com/package/get-port
 * and portfinder https://www.npmjs.com/package/portfinder
 * The code structure is similar to get-port, but it searches
 * ports deterministically like portfinder
 */
import * as net from 'node:net';
import * as os from 'node:os';

const minPort = 1024;
const maxPort = 65_535;

/**
 * Get all local hosts
 */
const getLocalHosts = (): Set<string | undefined> => {
  const interfaces = os.networkInterfaces();

  // Add undefined value for createServer function to use default host,
  // and default IPv4 host in case createServer defaults to IPv6.

  const results = new Set<string | undefined>([undefined, '0.0.0.0']);

  for (const _interface of Object.values(interfaces)) {
    if (_interface) {
      for (const config of _interface) {
        results.add(config.address);
      }
    }
  }

  return results;
};

/**
 * Check if a port is available on a given host
 */
const checkAvailablePort = (
  basePort: number,
  host: string | undefined,
): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);

    server.listen(basePort, host, () => {
      // Next line should return AddressInfo because we're calling it after listen() and before close()
      const { port } = server.address() as net.AddressInfo;
      server.close(() => {
        resolve(port);
      });
    });
  });

/**
 * Get available port from hosts
 */
const getAvailablePort = async (
  port: number,
  hosts: Set<string | undefined>,
): Promise<number> => {
  /**
   * Errors that mean that host is not available.
   */
  const nonExistentInterfaceErrors = new Set(['EADDRNOTAVAIL', 'EINVAL']);
  /* Check if the post is available on every local host name */
  for (const host of hosts) {
    try {
      await checkAvailablePort(port, host);
    } catch (error) {
      /* We throw an error only if the interface exists */
      if (
        !nonExistentInterfaceErrors.has(
          (error as NodeJS.ErrnoException).code || '',
        )
      ) {
        throw error;
      }
    }
  }

  return port;
};

/**
 * Get available ports
 */
async function getPorts(basePort: number, host?: string): Promise<number> {
  if (basePort < minPort || basePort > maxPort) {
    throw new Error(`Port number must lie between ${minPort} and ${maxPort}`);
  }

  let port = basePort;

  const localhosts = getLocalHosts();
  const hosts =
    host && !localhosts.has(host)
      ? new Set([host])
      : /* If the host is equivalent to localhost
       we need to check every equivalent host
       else the port might falsely appear as available
       on some operating systems  */
        localhosts;
  const portUnavailableErrors = new Set(['EADDRINUSE', 'EACCES']);
  while (port <= maxPort) {
    try {
      const availablePort = await getAvailablePort(port, hosts);
      return availablePort;
    } catch (error) {
      /* Try next port if port is busy; throw for any other error */
      if (
        !portUnavailableErrors.has((error as NodeJS.ErrnoException).code || '')
      ) {
        throw error;
      }
      port += 1;
    }
  }

  throw new Error('No available ports found');
}

module.exports = getPorts;
