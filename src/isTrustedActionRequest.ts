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

  if (headers.origin !== undefined) {
    const authority = headers[':authority'] ?? headers.host;
    if (typeof authority !== 'string') {
      return false;
    }
    try {
      const protocol = isTlsServer ? 'https' : 'http';
      return headers.origin === new URL(`${protocol}://${authority}`).origin;
    } catch {
      return false;
    }
  }

  // Without browser-provided origin information, require an explicit request.
  // A cross-origin page cannot set this header in a simple request.
  return headers['x-rspack-dev-server'] === '1';
}
