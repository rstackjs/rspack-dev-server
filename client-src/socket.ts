/**
 * The following code is modified based on
 * https://github.com/webpack/webpack-dev-server
 *
 * MIT Licensed
 * Author Tobias Koppers @sokra
 * Copyright (c) JS Foundation and other contributors
 * https://github.com/webpack/webpack-dev-server/blob/main/LICENSE
 */

import WebSocketClient from './clients/WebSocketClient.js';
import { log } from './utils/log.js';

import type {
  CommunicationClient,
  CommunicationClientConstructor,
  EXPECTED_ANY,
} from './type.js';

declare const __webpack_dev_server_client__:
  | CommunicationClientConstructor
  | { default: CommunicationClientConstructor }
  | undefined;

// this WebsocketClient is here as a default fallback, in case the client is not injected
const Client: CommunicationClientConstructor =
  typeof __webpack_dev_server_client__ !== 'undefined'
    ? typeof (
        __webpack_dev_server_client__ as {
          default: CommunicationClientConstructor;
        }
      ).default !== 'undefined'
      ? (
          __webpack_dev_server_client__ as {
            default: CommunicationClientConstructor;
          }
        ).default
      : (__webpack_dev_server_client__ as CommunicationClientConstructor)
    : WebSocketClient;

let retries = 0;
let maxRetries = 10;

// Initialized client is exported so external consumers can utilize the same instance
// It is mutable to enforce singleton
export let client: CommunicationClient | null = null;

let timeout: ReturnType<typeof setTimeout> | undefined;

function socket(
  url: string,
  handlers: {
    [handler: string]: (
      data?: EXPECTED_ANY,
      params?: EXPECTED_ANY,
    ) => EXPECTED_ANY;
  },
  reconnect?: number,
) {
  client = new Client(url);

  client.onOpen(() => {
    retries = 0;

    if (timeout) {
      clearTimeout(timeout);
    }

    if (typeof reconnect !== 'undefined') {
      maxRetries = reconnect;
    }
  });

  client.onClose(() => {
    if (retries === 0) {
      handlers.close();
    }

    // Try to reconnect.
    client = null;

    // After 10 retries stop trying, to prevent logspam.
    if (retries < maxRetries) {
      // Exponentially increase timeout to reconnect.
      // Respectfully copied from the package `got`.
      const retryInMs = 1000 * Math.pow(2, retries) + Math.random() * 100;

      retries += 1;

      log.info('Trying to reconnect...');

      timeout = setTimeout(() => {
        socket(url, handlers, reconnect);
      }, retryInMs);
    }
  });

  client.onMessage((data: EXPECTED_ANY) => {
    const message = JSON.parse(data);

    if (handlers[message.type]) {
      handlers[message.type](message.data, message.params);
    }
  });
}

export default socket;
