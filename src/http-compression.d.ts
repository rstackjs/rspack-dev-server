declare module 'http-compression' {
  import type {
    BrotliOptions,
    GzipOptions,
    IncomingHttpHeaders,
    IncomingMessage,
    ServerResponse,
  } from 'node:http';

  interface CompressionLevelOptions {
    brotli?: number;
    gzip?: number;
  }

  interface HttpCompressionOptions {
    threshold?: number;
    level?: CompressionLevelOptions;
    brotli?: boolean | BrotliOptions;
    gzip?: boolean | GzipOptions;
    mimes?: RegExp;
  }

  type Next = (err?: unknown) => void;

  type HttpCompressionMiddleware = (
    req: IncomingMessage,
    res: ServerResponse,
    next?: Next,
  ) => void;

  export default function compression(
    options?: HttpCompressionOptions,
  ): HttpCompressionMiddleware;
}
