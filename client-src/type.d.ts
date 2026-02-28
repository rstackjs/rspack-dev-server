export type LogLevel =
  | false
  | true
  | 'none'
  | 'error'
  | 'warn'
  | 'info'
  | 'log'
  | 'verbose';
export type EXPECTED_ANY = any;

declare interface CommunicationClient {
  onOpen(fn: (...args: unknown[]) => void): void;
  onClose(fn: (...args: unknown[]) => void): void;
  onMessage(fn: (...args: unknown[]) => void): void;
}

declare interface CommunicationClientConstructor {
  new (url: string): CommunicationClient; // Defines a constructor that takes a string and returns a GreeterInstance
}
