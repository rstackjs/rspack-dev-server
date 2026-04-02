// This folder disables `skipLibCheck` to check the public types of @rspack/dev-server.
import '@rspack/dev-server/client/index.js';
import { RspackDevServer } from '@rspack/dev-server';
import type { Configuration } from '@rspack/dev-server';

const config: Configuration = {};

void config;
void RspackDevServer;
