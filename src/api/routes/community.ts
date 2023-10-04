import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import { Logger } from 'winston';
import { celebrate, Joi, Segments } from 'celebrate';
import middlewares from '../middlewares';
import CommunityService from '../../services/community';
import { CreateCommunityInputDTO } from '../../interfaces/ICommunity';
import multer from 'multer';
import { fileFilter, s3Storage } from '../../config/multer';

const upload = multer({ storage: s3Storage, fileFilter });

const route = Router();

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default (app: Router) => {
  app.use('/communities', route);

  /**
   * @swagger
   * tags:
   *   name: Communities
   *   description: API endpoints for managing communities
   */

  /**
   * @swagger
   * components:
   *   schemas:
   *     Community:
   *       type: object
   *       properties:
   *         _id:
   *           type: string
   *         interests:
   *           type: array
   *           items:
   *             type: string
   *         members:
   *           type: array
   *           items:
   *             type: string
   *         invitees:
   *           type: array
   *           items:
   *             type: string
   *         moderators:
   *           type: array
   *           items:
   *             type: string
   *         name:
   *           type: string
   *         description:
   *           type: string
   *         admin:
   *           type: string
   *         posts:
   *           type: array
   *           items:
   *             type: object
   *             properties:
   *               totalPosts:
   *                 type: number
   *         totalMembers:
   *           type: number
   *         totalPosts:
   *           type: number
   */

  /**
   * @swagger
   * /api/communities:
   *   post:
   *     summary: Create a new community
   *     tags:
   *       - Communities
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               interests:
   *                 type: array
   *                 items:
   *                   type: string
   *               invitees:
   *                 type: array
   *                 items:
   *                   type: string
   *     responses:
   *       201:
   *         description: Community created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 community:
   *                   $ref: '#/components/schemas/Community'

    * /api/communities/invite-friends/{communityId}:
    *   post:
    *     summary: Invite friends to a community
    *     tags:
    *       - Communities
    *     security:
    *       - bearerAuth: []
    *     parameters:
    *       - in: path
    *         name: communityId
    *         required: true
    *         schema:
    *           type: string
    *     requestBody:
    *       required: true
    *       content:
    *         application/json:
    *           schema:
    *             type: object
    *             properties:
    *               invitees:
    *                 type: array
    *                 items:
    *                   type: string
    *     responses:
    *       200:
    *         description: Friends invited successfully
    *         content:
    *           application/json:
    *             schema:
    *               type: object
    *               properties:
    *                 community:
    *                   $ref: '#/components/schemas/Community'

    * /api/communities/join-community/{communityId}:
    *   post:
    *     summary: Join a community
    *     tags:
    *       - Communities
    *     security:
    *       - bearerAuth: []
    *     parameters:
    *       - in: path
    *         name: communityId
    *         required: true
    *         schema:
    *           type: string
    *     responses:
    *       200:
    *         description: Joined community successfully
    *         content:
    *           application/json:
    *             schema:
    *               type: object
    *               properties:
    *                 community:
    *                   $ref: '#/components/schemas/Community'
  */

  /**
   * @swagger
   * /api/communities/leave-community/{communityId}/:
   *   post:
   *     summary: Leave a community
   *     tags: [Communities]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: communityId
   *         schema:
   *           type: string
   *         required: true
   *         description: The ID of the community to leave
   *     responses:
   *       '200':
   *         description: OK
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 community:
   *                   $ref: '#/components/schemas/Community'
   */

  /**
   * @swagger
   * /api/communities/remove-member/{communityId}/:
   *   post:
   *     summary: Remove a member from a community
   *     tags: [Communities]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: communityId
   *         schema:
   *           type: string
   *         required: true
   *         description: The ID of the community
   *       - in: body
   *         name: body
   *         description: Member ID to remove
   *         required: true
   *         schema:
   *           type: object
   *           properties:
   *             memberId:
   *               type: string
   *     responses:
   *       '201':
   *         description: Created
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 community:
   *                   $ref: '#/components/schemas/Community'
   *       '400':
   *         $ref: '#/components/responses/BadRequest'
   */

  /**
   * @swagger
   * /api/communities/suggested-communities:
   *   get:
   *     summary: Get suggested communities
   *     tags: [Communities]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *         description: Page number
   *       - in: query
   *         name: pageSize
   *         schema:
   *           type: integer
   *         description: Number of items per page
   *       - in: query
   *         name: searchQuery
   *         schema:
   *           type: string
   *         description: Search query string
   *     responses:
   *       '200':
   *         description: Successful operation
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 suggestedCommunities:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Community'
   */

  /**
   * @swagger
   * /api/communities/{communityId}/members:
   *   get:
   *     summary: Get community members
   *     tags: [Communities]
   *     parameters:
   *       - in: path
   *         name: communityId
   *         schema:
   *           type: string
   *         description: Community ID
   *         required: true
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *         description: Page number
   *       - in: query
   *         name: pageSize
   *         schema:
   *           type: integer
   *         description: Number of items per page
   *     responses:
   *       '200':
   *         description: Successful operation
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 members:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/User'
   */

  /**
   * @swagger
   * /api/communities/{communityId}:
   *   get:
   *     summary: Get community by ID
   *     tags: [Communities]
   *     parameters:
   *       - in: path
   *         name: communityId
   *         schema:
   *           type: string
   *         description: Community ID
   *         required: true
   *     responses:
   *       '200':
   *         description: Successful operation
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Community'
   */

  /**
   * @swagger
   * /api/communities/hosted-communities:
   *   get:
   *     summary: Get hosted communities
   *     tags: [Communities]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       '200':
   *         description: Successful operation
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 communities:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Community'
   */
  route.get(
    '/hosted-communities',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');

      try {
        const { searchQuery } = req.query;
        const communityServiceInstance = Container.get(CommunityService);
        const search = searchQuery ? searchQuery.toString() : null;
        const communities = await communityServiceInstance.getHostedCommunities(req.currentUser._id, search);
        return res.status(200).json({ communities });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/communities/joined-communities:
   *   get:
   *     summary: Get joined communities
   *     tags: [Communities]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: userId
   *         schema:
   *           type: string
   *         description: User id to query
   *     responses:
   *       '200':
   *         description: Successful operation
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 communities:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Community'
   */
  route.get(
    '/joined-communities',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');

      try {
        const { searchQuery } = req.query;
        const communityServiceInstance = Container.get(CommunityService);
        const userId = req.query.userId ?? req.currentUser._id;
        const search = searchQuery ? searchQuery.toString() : null;
        const communities = await communityServiceInstance.getJoinedCommunities(userId, search);
        return res.status(200).json({ communities });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    upload.single('photo'),
    celebrate({
      body: Joi.object({
        name: Joi.string().required(),
        description: Joi.string().required(),
        interests: Joi.array().items().min(1).required(),
        invitees: Joi.array(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling Community endpoint');
      try {
        const communityServiceInstance = Container.get(CommunityService);
        const community = await communityServiceInstance.createCommunity(
          req.body as CreateCommunityInputDTO,
          req.currentUser._id,
          req.file as Multer.File,
        );
        return res.status(201).json({ community });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/invite-friends/:communityId/',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    celebrate({
      body: Joi.object({
        invitees: Joi.array().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling Community Friends invite endpoint');

      try {
        const communityServiceInstance = Container.get(CommunityService);
        const community = await communityServiceInstance.inviteFriends(req.params.communityId, req.body.invitees);
        return res.status(200).json({ community });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/join-community/:communityId/',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling Community join endpoint');
      try {
        const communityServiceInstance = Container.get(CommunityService);
        const community = await communityServiceInstance.joinCommunity(req.params.communityId, req.currentUser._id);
        return res.status(200).json({ community });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/leave-community/:communityId/',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling Community leave endpoint');

      try {
        const communityServiceInstance = Container.get(CommunityService);
        const community = await communityServiceInstance.leaveCommunity(req.params.communityId, req.currentUser._id);
        return res.status(200).json({ community });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/remove-member/:communityId/',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    celebrate({
      body: Joi.object({
        memberId: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling Community remove member endpoint');

      try {
        const communityServiceInstance = Container.get(CommunityService);
        const community = await communityServiceInstance.removeFriend(
          req.params.communityId,
          req.currentUser._id,
          req.body.memberId,
        );
        return res.status(201).json({ community });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.get(
    '/suggested-communities',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling suggested communities endpoint');

      try {
        const { page, pageSize, searchQuery } = req.query;
        const options = {
          page: parseInt(page?.toString(), 10) || 1,
          pageSize: parseInt(pageSize?.toString(), 10) || 10,
          searchQuery: searchQuery?.toString(),
        };
        const communityServiceInstance = Container.get(CommunityService);
        const suggestedCommunities = await communityServiceInstance.suggestCommunities(req.currentUser._id, options);
        return res.status(200).json({ suggestedCommunities });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/communities/popular-communities:
   *   get:
   *     summary: Get popular communities
   *     tags: [Communities]
   *     responses:
   *       '200':
   *         description: List of popular communities.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 communities:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Community'
   */
  route.get('/popular-communities', async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');
    logger.debug('Calling popular communities endpoint');

    try {
      const communityServiceInstance = Container.get(CommunityService);
      const communities = await communityServiceInstance.getCommunitiesByPopularity();
      return res.status(200).json({ communities });
    } catch (e) {
      logger.error('🔥 error: %o', e);
      return next(e);
    }
  });

  /**
   * @swagger
   * /api/communities/trending-communities:
   *   get:
   *     summary: Get trending communities
   *     tags: [Communities]
   *     responses:
   *       '200':
   *         description: List of trending communities.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 communities:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Community'
   */
  route.get('/trending-communities', async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');
    logger.debug('Calling trending communities endpoint');

    try {
      const communityServiceInstance = Container.get(CommunityService);
      const communities = await communityServiceInstance.getCommunitiesByTrending();
      return res.status(200).json({ communities });
    } catch (e) {
      logger.error('🔥 error: %o', e);
      return next(e);
    }
  });

  route.get('/:communityId/members', async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');

    try {
      const { page, pageSize } = req.query;
      const { communityId } = req.params;
      const options = {
        page: parseInt(page?.toString(), 10) || 1,
        pageSize: parseInt(pageSize?.toString(), 10) || 10,
      };
      const communityServiceInstance = Container.get(CommunityService);
      const members = await communityServiceInstance.getCommunityMembers(communityId, options);
      return res.status(201).json({ members });
    } catch (e) {
      logger.error('🔥 error: %o', e);
      return next(e);
    }
  });

  route.get('/:communityId', async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');

    try {
      const communityServiceInstance = Container.get(CommunityService);
      const community = await communityServiceInstance.getCommunity(req.params.communityId);
      return res.status(200).json({ community });
    } catch (e) {
      logger.error('🔥 error: %o', e);
      return next(e);
    }
  });

  /**
   * @swagger
   * /api/communities/{communityId}/report:
   *   post:
   *     summary: Report a post
   *     tags:
   *       - Communities
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: communityId
   *         schema:
   *           type: string
   *         required: true
   *         description: The ID of the community to report
   *       - in: body
   *         name: body
   *         description: The reason for reporting the community
   *         required: true
   *         schema:
   *           type: object
   *           properties:
   *             reason:
   *               type: string
   *               description: The reason for reporting the community
   *     responses:
   *       '200':
   *         description: Report submitted successfully
   *       '401':
   *         $ref: '#/components/responses/UnauthorizedError'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   */
  route.post(
    '/:communityId/report',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    celebrate({
      [Segments.PARAMS]: Joi.object({
        communityId: Joi.string().required(),
      }),
      [Segments.BODY]: Joi.object({
        reason: Joi.string(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling the Report Community endpoint');

      const { communityId } = req.params;
      const { reason } = req.body;

      try {
        const communityServiceInstance = Container.get(CommunityService);
        await communityServiceInstance.reportCommunity(communityId, req.currentUser._id, reason?.toString());

        return res.json({});
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/communities/mutual-communities/{userId}:
   *   get:
   *     summary: Get mutual communities for currently logged user and another user
   *     tags: [Communities]
   *     responses:
   *       '200':
   *         description: List of mutual communities for user with provided id
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 communities:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Community'
   */
  route.get(
    '/mutual-communities/:userId',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling mutual communities endpoint');

      try {
        const { userId } = req.params;
        const communityServiceInstance = Container.get(CommunityService);
        const communities = await communityServiceInstance.getMutualCommunities(userId, req.currentUser._id);
        return res.status(200).json({ communities });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
