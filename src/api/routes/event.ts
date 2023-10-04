import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import { Logger } from 'winston';
import { celebrate, Joi, Segments } from 'celebrate';
import multer from 'multer';
import { fileFilter, s3Storage } from '../../config/multer';
import middlewares from '../middlewares';
import EventService from '../../services/event';
import { ICreateEventInputDTO } from '../../interfaces/IEvent';

const route = Router();
const upload = multer({ storage: s3Storage, fileFilter });

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default (app: Router) => {
  app.use('/events', route);
  /**
   * @swagger
   * components:
   *   schemas:
   *     Location:
   *       type: object
   *       properties:
   *         type:
   *           type: string
   *           description: The type of the location.
   *         coordinates:
   *           type: array
   *           items:
   *             type: number
   *           description: The coordinates of the location.
   *       example:
   *         type: "Point"
   *         coordinates: [ 40.748817, -73.985428 ]
   *
   *     MembersArray:
   *       type: object
   *       properties:
   *         members:
   *           type: array
   *           items:
   *             $ref: '#/components/schemas/User'
   *           description: An array of user objects.
   */

  /**
   * @swagger
   * components:
   *   schemas:
   *     Event:
   *       type: object
   *       properties:
   *         _id:
   *           type: string
   *         photo:
   *           type: string
   *         name:
   *           type: string
   *         description:
   *           type: string
   *         fundraisingGoal:
   *           type: number
   *         fundRaised:
   *           type: number
   *         interests:
   *           type: array
   *           items:
   *             type: string
   *         organization:
   *           type: string
   *         category:
   *           type: string
   *         endTime:
   *           type: string
   *         loc:
   *           $ref: '#/components/schemas/Location'
   *         members:
   *           type: array
   *           items:
   *             type: string
   *         community:
   *           $ref: '#/components/schemas/Community'
   *         admin:
   *           type: string
   *         goalReached:
   *           type: boolean
   *     EventArray:
   *       type: array
   *       items:
   *         $ref: '#/components/schemas/Event'
   */

  /**
   * @swagger
   * /api/events:
   *   post:
   *     summary: Create a new event.
   *     description: Endpoint for creating a new event.
   *     tags:
   *       - Events
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *                 required: true
   *                 description: Name of the event.
   *               description:
   *                 type: string
   *                 required: true
   *                 description: Description of the event.
   *               fundraisingGoal:
   *                 type: string
   *                 required: true
   *                 description: Fundraising goal of the event.
   *               interest:
   *                 type: string
   *                 required: true
   *                 description: Interest of the event.
   *               organization:
   *                 type: string
   *                 required: true
   *                 description: Organization of the event.
   *               category:
   *                 type: string
   *                 required: true
   *                 description: Category of the event.
   *               endTime:
   *                 type: string
   *                 required: true
   *                 description: End time of the event.
   *               address:
   *                 type: string
   *                 description: Event address.
   *               communityId:
   *                 type: string
   *                 description: ID of the community the event belongs to.
   *               photo:
   *                 type: string
   *                 format: binary
   *                 description: Event photo.
   *     responses:
   *       201:
   *         description: Event created successfully.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 event:
   *                   $ref: '#/components/schemas/Event'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   */
  route.post(
    '/',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    upload.single('photo'),
    celebrate({
      body: Joi.object({
        name: Joi.string().required(),
        description: Joi.string().required(),
        fundraisingGoal: Joi.number().required(),
        interests: Joi.array().items().min(1),
        organization: Joi.string().required(),
        endTime: Joi.string().required(),
        address: Joi.string(),
        communityId: Joi.string(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling create Event endpoint');

      try {
        const eventServiceInstance = Container.get(EventService);
        const event = await eventServiceInstance.createEvent(
          req.body as ICreateEventInputDTO,
          req.file as Multer.File,
          req.currentUser._id,
        );
        return res.status(201).json({ event });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/events/joined/{userId}:
   *   get:
   *     summary: Get all events joined by a user
   *     tags:
   *       - Events
   *     parameters:
   *       - in: query
   *         name: searchQuery
   *         schema:
   *           type: string
   *         description: Optional search query parameter for filtering events
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID of the user whose events are to be fetched
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
   *     responses:
   *       200:
   *         description: OK
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 events:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Event'
   *               example:
   *                 events:
   *                   - _id: 1234567890abcdef
   *                     photo: "https://www.example.com/image.jpg"
   *                     name: "Event Name"
   *                     description: "Event description"
   *                     fundraisingGoal: 1000
   *                     fundRaised: 500
   *                     interest: "Science"
   *                     organization: "Example Organization"
   *                     category: "Education"
   *                     endTime: "2023-05-01T12:00:00Z"
   *                     loc:
   *                       type: "Point"
   *                       coordinates: [-122.4194, 37.7749]
   *                     members:
   *                       - "member1"
   *                       - "member2"
   *                     community:
   *                       admin: "admin1"
   *                       _id: "community1"
   *                       name: "Community Name"
   *                       description: "Community description"
   *                       members:
   *                         - "member1"
   *                         - "member2"
   *                       invitees:
   *                         - "invitee1"
   *                         - "invitee2"
   *                       events:
   *                         - "event1"
   *                         - "event2"
   *                     admin: "admin1"
   *                     goalReached: false
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   */
  route.get(
    '/joined/:userId',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    celebrate({
      [Segments.PARAMS]: Joi.object({
        userId: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');

      try {
        const { page, pageSize, searchQuery } = req.query;
        const options = {
          page: parseInt(page?.toString(), 10) || 1,
          pageSize: parseInt(pageSize?.toString(), 10) || 10,
          userId: req.params.userId.toString(),
          searchQuery: searchQuery?.toString(),
        };

        const eventServiceInstance = Container.get(EventService);
        const events = await eventServiceInstance.getJoinedEvents(options);
        return res.json({ events }).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/events/community-events/{communityId}:
   *   get:
   *     summary: Get events for a community
   *     description: Retrieve events for a community based on communityId and pagination options.
   *     tags:
   *       - Events
   *     parameters:
   *       - in: query
   *         name: searchQuery
   *         schema:
   *           type: string
   *         description: Optional search query parameter for filtering events
   *       - in: path
   *         name: communityId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID of the community to retrieve events for
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           description: Page number for pagination. Default is 1.
   *       - in: query
   *         name: pageSize
   *         schema:
   *           type: integer
   *           description: Number of events to retrieve per page. Default is 10.
   *     responses:
   *       '200':
   *         description: A list of events for the specified community
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/EventArray'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   */
  route.get(
    '/community-events/:communityId',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    celebrate({
      [Segments.PARAMS]: Joi.object({
        communityId: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');

      try {
        const { page, pageSize, searchQuery } = req.query;
        const options = {
          page: parseInt(page?.toString(), 10) || 1,
          pageSize: parseInt(pageSize?.toString(), 10) || 10,
          communityId: req.params.communityId.toString(),
          searchQuery: searchQuery?.toString(),
        };

        const eventServiceInstance = Container.get(EventService);
        const events = await eventServiceInstance.getCommunityEvents(options);
        return res.json({ events }).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/events/trending-events:
   *   get:
   *     summary: Get trending events
   *     description: Retrieves the most trending events
   *     tags:
   *       - Events
   *     responses:
   *       '200':
   *         description: A list of trending events
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 events:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Event'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   */
  route.get('/trending-events', async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');

    try {
      const eventServiceInstance = Container.get(EventService);
      const events = await eventServiceInstance.getTrendingEvents();
      return res.json({ events }).status(200);
    } catch (e) {
      logger.error('🔥 error: %o', e);
      return next(e);
    }
  });

  /**
   * @swagger
   * /api/events:
   *   get:
   *     summary: Get events.
   *     description: Retrieve a list of events.
   *     tags:
   *       - Events
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: searchQuery
   *         schema:
   *           type: string
   *         description: Optional search query parameter for filtering events
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *         description: Page number.
   *       - in: query
   *         name: pageSize
   *         schema:
   *           type: integer
   *         description: Page size.
   *       - in: query
   *         name: userId
   *         schema:
   *           type: string
   *         description: When this is provided, it filters events base on the ones created by the user.
   *     responses:
   *       '200':
   *         description: OK.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 events:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Event'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   */
  route.get(
    '/',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');

      try {
        const { page, pageSize, userId, searchQuery } = req.query;
        const options = {
          page: parseInt(page?.toString(), 10) || 1,
          pageSize: parseInt(pageSize?.toString(), 10) || 10,
          userId: userId?.toString(),
          searchQuery: searchQuery?.toString(),
        };

        const eventServiceInstance = Container.get(EventService);
        const events = await eventServiceInstance.getEvents(options);
        return res.json({ events }).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/events/{eventId}:
   *   get:
   *     summary: Get a specific event
   *     tags:
   *       - Events
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: eventId
   *         schema:
   *           type: string
   *         required: true
   *         description: ID of the event to get
   *     responses:
   *       201:
   *         description: OK
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 event:
   *                   $ref: '#/components/schemas/Event'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   */
  route.get(
    '/:eventId',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    celebrate({
      [Segments.PARAMS]: Joi.object({
        eventId: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling get event endpoint');

      try {
        const eventServiceInstance = Container.get(EventService);
        const event = await eventServiceInstance.getEvent(req.params.eventId);
        return res.status(201).json({ event });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/events/{eventId}:
   *   patch:
   *     summary: Update an event
   *     tags:
   *       - Events
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: eventId
   *         schema:
   *           type: string
   *         required: true
   *         description: The ID of the event to update
   *       - in: formData
   *         name: photo
   *         type: file
   *         description: The photo for the event
   *       - in: body
   *         name: event
   *         schema:
   *           type: object
   *           properties:
   *             name:
   *               type: string
   *               description: The name of the event
   *             description:
   *               type: string
   *               description: The description of the event
   *             fundraisingGoal:
   *               type: number
   *               description: The fundraising goal for the event
   *             interest:
   *               type: string
   *               description: The interest of the event
   *             category:
   *               type: string
   *               description: The category of the event
   *             endTime:
   *               type: string
   *               description: The end time of the event
   *             latitude:
   *               type: number
   *               description: The latitude of the location of the event
   *             longitude:
   *               type: number
   *               description: The longitude of the location of the event
   *           required:
   *             - name
   *             - description
   *             - fundraisingGoal
   *             - interest
   *             - category
   *             - endTime
   *     responses:
   *       201:
   *         description: The updated event
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 event:
   *                   $ref: '#/components/schemas/Event'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   */
  route.patch(
    '/:eventId',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    upload.single('photo'),
    celebrate({
      [Segments.BODY]: Joi.object({
        name: Joi.string().required(),
        description: Joi.string().required(),
        fundraisingGoal: Joi.number().required(),
        interests: Joi.array().items(),
        endTime: Joi.string().required(),
        address: Joi.string().required(),
      }),
      [Segments.PARAMS]: Joi.object({
        eventId: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');

      try {
        const eventServiceInstance = Container.get(EventService);
        const event = await eventServiceInstance.updateEvent(
          req.params.eventId,
          req.body as Partial<ICreateEventInputDTO>,
          req.file as Multer.File,
          req.currentUser._id,
        );
        return res.status(201).json({ event });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/events/{eventId}/add-members:
   *   post:
   *     summary: Add members to an event
   *     tags:
   *       - Events
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: eventId
   *         required: true
   *         schema:
   *           type: string
   *         description: The ID of the event to add members to
   *       - in: body
   *         name: body
   *         description: Member IDs to add to the event
   *         required: true
   *         schema:
   *           type: object
   *           properties:
   *             memberIds:
   *               type: array
   *               items:
   *                 type: string
   *               minItems: 1
   *               maxItems: 10
   *         example:
   *           memberIds: ["memberId1", "memberId2"]
   *     responses:
   *       201:
   *         description: The updated event with added members
   *         schema:
   *           $ref: '#/components/schemas/Event'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   */
  route.post(
    '/:eventId/add-members',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    celebrate({
      body: Joi.object({
        memberIds: Joi.array().items(Joi.string().trim().min(1).max(50)).min(1).max(10).required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');

      try {
        const eventServiceInstance = Container.get(EventService);
        const event = await eventServiceInstance.addMembers(
          req.body as Partial<ICreateEventInputDTO>,
          req.params.eventId,
          req.currentUser._id,
        );

        return res.status(201).json({ event });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/events/{eventId}/join-events:
   *   post:
   *     summary: Join events
   *     tags:
   *       - Events
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: eventId
   *         required: true
   *         schema:
   *           type: string
   *         description: The ID of the event to join
   *     responses:
   *       201:
   *         description: The updated event with added members
   *         schema:
   *           $ref: '#/components/schemas/Event'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   */
  route.post(
    '/:eventId/join-events',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');

      try {
        const eventServiceInstance = Container.get(EventService);
        const event = await eventServiceInstance.joinEvent(req.params.eventId, req.currentUser._id);
        return res.status(201).json({ event });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/events/members-details/{userIds}:
   *   get:
   *     summary: Get details of each members in each events
   *     tags:
   *       - Events
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: userIds
   *         schema:
   *           type: string
   *         required: true
   *         description: Comma-separated ID's of the members of each event
   *     responses:
   *       201:
   *         description: OK
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 members:
   *                   $ref: '#/components/schemas/MembersArray'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   */
  route.get(
    '/:userIds',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    celebrate({
      [Segments.PARAMS]: Joi.object({
        eventId: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling get event members details endpoint');

      try {
        const eventServiceInstance = Container.get(EventService);
        const membersDetails = await eventServiceInstance.getEvent(req.params.userIds);
        return res.status(201).json({ membersDetails });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
