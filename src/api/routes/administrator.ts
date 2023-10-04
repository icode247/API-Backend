import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import { Logger } from 'winston';
import multer from 'multer';
import { celebrate, Joi } from 'celebrate';
import middlewares from '../middlewares';
import AuthService from '../../services/auth';
import UserService from '../../services/user';
import EventService from '../../services/event';
import NotificationService from '../../services/notification';
import { INewNotificationInputDTO } from '../../interfaces/INotification';
import { IInterestInputDTO } from '../../interfaces/IInterest';
import { AnalyticsService } from '../../services/analytics';
import { fileFilter, s3Storage } from '../../config/multer';

const route = Router();

const ALLOWED_MAIL_DOMAINS = ['com', 'net', 'io', 'me', 'co'];
const EMAIL_VALIDATION_OPTIONS = { minDomainSegments: 2, tlds: { allow: ALLOWED_MAIL_DOMAINS } };
const upload = multer({ storage: s3Storage, fileFilter });

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default (app: Router) => {
  app.use('/administrator', route);
  /**
   * @swagger
   * components:
   *   responses:
   *     UnauthorizedError:
   *       description: Unauthorized Error
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               error:
   *                 type: object
   *                 properties:
   *                   statusCode:
   *                     type: number
   *                     example: 401
   *                   message:
   *                     type: string
   *                     example: Unauthorized
   *                   details:
   *                     type: object
   *                     properties:
   *                       message:
   *                         type: string
   *                         example: Invalid authentication token
   *     BadRequest:
   *       description: Bad Request
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               error:
   *                 type: object
   *                 properties:
   *                   statusCode:
   *                     type: number
   *                     example: 400
   *                   message:
   *                     type: string
   *                     example: Bad Request
   *                   details:
   *                     type: object
   *                     properties:
   *                       message:
   *                         type: string
   *                         example: Invalid input data
   */
  /**
   * @swagger
   * /api/administrator/signin:
   *   post:
   *     summary: Admin Signin
   *     description: Endpoint for admin signin
   *     tags:
   *       - Administrator
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 description: User email address
   *                 example: user@example.com
   *               password:
   *                 type: string
   *                 description: User password
   *                 example: mypassword123
   *     responses:
   *       '200':
   *         description: Successfully signed in
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Successfully signed in
   *       '400':
   *         $ref: '#/components/responses/BadRequest'
   */
  route.post(
    '/signin',
    celebrate({
      body: Joi.object({
        email: Joi.string().required().email(EMAIL_VALIDATION_OPTIONS),
        password: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling Admin-Signin endpoint with body: %o', req.body);
      try {
        const { email, password } = req.body;
        const authServiceInstance = Container.get(AuthService);
        const { user, token } = await authServiceInstance.AdminSignin(email, password);

        return res.status(200).json({ user, token });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/administrator/users:
   *   get:
   *     summary: Get a list of users
   *     tags:
   *       - Administrator
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         description: Page number of the results
   *         schema:
   *           type: integer
   *       - in: query
   *         name: pageSize
   *         description: Number of results per page
   *         schema:
   *           type: integer
   *       - in: query
   *         name: query
   *         description: Search query for filtering the results
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: List of users successfully retrieved
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 page:
   *                   type: integer
   *                   example: 1
   *                   description: Current page number
   *                 pageSize:
   *                   type: integer
   *                   example: 10
   *                   description: Number of results per page
   *                 total:
   *                   type: integer
   *                   example: 100
   *                   description: Total number of users matching the query
   *                 results:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/User'
   *                   description: List of users matching the query
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       '400':
   *         $ref: '#/components/responses/BadRequest'
   */
  route.get(
    '/users',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    middlewares.isAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling Admin-User-List endpoint');

      try {
        const { page, pageSize, query } = req.query;
        const options = {
          page: parseInt(page?.toString(), 10) || 1,
          pageSize: parseInt(pageSize?.toString(), 10) || 10,
          query: query?.toString(),
        };

        const userServiceInstance = Container.get(UserService);
        const users = await userServiceInstance.UserList(options);

        return res.json(users).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/administrator/users/block/{userId}:
   *   post:
   *     summary: Block a user by ID
   *     tags:
   *       - Administrator
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         description: ID of the user to be blocked
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: User successfully blocked
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       '400':
   *         $ref: '#/components/responses/BadRequest'
   */
  route.post(
    '/users/block/:userId',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    middlewares.isAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling Admin-Block-User endpoint');

      try {
        const userId = req.params.userId;

        const userServiceInstance = Container.get(UserService);
        await userServiceInstance.BlockUser(userId);

        return res.json({}).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/administrator/users/unblock/{userId}:
   *   post:
   *     summary: Unblock a user by ID
   *     tags:
   *       - Administrator
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         description: ID of the user to be unblocked
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: User successfully unblocked
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       '400':
   *         $ref: '#/components/responses/BadRequest'
   */
  route.post(
    '/users/unblock/:userId',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    middlewares.isAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling Admin-UnBlock-User endpoint');

      try {
        const userId = req.params.userId;

        const userServiceInstance = Container.get(UserService);
        await userServiceInstance.UnblockUser(userId);

        return res.json({}).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/administrator/send-notification:
   *   post:
   *     summary: Sends a notification to a user
   *     security:
   *       - bearerAuth: []
   *     tags: [Administrator]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               recipient:
   *                 type: string
   *                 description: The recipient of the notification. (UserId)
   *               message:
   *                 type: string
   *                 description: The message of the notification
   *               title:
   *                 type: string
   *                 description: The title of the notification
   *             required:
   *               - recipient
   *               - message
   *               - title
   *     responses:
   *       '200':
   *         description: Notification sent successfully
   *       '401':
   *         $ref: '#/components/responses/UnauthorizedError'
   *       '400':
   *         $ref: '#/components/responses/BadRequest'
   */
  route.post(
    '/send-notification',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    middlewares.isAdmin,
    celebrate({
      body: Joi.object({
        recipient: Joi.string().required(),
        message: Joi.string().required(),
        title: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling Admin-SendNotification endpoint');

      try {
        const notificationServiceInstance = Container.get(NotificationService);
        await notificationServiceInstance.SendNotification(req.body as INewNotificationInputDTO);
        return res.json({}).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/administrator/analytics:
   *   get:
   *     summary: Get admin analytics
   *     description: Endpoint to get analytics data for all users.
   *     security:
   *       - bearerAuth: []
   *     tags:
   *       - Administrator
   *     responses:
   *       200:
   *         description: Successful operation
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 users:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       user:
   *                         $ref: '#/components/schemas/IUser'
   *                       activities:
   *                         type: object
   *                         properties:
   *                           donations:
   *                             type: array
   *                             items:
   *                               $ref: '#/components/schemas/IDonation'
   *                           posts:
   *                             type: array
   *                             items:
   *                               $ref: '#/components/schemas/IPost'
   *                           rewards:
   *                             type: array
   *                             items:
   *                               $ref: '#/components/schemas/IUserReward'
   */

  route.get(
    '/analytics',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    middlewares.isAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');

      try {
        const analyticsServiceInstance = Container.get(AnalyticsService);
        const result = await analyticsServiceInstance.getAdminAnalytics();
        return res.json(result).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/administrator/transactions-analytics:
   *   get:
   *     summary: Get admin analytics for transactions on the platform, including profits and revenue
   *     description: Endpoint to get analytics data for all users.
   *     security:
   *       - bearerAuth: []
   *     tags:
   *       - Administrator
   *     responses:
   *       200:
   *         description: Successful operation
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 users:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       user:
   *                         $ref: '#/components/schemas/IUser'
   *                       activities:
   *                         type: object
   *                         properties:
   *                           donations:
   *                             type: array
   *                             items:
   *                               $ref: '#/components/schemas/IDonation'
   *                           posts:
   *                             type: array
   *                             items:
   *                               $ref: '#/components/schemas/IPost'
   *                           rewards:
   *                             type: array
   *                             items:
   *                               $ref: '#/components/schemas/IUserReward'
   *                 transactions:
   *                   type: object
   *                   properties:
   *                     donations:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/IDonation'
   *                     organizationDonations:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/IDonation'
   *                     eventDonations:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/IDonation'
   *                 profits:
   *                   type: number
   *                   description: Total profits made from the platform.
   *                 revenue:
   *                   type: number
   *                   description: Total revenue made from the platform.
   */

  route.get(
    '/transactions-analytics',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    middlewares.isAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');

      try {
        const analyticsServiceInstance = Container.get(AnalyticsService);
        const result = await analyticsServiceInstance.getAdminAnalyticsForTransactions();
        return res.json(result).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/administrator/interests/{interestId}:
   *   patch:
   *     summary: Update interest by ID
   *     tags:
   *       - Administrator
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: interestId
   *         schema:
   *           type: string
   *         required: true
   *         description: ID of the interest to be updated
   *       - in: formData
   *         name: photo
   *         type: file
   *         description: The photo file to upload
   *       - in: body
   *         name: interest
   *         description: Updated interest data
   *         schema:
   *           type: object
   *           properties:
   *             name:
   *               type: string
   *     responses:
   *       '200':
   *         description: Successful operation
   */
  route.patch(
    '/interests/:interestId',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    middlewares.isAdmin,
    upload.single('photo'),
    celebrate({
      body: Joi.object({
        name: Joi.string(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling Edit Interest endpoint');

      try {
        const interestId = req.params.interestId;
        const eventServiceInstance = Container.get(EventService);
        await eventServiceInstance.updateInterest(interestId, req.body as IInterestInputDTO, req.file as Multer.File);
        return res.json({}).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
