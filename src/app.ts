import 'reflect-metadata'; // We need this in order to use @Decorators

import config from './config';

import express from 'express';
import http from 'http';
import Container from 'typedi';

import Logger from './loaders/logger';

import { SocketServer } from './loaders/socket.io';

async function startServer() {
  const app = express();

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  await require('./loaders').default({ expressApp: app });

  const httpServer = new http.Server(app);
  const socketServer = new SocketServer(httpServer);

  // inject the io instance as a dependency so it can be used within other services.
  // since the system api design http and socket hybrid. We need it this way so the
  // http related services can call the io server to emit messages when needed
  Container.set('io', socketServer.io);

  httpServer
    .listen(config.port, () => {
      Logger.info(`
      ################################################
      Server listening on port: ${config.port}
      ################################################
    `);
    })
    .on('error', err => {
      Logger.error(err);
      process.exit(1);
    });
}

startServer();
