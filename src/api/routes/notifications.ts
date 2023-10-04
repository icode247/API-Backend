import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import { Logger } from 'winston';
import middlewares from '../middlewares';
import NotificationService from '../../services/notification';
const route = Router();

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default (app: Router) => {
  app.use('/notifications', route);

  /**
   * @swagger
   * components:
   *   schemas:
   *     Notification:
   *       type: object
   *       properties:
   *         _id:
   *           type: string
   *           description: The unique identifier for the notification.
   *         recipient:
   *           $ref: '#/components/schemas/User'
   *           description: The user who received the notification.
   *         message:
   *           type: string
   *           description: The notification message.
   *         title:
   *           type: string
   *           description: The notification title.
   *         type:
   *           type: string
   *           description: This is a string representing the type of the notification
   *         actionId:
   *           type: string
   *           description: The id of the type of notification received. For example if it is a follow then it will be the ID of the follower
   *         isRead:
   *           type: boolean
   *           description: Indicates whether the notification has been read.
   */

  /**
   * @swagger
   * /api/notifications:
   *   get:
   *     summary: Get notifications list
   *     description: Retrieve a list of notifications for the current user, paginated by page and page size.
   *     tags:
   *       - Notifications
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *         description: The current page number. Default is 1.
   *       - in: query
   *         name: pageSize
   *         schema:
   *           type: integer
   *         description: The number of items to return per page. Default is 10.
   *     responses:
   *       '200':
   *         description: A list of notifications for the current user.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 notifications:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Notification'
   */
  route.get(
    '/',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling Notification endpoint');

      try {
        const { page, pageSize } = req.query;
        const options = {
          page: parseInt(page?.toString(), 10) || 1,
          pageSize: parseInt(pageSize?.toString(), 10) || 10,
          userId: req.currentUser._id,
        };

        const notificationServiceInstance = Container.get(NotificationService);
        const notifications = await notificationServiceInstance.NotificationsList(options);

        return res.json({ notifications }).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.patch(
    '/:notificationId',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');

      try {
        const { notificationId } = req.params;
        const notificationServiceInstance = Container.get(NotificationService);
        await notificationServiceInstance.updateNotificationStatus(notificationId);

        return res.json({}).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
