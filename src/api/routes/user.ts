import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import { Logger } from 'winston';
import multer from 'multer';
import { fileFilter, s3Storage } from '../../config/multer';
import middlewares from '../middlewares';
import { celebrate, Joi } from 'celebrate';
import { IProfileUpdateInputDTO, IContactsImportInputDTO } from '../../interfaces/IUser';
import UserService from '../../services/user';
import NotificationService from '../../services/notification';
const route = Router();

const upload = multer({ storage: s3Storage, fileFilter });

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default (app: Router) => {
  app.use('/users', route);
  /**
   * @swagger
   * components:
   *   schemas:
   *     IContactsImportInputDTO:
   *       type: object
   *       properties:
   *         phone:
   *           type: array
   *           items:
   *             type: string
   *             description: Phone numbers to import.
   *             example: ["1234567890", "0987654321"]
   *       required:
   *         - phone
   *     User:
   *       type: object
   *       properties:
   *         _id:
   *           type: string
   *           description: The unique identifier for the user.
   *         fullname:
   *           type: string
   *           description: The full name of the user.
   *         username:
   *           type: string
   *           description: The username of the user.
   *         phone:
   *           type: string
   *           description: The phone number of the user.
   *         photo:
   *           type: string
   *           description: The URL of the user's profile photo.
   *         birthDate:
   *           type: string
   *           format: date-time
   *           description: The birth date of the user.
   *         callingCode:
   *           type: string
   *           description: The calling code of the user's phone number.
   *         isAdmin:
   *           type: boolean
   *           description: Indicates whether the user is an administrator.
   *         blocked:
   *           type: boolean
   *           description: Indicates whether the user's account is blocked.
   *         role:
   *           type: string
   *           description: The role of the user.
   *         loc:
   *           $ref: '#/components/schemas/Location'
   *         email:
   *           type: string
   *           format: email
   *           description: The email address of the user.
   *         interest:
   *           type: array
   *           items:
   *             type: string
   *           description: The user's interests.
   *         followers:
   *           type: array
   *           items:
   *             type: string
   *           description: The user's followers.
   *         following:
   *           type: array
   *           items:
   *             type: string
   *           description: The users the user is following.
   *     Interest:
   *       type: object
   *       properties:
   *         name:
   *           type: string
   *           description: The name of the interest.
   *         image:
   *           type: string
   *           description: interest image/icon.
   *   parameters:
   *     Page:
   *       name: page
   *       in: query
   *       description: The page number.
   *       schema:
   *         type: integer
   *     PageSize:
   *       name: pageSize
   *       in: query
   *       description: The number of interests per page.
   *       schema:
   *         type: integer
   *     DisplayOthers:
   *       name: DisplayOthers
   *       in: query
   *       description: the user id whose interest you want to filter against.
   *       schema:
   *         type: string
   */

  /**
   * @swagger
   * /api/users:
   *   get:
   *     summary: Get the currently authenticated user.
   *     tags:
   *       - Users
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: The currently authenticated user.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 user:
   *                   $ref: '#/components/schemas/User'
   *   patch:
   *     summary: Update the currently authenticated user's profile.
   *     tags:
   *       - Users
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               photo:
   *                 type: string
   *                 format: binary
   *               fullname:
   *                 type: string
   *               username:
   *                 type: string
   *               password:
   *                 type: string
   *               birthDate:
   *                 type: string
   *                 format: date-time
   *               latitude:
   *                 type: number
   *                 description: The latitude of the location of the user
   *               longitude:
   *                 type: number
   *                 description: The longitude of the location of the user
   *     responses:
   *       200:
   *         description: The updated user profile.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 user:
   *                   $ref: '#/components/schemas/User'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   */
  route
    .get('/', middlewares.isAuth, middlewares.attachCurrentUser, (req: Request, res: Response) => {
      return res.json({ user: req.currentUser }).status(200);
    })
    .patch(
      '/',
      middlewares.isAuth,
      middlewares.attachCurrentUser,
      upload.single('photo'),
      celebrate({
        body: Joi.object({
          fullname: Joi.string(),
          username: Joi.string(),
          password: Joi.string(),
          birthDate: Joi.string(),
          latitude: Joi.number(),
          longitude: Joi.number(),
        }),
      }),
      async (req: Request, res: Response, next: NextFunction) => {
        const logger: Logger = Container.get('logger');
        logger.debug('Calling Profile-Edit endpoint with body: %o', req.body);
        logger.debug('Calling Profile-Edit endpoint with files: %o', req.file);
        try {
          const userServiceInstance = Container.get(UserService);
          const user = await userServiceInstance.UserProfileUpdate(
            req.currentUser,
            req.body as IProfileUpdateInputDTO,
            req.file as Multer.File,
          );
          return res.json({ user }).status(200);
        } catch (e) {
          logger.error('🔥 error: %o', e);
          return next(e);
        }
      },
    );

  /**
   * @swagger
   * /api/users/stats/{userId}:
   *   get:
   *     summary: Get user statistics by ID
   *     description: Returns the statistics of a user based on their ID
   *     tags:
   *       - Users
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         description: ID of the user to retrieve statistics for
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: User statistics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 userStat:
   *                   type: object
   *                   properties:
   *                     totalPosts:
   *                       type: number
   *                     totalDonations:
   *                       type: number
   *                     totalPoints:
   *                       type: number
   *                     totalFriends:
   *                       type: number
   *                     amountRaised:
   *                       type: number
   *     security:
   *       - bearerAuth: []
   */
  route.get('/stats/:userId', async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');
    try {
      const { userId } = req.params;
      const userServiceInstance = Container.get(UserService);
      const userStat = await userServiceInstance.UserStats(userId);
      return res.json({ userStat }).status(200);
    } catch (e) {
      logger.error('🔥 error: %o', e);
      return next(e);
    }
  });

  /**
   * @swagger
   * /api/users/interests:
   *   get:
   *     summary: Get a list of user interests
   *     tags:
   *       - Users
   *     parameters:
   *       - $ref: '#/components/parameters/Page'
   *       - $ref: '#/components/parameters/PageSize'
   *       - $ref: '#/components/parameters/DisplayOthers'
   *     responses:
   *       200:
   *         description: List of user interests
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 interests:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Interest'
   */
  route.get('/interests', async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');
    logger.debug('Calling Users-Interests endpoint');

    try {
      const { page, pageSize, displayOthers } = req.query;
      const options = {
        page: parseInt(page?.toString(), 10) || 1,
        pageSize: parseInt(pageSize?.toString(), 10) || 10,
        displayOthers: displayOthers?.toString() || null,
      };

      const userServiceInstance = Container.get(UserService);
      const interests = await userServiceInstance.Interests(options);

      return res.json({ interests }).status(200);
    } catch (e) {
      logger.error('🔥 error: %o', e);
      return next(e);
    }
  });

  /**
   * @swagger
   * /api/users/import-contacts:
   *   post:
   *     summary: Import user contacts
   *     tags:
   *       - Users
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/IContactsImportInputDTO'
   *     responses:
   *       200:
   *         description: Successfully imported user contacts
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   */
  route.post(
    '/import-contacts',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling User-ImportContacts endpoint');

      try {
        const userServiceInstance = Container.get(UserService);
        await userServiceInstance.UserImportContacts(req.currentUser._id, req.body as IContactsImportInputDTO);

        return res.json({}).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/users/interests:
   *   post:
   *     summary: Add user's selected interests
   *     tags:
   *       - Users
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *              type: object
   *              properties:
   *                 interests:
   *                   type: array
   *                   items:
   *                     type: string
   *              required:
   *                 - interests
   *     responses:
   *       200:
   *         description: Returns the user updated user record
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 user:
   *                   type: object
   *                   properties:
   *                     interests:
   *                       type: array
   *                       items:
   *                         type: string
   *                       description: An array of interests selected
   *       '400':
   *         description: Bad Request
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: object
   *                   properties:
   *                     statusCode:
   *                       type: number
   *                       example: 400
   *                     message:
   *                       type: string
   *                       example: Bad Request
   *                     details:
   *                       type: object
   *                       properties:
   *                         message:
   *                           type: string
   *                           example: Error message
   */
  route.post(
    '/interests',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    celebrate({
      body: Joi.object({
        interests: Joi.array().items(Joi.string()).min(1).required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling User-Interests endpoint with body: %o', req.body);

      try {
        const userServiceInstance = Container.get(UserService);
        const updatedUser = await userServiceInstance.updateUserInterests(req.body.interests, req.currentUser._id);

        return res.json({ user: updatedUser }).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/users/suggested-users:
   *   get:
   *     tags:
   *       - Users
   *     summary: Get a list of suggested users
   *     description: Returns a paginated list of suggested users based on the current user's interests and activities.
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: The page number to return.
   *       - in: query
   *         name: pageSize
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 10
   *         description: The number of users to return per page.
   *     responses:
   *       '200':
   *         description: A paginated list of suggested users.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 users:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/User'
   *       '400':
   *         $ref: '#/components/responses/BadRequest'
   *       '401':
   *         $ref: '#/components/responses/UnauthorizedError'
   */
  route.get(
    '/suggested-users',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling User-Followers endpoint');

      try {
        const { page, pageSize } = req.query;
        const options = {
          page: parseInt(page?.toString(), 10) || 1,
          pageSize: parseInt(pageSize?.toString(), 10) || 10,
        };

        const userServiceInstance = Container.get(UserService);
        const users = await userServiceInstance.UserSuggestions(req.currentUser, options);

        return res.json({ users }).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/users/{userId}:
   *   get:
   *     summary: Get user profile by ID
   *     tags:
   *       - Users
   *     parameters:
   *       - in: path
   *         name: userId
   *         schema:
   *           type: string
   *         required: true
   *         description: The ID of the user to retrieve
   *     responses:
   *       200:
   *         description: Returns the user profile
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 user:
   *                   type: object
   *                   properties:
   *                     _id:
   *                       type: string
   *                       description: The user ID
   *                     email:
   *                       type: string
   *                       description: The user's email
   *       '400':
   *         $ref: '#/components/responses/BadRequest'
   */
  route.get('/:userId', async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');
    try {
      const { userId } = req.params;
      const userServiceInstance = Container.get(UserService);
      const user = await userServiceInstance.UserProfileById(userId);
      return res.json({ user }).status(200);
    } catch (e) {
      logger.error('🔥 error: %o', e);
      return next(e);
    }
  });

  /**
   * @swagger
   * /api/users/{userId}/follow:
   *   post:
   *     summary: Follow a user.
   *     tags:
   *       - Users
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: The ID of the user to follow.
   *     responses:
   *       200:
   *         description: Success.
   *       '400':
   *         description: Bad Request
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: object
   *                   properties:
   *                     statusCode:
   *                       type: number
   *                       example: 400
   *                     message:
   *                       type: string
   *                       example: Bad Request
   *                     details:
   *                       type: object
   *                       properties:
   *                         message:
   *                           type: string
   *                           example: Error message
   */
  route.post(
    '/:userId/follow',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling Follow endpoint');

      try {
        const userServiceInstance = Container.get(UserService);
        await userServiceInstance.UserFollow(req.currentUser._id, req.params.userId);
        return res.json({}).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/users/{userId}/unfollow:
   *   post:
   *     summary: Unfollow a user.
   *     tags:
   *       - Users
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: The ID of the user to unfollow.
   *     responses:
   *       200:
   *         description: Success.
   *       '400':
   *         description: Bad Request
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: object
   *                   properties:
   *                     statusCode:
   *                       type: number
   *                       example: 400
   *                     message:
   *                       type: string
   *                       example: Bad Request
   *                     details:
   *                       type: object
   *                       properties:
   *                         message:
   *                           type: string
   *                           example: Error message
   */
  route.post(
    '/:userId/unfollow',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling Follow endpoint');

      try {
        const userServiceInstance = Container.get(UserService);
        await userServiceInstance.UserUnFollow(req.currentUser._id, req.params.userId);

        return res.json({}).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * components:
   *   schemas:
   *     User:
   *       type: object
   *       properties:
   *         fullname:
   *           type: string
   *         username:
   *           type: string
   *         _id:
   *           type: string
   *         email:
   *           type: string
   *         phone:
   *           type: string
   *         callingCode:
   *           type: string
   *         isAdmin:
   *           type: boolean
   *         blocked:
   *           type: boolean
   *         role:
   *           type: string
   *
   * /api/users/{userId}/following:
   *   get:
   *     summary: Get a list of users followed by a given user.
   *     tags:
   *       - Users
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: The ID of the user whose following list you want to get.
   *     responses:
   *       200:
   *         description: Success.
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/User'
   *       '400':
   *         $ref: '#/components/responses/BadRequest'
   */
  route.get('/:userId/following', async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');
    logger.debug('Calling User-Following endpoint');

    try {
      const { page, pageSize } = req.query;
      const options = {
        page: parseInt(page?.toString(), 10) || 1,
        pageSize: parseInt(pageSize?.toString(), 10) || 10,
        userId: req.params.userId,
      };

      const userServiceInstance = Container.get(UserService);
      const followings = await userServiceInstance.UserFollowing(options);

      return res.json({ followings }).status(200);
    } catch (e) {
      logger.error('🔥 error: %o', e);
      return next(e);
    }
  });

  /**
   * @swagger
   * /api/users/{userId}/followers:
   *   get:
   *     summary: Get a list of users who follow a given user.
   *     tags:
   *       - Users
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: The ID of the user whose follower list you want to get.
   *     responses:
   *       200:
   *         description: Success.
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/User'
   *       '400':
   *         $ref: '#/components/responses/BadRequest'
   */
  route.get('/:userId/followers', async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');
    logger.debug('Calling User-Followers endpoint');

    try {
      const { page, pageSize } = req.query;
      const options = {
        page: parseInt(page?.toString(), 10) || 1,
        pageSize: parseInt(pageSize?.toString(), 10) || 10,
        userId: req.params.userId,
      };

      const userServiceInstance = Container.get(UserService);
      const followers = await userServiceInstance.UserFollowers(options);

      return res.json({ followers }).status(200);
    } catch (e) {
      logger.error('🔥 error: %o', e);
      return next(e);
    }
  });

  /**
   * @swagger
   * /api/users/{userId}/friends:
   *   get:
   *     summary: Get a list of friends of a given user.
   *     tags:
   *       - Users
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: The ID of the user whose friends list you want to get.
   *     responses:
   *       200:
   *         description: Success.
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/User'
   *       '400':
   *         $ref: '#/components/responses/BadRequest'
   */
  route.get('/:userId/friends', async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');
    try {
      const { userId } = req.params;
      const { page, pageSize } = req.query;
      const options = {
        page: parseInt(page?.toString(), 10) || 1,
        pageSize: parseInt(pageSize?.toString(), 10) || 10,
      };
      const userServiceInstance = Container.get(UserService);
      const friends = await userServiceInstance.UserFriends(userId, options);
      return res.json({ friends }).status(200);
    } catch (e) {
      logger.error('🔥 error: %o', e);
      return next(e);
    }
  });
};
