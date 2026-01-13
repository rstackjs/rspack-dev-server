/**
 * The following code is modified based on
 * https://github.com/webpack/webpack-dev-server
 *
 * MIT Licensed
 * Author Tobias Koppers @sokra
 * Copyright (c) JS Foundation and other contributors
 * https://github.com/webpack/webpack-dev-server/blob/main/LICENSE
 */

// @ts-nocheck
/**
 * @returns {SyncBailHook} mocked sync bail hook
 * @constructor
 */
function SyncBailHook() {
  return {
    call() {},
  };
}

/**
 * Client stub for tapable SyncBailHook
 */
export { SyncBailHook };
