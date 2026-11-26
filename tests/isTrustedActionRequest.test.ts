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
        { 'sec-fetch-site': site, 'x-rspack-dev-server': '1' },
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
          { host: 'localhost:8080', origin, 'x-rspack-dev-server': '1' },
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

  it('requires an explicit header when the source is unknown', () => {
    expect(isTrustedActionRequest({}, false)).toBe(false);
    expect(isTrustedActionRequest({ 'x-rspack-dev-server': '1' }, false)).toBe(
      true,
    );
  });
});
