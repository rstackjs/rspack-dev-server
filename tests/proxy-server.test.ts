import { once } from 'node:events';
import http from 'node:http';
import net from 'node:net';
import type { AddressInfo } from 'node:net';
import {
  closeProxyServer,
  listenProxyServer,
  trackProxySocket,
} from './helpers/proxy-server';

describe('proxy server helpers', () => {
  it('destroys upgraded sockets before closing the proxy server', async () => {
    const app = http.createServer((_req, res) => {
      res.end('ok');
    });

    const proxy = await new Promise<http.Server>((resolve) => {
      const createdProxy = listenProxyServer(app, 0, '127.0.0.1', () => {
        resolve(createdProxy);
      });
    });

    const { port } = proxy.address() as AddressInfo;
    const client = net.connect(port, '127.0.0.1');

    await once(client, 'connect');

    let upgradedSocketClosed = false;
    const upgraded = once(proxy, 'upgrade').then(([, socket]) => {
      socket.once('close', () => {
        upgradedSocketClosed = true;
      });
    });

    client.write(
      'GET /ws HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n',
    );

    await upgraded;

    await closeProxyServer(proxy);

    expect(upgradedSocketClosed).toBe(true);
    expect(proxy.listening).toBe(false);
  });

  it('destroys tracked proxy sockets before closing the proxy server', async () => {
    const app = http.createServer((_req, res) => {
      res.end('ok');
    });

    const proxy = await new Promise<http.Server>((resolve) => {
      const createdProxy = listenProxyServer(app, 0, '127.0.0.1', () => {
        resolve(createdProxy);
      });
    });

    const proxySocket = new net.Socket();
    let proxySocketClosed = false;

    proxySocket.once('close', () => {
      proxySocketClosed = true;
    });

    trackProxySocket(proxy, proxySocket);

    await closeProxyServer(proxy);

    expect(proxySocketClosed).toBe(true);
    expect(proxy.listening).toBe(false);
  });
});
