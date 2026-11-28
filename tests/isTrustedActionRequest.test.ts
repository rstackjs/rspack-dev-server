import { isTrustedActionRequest } from '../src/isTrustedActionRequest.js';

describe('isTrustedActionRequest', () => {
  it.each([
    ['same-origin', true],
    ['none', true],
    ['same-site', false],
    ['cross-site', false],
    ['unknown', false],
  ])('checks the browser-provided site %s first', (site, expected) => {
    expect(
      isTrustedActionRequest(
        {
          'sec-fetch-site': site,
          host: 'localhost',
          origin: 'http://localhost',
        },
        false,
      ),
    ).toBe(expected);
  });

  it.each([
    ['http://localhost:8080', true],
    ['https://localhost:8080', false],
    ['http://localhost:8081', false],
    ['http://example.com:8080', false],
    ['null', false],
  ])(
    'checks the complete origin %s without Fetch Metadata',
    (origin, expected) => {
      expect(
        isTrustedActionRequest(
          { host: 'localhost:8080', origin, referer: 'http://localhost:8080/' },
          false,
        ),
      ).toBe(expected);
    },
  );

  it('uses the HTTP/2 authority and normalizes the default port', () => {
    expect(
      isTrustedActionRequest(
        { ':authority': '[::1]:443', origin: 'https://[::1]' },
        true,
      ),
    ).toBe(true);
  });

  it('rejects an origin without a valid request authority', () => {
    for (const host of [undefined, 'localhost:invalid']) {
      expect(
        isTrustedActionRequest({ host, origin: 'http://localhost' }, false),
      ).toBe(false);
    }
  });

  it.each([
    ['http://dev.test:8080/app?tab=1', true],
    ['https://dev.test:8080/', false],
    ['http://dev.test:8081/', false],
    ['http://other.test:8080/', false],
    ['invalid', false],
    [undefined, false],
  ])(
    'checks the referrer %s without Fetch Metadata or Origin',
    (referer, expected) => {
      expect(
        isTrustedActionRequest({ host: 'dev.test:8080', referer }, false),
      ).toBe(expected);
    },
  );
});
