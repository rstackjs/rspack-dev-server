import { rstest } from 'rstack/test';

rstest.mock('../client-src/socket.js', () => ({ default: rstest.fn() }));

let createSocketURL: typeof import('../client-src/index').createSocketURL;

beforeAll(async () => {
  rstest.stubGlobal('BUILD_HASH', 'test');
  rstest.stubGlobal('RESOURCE_QUERY', '?hostname=0.0.0.0&protocol=ws:&port=0');
  rstest.stubGlobal('self', {
    location: new URL('http://localhost/'),
    addEventListener: rstest.fn(),
  });
  ({ createSocketURL } = await import('../client-src/index'));
});

afterAll(() => rstest.unstubAllGlobals());

describe('createSocketURL', () => {
  it.each([
    ['https://example.com', 'ws:', '0.0.0.0', '0', 'wss://example.com/ws'],
    ['http://localhost:8080', 'ws:', '0.0.0.0', '0', 'ws://localhost:8080/ws'],
    [
      'https://example.com:8443',
      'ws:',
      '0.0.0.0',
      '0',
      'wss://example.com:8443/ws',
    ],
    ['https://example.com', 'auto:', '0.0.0.0', '', 'wss://example.com/ws'],
    ['https://example.com', '', '', '', 'wss://example.com/ws'],
    ['https://example.com', 'ws:', '::', '0', 'wss://example.com/ws'],
    ['https://example.com', 'ws:', '[::]', '0', 'wss://example.com/ws'],
    [
      'https://example.com',
      'ws:',
      'dev.example.com',
      '9000',
      'ws://dev.example.com:9000/ws',
    ],
    [
      'http://localhost:8080',
      'wss:',
      'dev.example.com',
      '443',
      'wss://dev.example.com:443/ws',
    ],
    [
      'http://localhost:8080',
      'wss:',
      '0.0.0.0',
      '9000',
      'wss://localhost:9000/ws',
    ],
  ])(
    'uses blob origin %s with protocol=%s, hostname=%s, port=%s',
    (origin, protocol, hostname, port, expected) => {
      const location = new URL(`blob:${origin}/worker-id`);
      expect(location.hostname).toBe('');
      rstest.stubGlobal('self', { location });
      expect(createSocketURL({ protocol, hostname, port } as URL)).toBe(
        expected,
      );
    },
  );

  it('preserves a configured path and credentials', () => {
    rstest.stubGlobal('self', {
      location: new URL('blob:https://example.com/worker-id'),
    });
    expect(
      createSocketURL({
        protocol: 'ws:',
        hostname: '0.0.0.0',
        port: '0',
        pathname: '/build/sockjs-node',
        username: 'user',
        password: 'password',
      } as URL),
    ).toBe('wss://user:password@example.com/build/sockjs-node');
  });

  it.each([
    ['https://example.com:8443/page', 'wss://example.com:8443/ws'],
    ['http://localhost:8080/worker.js', 'ws://localhost:8080/ws'],
    ['blob:null/worker-id', 'ws://0.0.0.0/ws'],
    ['data:text/javascript,', 'ws://0.0.0.0/ws'],
  ])('preserves existing behavior for %s', (href, expected) => {
    rstest.stubGlobal('self', { location: new URL(href) });
    expect(
      createSocketURL({
        protocol: 'ws:',
        hostname: '0.0.0.0',
        port: '0',
      } as URL),
    ).toBe(expected);
  });
});
