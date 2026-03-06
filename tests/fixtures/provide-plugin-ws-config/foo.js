'use strict';

// 'npm run prepare' must be run for this to work during testing
const WebsocketClient =
  require('../../../client/clients/WebSocketClient').default;

window.expectedClient = WebsocketClient;
// eslint-disable-next-line camelcase, no-undef
window.injectedClient = __rspack_dev_server_client__.default;
