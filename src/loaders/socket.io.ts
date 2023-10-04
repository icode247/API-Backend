import * as socketIO from 'socket.io';
import http from 'http';
import { ConversationService } from '../services/conversation';
import Container from 'typedi';
import { Logger } from 'winston';
import authenticateSocket from '../api/middlewares/socketAuth';

export class SocketServer {
  private conversationServiceInstance = Container.get(ConversationService);
  private logger: Logger = Container.get('logger');
  public io: socketIO.Server;

  constructor(server: http.Server) {
    this.io = new socketIO.Server(server, {
      pingInterval: 10000,
      pingTimeout: 5000,
      cookie: false,
      transports: ['websocket', 'polling'],
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.io.use(authenticateSocket);

    this.setupConnection(this.io);
  }

  public setupConnection(io: socketIO.Server): void {
    io.on('connection', async (socket: socketIO.Socket) => {
      this.handleMessages(socket);

      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
      });
    });
  }

  public handleMessages(socket: socketIO.Socket): void {
    this.onConversationOpen(socket);
  }

  public onConversationOpen(socket: socketIO.Socket): void {
    socket.on('conversation-opened', async ({ conversationId }) => {
      try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const userId = socket.decodedJwt._id;

        this.conversationServiceInstance.markMessageAsRead(conversationId, userId);

        socket.broadcast.to(`conversation-${conversationId}`).emit('messages-read', { conversationId, userId });
      } catch (error) {
        this.logger.error('🔥 error: %o', error);
      }
    });
  }
}
