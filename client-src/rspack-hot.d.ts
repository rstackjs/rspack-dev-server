declare module '@rspack/core/hot/emitter.js' {
  export const emitter: {
    emit(eventName: string, ...args: unknown[]): void;
  };
}

declare module '@rspack/core/hot/log.js' {
  export const log: {
    setLogLevel(level: string | boolean): void;
  };
}
