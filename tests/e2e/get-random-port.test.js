const {
  getRandomPorts,
  releaseRandomPorts,
} = require('../helpers/get-random-port');

describe('random port allocation', () => {
  let ports = [];

  afterEach(() => {
    releaseRandomPorts(ports);
    ports = [];
    rstest.restoreAllMocks();
  });

  it('allocates a contiguous block when the random start is at the upper boundary', async () => {
    rstest.spyOn(Math, 'random').mockReturnValue(0.99999);
    ports = await getRandomPorts(8, '127.0.0.1');

    expect(ports).toHaveLength(8);
    expect(ports[0]).toBeGreaterThanOrEqual(15000);
    expect(ports[7]).toBeLessThanOrEqual(45000);
    expect(ports).toEqual(Array.from({ length: 8 }, (_, i) => ports[0] + i));
  });

  it('wraps to lower ports when the upper block is already reserved', async () => {
    rstest.spyOn(Math, 'random').mockReturnValue(0.99999);
    const first = await getRandomPorts(8, '127.0.0.1');
    ports.push(...first);
    const second = await getRandomPorts(8, '127.0.0.1');
    ports.push(...second);

    expect(new Set(ports).size).toBe(16);
    expect(second).toEqual(Array.from({ length: 8 }, (_, i) => second[0] + i));
    expect(second[0]).toBeGreaterThanOrEqual(15000);
    expect(second[7]).toBeLessThanOrEqual(45000);
  });
});
