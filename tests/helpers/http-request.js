const http = require('node:http');
const https = require('node:https');

function request({
  app,
  protocol = 'http:',
  hostname = '127.0.0.1',
  port,
  path = '/',
  method = 'GET',
  headers,
  rejectUnauthorized = true,
  transportOptions = {},
}) {
  if (app) {
    return requestByApp({
      app,
      path,
      method,
      headers,
    });
  }

  const transport = protocol === 'https:' ? https : http;
  const requestOptions = {
    hostname,
    port,
    path,
    method,
    headers,
    ...transportOptions,
  };

  if (
    protocol === 'https:' &&
    typeof requestOptions.rejectUnauthorized === 'undefined'
  ) {
    requestOptions.rejectUnauthorized = rejectUnauthorized;
  }

  return new Promise((resolve, reject) => {
    const req = transport.request(requestOptions, (response) => {
      const chunks = [];

      response.on('data', (chunk) => {
        chunks.push(chunk);
      });

      response.on('end', () => {
        const body = Buffer.concat(chunks);

        resolve({
          status: response.statusCode,
          headers: response.headers,
          body,
          text: body.toString('utf-8'),
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function requestByApp({ app, path, method, headers }) {
  return new Promise((resolve, reject) => {
    const tempServer = http.createServer(app);

    tempServer.on('error', reject);

    tempServer.listen(0, '127.0.0.1', async () => {
      try {
        const address = tempServer.address();
        const response = await request({
          hostname: '127.0.0.1',
          port: address.port,
          path,
          method,
          headers,
        });

        tempServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(response);
        });
      } catch (error) {
        tempServer.close(() => {
          reject(error);
        });
      }
    });
  });
}

module.exports = request;
