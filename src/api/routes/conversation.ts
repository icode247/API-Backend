import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import { Logger } from 'winston';
import multer from 'multer';
import { celebrate, Joi, Segments } from 'celebrate';
import middlewares from '../middlewares';
import { fileFilter, s3Storage } from '../../config/multer';
import { ConversationService } from '../../services/conversation';

const upload = multer({ storage: s3Storage, fileFilter });
const route = Router();

export default (app: Router): void => {
  app.use('/conversations', route);

  /**
   * @swagger
   * components:
   *   schemas:
   *     Message:
   *       type: object
   *       properties:
   *         _id:
   *           type: string
   *         sender:
   *           $ref: '#/components/schemas/User'
   *         recipient:
   *           $ref: '#/components/schemas/User'
   *         conversation:
   *           $ref: '#/components/schemas/Conversation'
   *         message:
   *           type: string
   *         attachment:
   *           type: string
   *         replying:
   *           $ref: '#/components/schemas/Message'
   *         status:
   *           type: string
   *
   *     Conversation:
   *       type: object
   *       properties:
   *         _id:
   *           type: string
   *         lastMessage:
   *           type: string
   *         participants:
   *           type: array
   *           items:
   *             $ref: '#/components/schemas/User'
   *         unreadMessages:
   *           type: number
   */

  /**
   * @swagger
   * /api/conversations:
   *   get:
   *     summary: All currently logged in users conversations
   *     description: All currently logged in users conversations
   *     tags:
   *       - Conversations
   *     parameters:
   *       - in: query
   *         name: searchQuery
   *         schema:
   *           type: string
   *         description: Optional search query parameter for filtering conversations
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           description: Page number for pagination
   *       - in: query
   *         name: pageSize
   *         schema:
   *           type: integer
   *           description: Number of events per page
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       '200':
   *         description: Ok
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 Conversations:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Conversation'
   *
   *
   *       '400':
   *         $ref: '#/components/responses/BadRequest'
   */
  route.get(
    '/',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling Get Conversations endpoint');
      try {
        const { page, pageSize, searchQuery } = req.query;
        const options = {
          page: parseInt(page?.toString(), 10) || 1,
          pageSize: parseInt(pageSize?.toString(), 10) || 10,
          searchQuery: searchQuery?.toString(),
        };
        const conversationServiceInstance = Container.get(ConversationService);
        const conversations = await conversationServiceInstance.getActiveUserConversations(
          req.currentUser._id,
          options,
        );
        return res.status(201).json({ conversations });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/conversations/unread-messages-count:
   *   get:
   *     summary: Unread Messages count
   *     description: Get all unread messages for the user
   *     tags:
   *       - Conversations
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       '200':
   *         description: Ok
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 count:
   *                   type: number
   *
   *       '400':
   *         $ref: '#/components/responses/BadRequest'
   */
  route.get(
    '/unread-messages-count',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const conversationServiceInstance = Container.get(ConversationService);
        const count = await conversationServiceInstance.getUnreadMessagesCount(req.currentUser._id);
        return res.status(201).json({ count });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/conversations:
   *   post:
   *     summary: Start a new conversations or get existing one
   *     description: This endpoint starts a conversation between the two users if non exists or return already existing one
   *     tags:
   *       - Conversations
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *               type: object
   *               properties:
   *                 userTwo:
   *                    type: string
   *     responses:
   *       '201':
   *         description: Created
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 conversation:
   *                   $ref: '#/components/schemas/Conversation'
   *
   *       '400':
   *         $ref: '#/components/responses/BadRequest'
   */

  route.post(
    '/',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    celebrate({
      [Segments.BODY]: Joi.object({
        userTwo: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const conversationServiceInstance = Container.get(ConversationService);
        const conversation = await conversationServiceInstance.getOrCreateConversation(
          req.currentUser._id,
          req.body.userTwo,
        );
        return res.status(201).json({ conversation });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/conversations/{conversationId}/messages:
   *   post:
   *     summary: Send message to a conversation
   *     description: This message sends message to a conversation. It also includes sending attachments. This endpoint emits an event to 'conversation-{conversationId}'
   *     tags:
   *       - Conversations
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 replying:
   *                   type: string
   *
   *     responses:
   *       '201':
   *         description: Created
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   $ref: '#/components/schemas/Message'
   *
   *       '400':
   *         $ref: '#/components/responses/BadRequest'
   */
  route.post(
    '/:conversationId/messages',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    upload.single('attachment'),
    celebrate({
      [Segments.BODY]: Joi.object({
        message: Joi.string(),
        replying: Joi.string(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const conversationServiceInstance = Container.get(ConversationService);
        const message = await conversationServiceInstance.createMessage(
          req.currentUser,
          req.params.conversationId,
          req.body.message,
          req.body.replying || null,
          req.file as Multer.File,
        );
        return res.status(201).json({ message });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/conversations/{conversationId}/messages:
   *   get:
   *     summary: All messages btw logged in users and other user on this conversation
   *     description: All messages btw logged in users and other user on this conversation
   *     tags:
   *       - Conversations
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: conversationId
   *         schema:
   *            type: string
   *         description: conversation id of the conversations
   *
   *     responses:
   *       '201':
   *         description: Created
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 messages:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Message'
   *
   *       '400':
   *         $ref: '#/components/responses/BadRequest'
   */
  route.get(
    '/:conversationId/messages',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const { page, pageSize } = req.query;
        const options = {
          page: parseInt(page?.toString(), 10) || 1,
          pageSize: parseInt(pageSize?.toString(), 10) || 10,
        };
        const conversationServiceInstance = Container.get(ConversationService);
        const messages = await conversationServiceInstance.getMessages(
          req.params.conversationId,
          req.currentUser._id,
          options,
        );
        return res.status(201).json({ messages });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
