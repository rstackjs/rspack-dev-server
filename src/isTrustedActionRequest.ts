import type { IncomingHttpHeaders } from 'node:http';

export function isTrustedActionRequest(
  headers: IncomingHttpHeaders,
  isTlsServer: boolean,
): boolean {
  const site = headers['sec-fetch-site'];
  if (site !== undefined) {
    // "none" is a user-initiated navigation, e.g. from the address bar.
    return site === 'same-origin' || site === 'none';
  }

  const authority = headers[':authority'] ?? headers.host;
  if (typeof authority !== 'string') {
    return false;
  }
  try {
    const protocol = isTlsServer ? 'https' : 'http';
    const expectedOrigin = new URL(`${protocol}://${authority}`).origin;
    if (headers.origin !== undefined) {
      return headers.origin === expectedOrigin;
    }
    // Same-origin GET requests on plain HTTP may only carry a Referer.
    return (
      headers.referer !== undefined &&
      new URL(headers.referer).origin === expectedOrigin
    );
  } catch {
    return false;
  }
}
