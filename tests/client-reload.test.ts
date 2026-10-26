import { rstest } from 'rstack/test';
import type socket from '../client-src/socket.js';

rstest.mock('../client-src/socket.js', () => ({ default: rstest.fn() }));
rstest.mock('@rspack/core/hot/emitter.js', () => ({
  emitter: { emit: rstest.fn() },
}));

let handlers: Parameters<typeof socket>[1];

beforeEach(async () => {
  rstest.resetModules();
  rstest.clearAllMocks();
  rstest.useFakeTimers();
  rstest.stubGlobal('BUILD_HASH', 'initial');
  rstest.stubGlobal(
    'RESOURCE_QUERY',
    '?hostname=localhost&protocol=ws:&port=8080&live-reload=true&logging=none',
  );
  rstest.stubGlobal('document', undefined);
  rstest.stubGlobal('self', {
    location: new URL('http://localhost/worker.js'),
    addEventListener: rstest.fn(),
    postMessage: rstest.fn(),
    setInterval,
  });
  await import('../client-src/index');
  const { default: socket } = await import('../client-src/socket.js');
  handlers = rstest.mocked(socket).mock.calls[0][1];
});

afterEach(() => {
  rstest.useRealTimers();
  rstest.unstubAllGlobals();
});

describe.each(['ok', 'static-changed'])('%s', (message) => {
  it('skips full reload in a Worker without location.reload', () => {
    handlers.hash('updated');
    expect(() => {
      handlers[message]();
      rstest.runAllTimers();
    }).not.toThrow();
  });

  it('still reloads the page', () => {
    rstest.stubGlobal('document', {});
    self.location.reload = rstest.fn();
    handlers.hash('updated');
    handlers[message]();
    rstest.runAllTimers();
    expect(self.location.reload).toHaveBeenCalledTimes(1);
  });
});

it('still emits hot updates in a Worker', async () => {
  const { emitter: hotEmitter } = await import('@rspack/core/hot/emitter.js');
  handlers.hot();
  handlers.hash('updated');
  handlers.ok();
  expect(hotEmitter.emit).toHaveBeenCalledWith('webpackHotUpdate', 'updated');
});
