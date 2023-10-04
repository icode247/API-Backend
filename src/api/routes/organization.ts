import { Router, Request, Response, NextFunction } from 'express';
import { celebrate, Joi } from 'celebrate';
import { Container } from 'typedi';
import multer from 'multer';
import { fileFilter, s3Storage } from '../../config/multer';
import OrganizationService from '../../services/organization';
import EventService from '../../services/event';
import { ICreateOrganizationInputDTO } from '../../interfaces/IOrganization';
import middlewares from '../middlewares';
import { Logger } from 'winston';

const route = Router();
const upload = multer({ storage: s3Storage, fileFilter });

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default (app: Router) => {
  app.use('/organizations', route);

  /**
   * @swagger
   * /api/organizations:
   *   get:
   *     summary: Get a list of organizations
   *     description: Retrieve a list of organizations with an optional search query parameter
   *     tags:
   *       - Organizations
   *     parameters:
   *       - in: query
   *         name: searchQuery
   *         schema:
   *           type: string
   *         description: Optional search query parameter for filtering organizations
   *       - in: query
   *         name: interestFilter
   *         schema:
   *           type: string
   *         description: Optional field for filtering organizations based on interests, multiple interests can be passed as a comma separated value like - '60df68f6b52d6e0015eb9b1a'
   *       - in: query
   *         name: page
   *         schema:
   *           type: number
   *         description: Optional page parameter for filtering organizations
   *       - in: query
   *         name: pageSize
   *         schema:
   *           type: number
   *         description: Optional pageSize parameter for filtering organizations to limit the number records returned
   *     responses:
   *       '200':
   *         description: A list of organizations
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   _id:
   *                     type: string
   *                     description: The unique identifier of the organization
   *                   userId:
   *                     type: string
   *                     description: The unique identifier of the user associated with the organization
   *                   name:
   *                     type: string
   *                     description: The name of the organization
   *                   logo:
   *                     type: string
   *                     description: The URL of the organization's logo
   *                   charityRegNumber:
   *                     type: string
   *                     description: The registration number of the organization as a charity
   *                   email:
   *                     type: string
   *                     description: The email address of the organization
   *                   postalCode:
   *                     type: string
   *                     description: The postal code of the organization's location
   *                   country:
   *                     type: string
   *                     description: The country of the organization's location
   *                   city:
   *                     type: string
   *                     description: The city of the organization's location
   *                   address:
   *                     type: string
   *                     description: The address of the organization
   *                   loc:
   *                     type: object
   *                     description: The location object of the organization (latitude and longitude)
   *                     properties:
   *                       lat:
   *                         type: number
   *                         description: The latitude of the organization's location
   *                       long:
   *                         type: number
   *                         description: The longitude of the organization's location
   *                   interests:
   *                     type: array
   *                     items:
   *                       type: string
   *                     description: An array of the organization's interests
   *                   description:
   *                     type: string
   *                     description: The description of the organization
   *                   bankAccountName:
   *                     type: string
   *                     description: The name on the bank account of the organization
   *                   bankAccountNumber:
   *                     type: string
   *                     description: The bank account number of the organization
   *                   bankName:
   *                     type: string
   *                     description: The name of the organization's bank
   *       '400':
   *         description: Bad request
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: object
   *                   properties:
   *                     statusCode:
   *                       type: integer
   *                     message:
   *                       type: string
   *                     details:
   *                       type: object
   *                       properties:
   *                         message:
   *                           type: string
   */
  route.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, pageSize, searchQuery, interestFilter } = req.query;
      const options = {
        page: parseInt(page?.toString(), 10) || 1,
        pageSize: parseInt(pageSize?.toString(), 10) || 10,
        searchQuery,
        interestFilter: interestFilter?.toString().split(','),
      };
      const organizationServiceInstance = Container.get(OrganizationService);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const organizations = await organizationServiceInstance.getOrganizations(options);
      return res.json(organizations).status(200);
    } catch (e) {
      return next(e);
    }
  });

  /**
   * @swagger
   * /api/organizations/organization-events/{organizationId}:
   *   get:
   *     summary: Get a list of events for a specific organization
   *     description: Returns a list of events for the specified organization ID, with optional pagination parameters.
   *     tags:
   *       - Organizations
   *     parameters:
   *       - in: path
   *         name: organizationId
   *         schema:
   *           type: string
   *         required: true
   *         description: ID of the organization to retrieve events for
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Page number of the results to return
   *       - in: query
   *         name: pageSize
   *         schema:
   *           type: integer
   *           default: 10
   *         description: Number of results per page
   *     responses:
   *       200:
   *         description: Successful response, returns an array of events
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/EventArray'
   *       404:
   *         description: The specified organization ID was not found
   */
  route.get('/organization-events/:organizationId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, pageSize } = req.query;
      const { id } = req.params;

      const options = {
        page: parseInt(page?.toString(), 10) || 1,
        pageSize: parseInt(pageSize?.toString(), 10) || 10,
      };
      const eventServiceInstance = Container.get(EventService);
      const events = await eventServiceInstance.getOrganizationEvents(id, options);
      return res.json(events).status(200);
    } catch (e) {
      return next(e);
    }
  });

  /**
   * @swagger
   * components:
   *   schemas:
   *     Organization:
   *       type: object
   *       properties:
   *         name:
   *           type: string
   *         charityRegNumber:
   *           type: string
   *         email:
   *           type: string
   *         postalCode:
   *           type: string
   *         country:
   *           type: string
   *         city:
   *           type: string
   *         address:
   *           type: string
   *         latitude:
   *           type: string
   *         longitude:
   *           type: string
   *         interests:
   *           type: array
   *           items:
   *             type: string
   *           minItems: 1
   *           maxItems: 10
   *         description:
   *           type: string
   *         bankAccountName:
   *           type: string
   *         bankAccountNumber:
   *           type: string
   *         bankName:
   *           type: string
   *
   *   securitySchemes:
   *     bearerAuth:
   *       type: http
   *       scheme: bearer
   *       bearerFormat: JWT
   *
   * security:
   *   - bearerAuth: []
   *
   * /api/organizations:
   *   post:
   *     summary: Create a new organization
   *     description: Creates a new organization with the given details.
   *     tags:
   *       - Organizations
   *     consumes:
   *       - multipart/form-data
   *     requestBody:
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               charityRegNumber:
   *                 type: string
   *               email:
   *                 type: string
   *               postalCode:
   *                 type: string
   *               country:
   *                 type: string
   *               city:
   *                 type: string
   *               address:
   *                 type: string
   *               latitude:
   *                 type: number
   *               longitude:
   *                 type: number
   *               interests:
   *                 type: array
   *                 items:
   *                   type: string
   *                 minItems: 1
   *                 maxItems: 10
   *               description:
   *                 type: string
   *               bankAccountName:
   *                 type: string
   *               bankAccountNumber:
   *                 type: string
   *               bankName:
   *                 type: string
   *               logo:
   *                 type: string
   *                 format: binary
   *             required:
   *               - name
   *               - email
   *               - charityRegNumber
   *               - logo
   *               - interests
   *     responses:
   *       '201':
   *         description: Created
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 organization:
   *                   $ref: '#/components/schemas/Organization'
   *       '400':
   *         description: Bad request
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: object
   *                   properties:
   *                     statusCode:
   *                       type: integer
   *                     message:
   *                       type: string
   *                     details:
   *                       type: object
   *                       properties:
   *                         message:
   *                           type: string
   */
  route.post(
    '/',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    middlewares.isAdmin,
    upload.single('logo'),
    celebrate({
      body: Joi.object({
        name: Joi.string().required(),
        charityRegNumber: Joi.string().required(),
        email: Joi.string().required(),
        postalCode: Joi.string(),
        country: Joi.string(),
        city: Joi.string(),
        latitude: Joi.number(),
        longitude: Joi.number(),
        interests: Joi.array().items().min(1).required(),
        description: Joi.string(),
        bankAccountName: Joi.string(),
        bankAccountNumber: Joi.string(),
        bankName: Joi.string(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling Create-New-Organization endpoint with body: %o', req.body);
      try {
        const organizationServiceInstance = Container.get(OrganizationService);
        const organization = await organizationServiceInstance.createOrganization(
          req.body as ICreateOrganizationInputDTO,
          req.file as Multer.File,
        );
        return res.status(201).json({ organization });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/organizations/by-location:
   *   get:
   *     summary: Get organizations by location
   *     tags:
   *       - Organizations
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *         description: The page number for pagination
   *       - in: query
   *         name: pageSize
   *         schema:
   *           type: integer
   *           minimum: 1
   *         description: The number of organizations per page
   *       - in: query
   *         name: latitude
   *         schema:
   *           type: number
   *           format: float
   *           minimum: -90
   *           maximum: 90
   *         description: The latitude of the location
   *       - in: query
   *         name: longitude
   *         schema:
   *           type: number
   *           format: float
   *           minimum: -180
   *           maximum: 180
   *         description: The longitude of the location
   *     responses:
   *       200:
   *         description: OK
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 organizations:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Organization'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   */
  route.get('/by-location', async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');
    try {
      const { page, pageSize, latitude, longitude } = req.query;
      if (!latitude || !longitude) {
        return res.json({ organizations: [] }).status(200);
      }

      const loc = {
        type: 'Point',
        coordinates: [Number(longitude.toString()), Number(latitude.toString())],
      };

      const options = {
        page: parseInt(page?.toString(), 10) || 1,
        pageSize: parseInt(pageSize?.toString(), 10) || 10,
        loc,
      };

      const organizationServiceInstance = Container.get(OrganizationService);
      const organizations = await organizationServiceInstance.GetOrganizationsByLocation(options);
      return res.json({ organizations }).status(200);
    } catch (e) {
      logger.error('🔥 error: %o', e);
      return next(e);
    }
  });

  /**
   * @swagger
   * /api/organizations/suggested-organizations:
   *   get:
   *     summary: Get a list of suggested organizations based on user's interest
   *     security:
   *       - bearerAuth: []
   *     tags:
   *       - Organizations
   *     responses:
   *       200:
   *         description: OK
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Organization'
   *       '400':
   *         description: Bad request
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: object
   *                   properties:
   *                     statusCode:
   *                       type: integer
   *                     message:
   *                       type: string
   *                     details:
   *                       type: object
   *                       properties:
   *                         message:
   *                           type: string
   */
  route.get(
    '/suggested-organizations',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const { page, pageSize } = req.query;
        const options = {
          page: parseInt(page?.toString(), 10) || 1,
          pageSize: parseInt(pageSize?.toString(), 10) || 10,
          user: req.currentUser,
        };

        const organizationServiceInstance = Container.get(OrganizationService);
        const organizations = await organizationServiceInstance.SuggestedOrganizations(options);
        return res.json({ organizations }).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/organizations/swap-organization:
   *   post:
   *     summary: Swap organization
   *     tags: [Organizations]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               newOrganizationId:
   *                 type: string
   *               currentOrganizationId:
   *                 type: string
   *             required:
   *               - newOrganizationId
   *               - currentOrganizationId
   *     responses:
   *       201:
   *         description: Successfully swapped organization
   *       500:
   *         description: Internal server error
   */
  route.post(
    '/swap-organization',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    celebrate({
      body: Joi.object({
        newOrganizationId: Joi.string().required(),
        currentOrganizationId: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const { newOrganizationId, currentOrganizationId } = req.body;
        const organizationServiceInstance = Container.get(OrganizationService);
        await organizationServiceInstance.swagOrganization(
          newOrganizationId,
          currentOrganizationId,
          req.currentUser._id,
        );
        return res.status(201).json({});
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/organizations/follow-organization/{organizationId}:
   *   post:
   *     summary: Follow organization
   *     tags: [Organizations]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: organizationId
   *         schema:
   *           type: string
   *         required: true
   *         description: ID of the organization to follow
   *     responses:
   *       201:
   *         description: Successfully followed organization
   *       500:
   *         description: Internal server error
   */
  route.post(
    '/follow-organization/:organizationId',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const { organizationId } = req.params;
        const organizationServiceInstance = Container.get(OrganizationService);
        await organizationServiceInstance.followOrganization(organizationId, req.currentUser._id);
        return res.status(201).json({});
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/organizations/unfollow-organization/{organizationId}:
   *   post:
   *     summary: Unfollow organization
   *     tags: [Organizations]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: organizationId
   *         schema:
   *           type: string
   *         required: true
   *         description: ID of the organization to unfollow
   *     responses:
   *       201:
   *         description: Successfully unfollowed organization
   *       500:
   *         description: Internal server error
   */
  route.post(
    '/unfollow-organization/:organizationId',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const { organizationId } = req.params;
        const organizationServiceInstance = Container.get(OrganizationService);
        await organizationServiceInstance.unfollowOrganization(organizationId, req.currentUser._id);
        return res.status(201).json({});
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
   *     Organization:
   *       type: object
   *       properties:
   *         name:
   *           type: string
   *         charityRegNumber:
   *           type: string
   *         email:
   *           type: string
   *         postalCode:
   *           type: string
   *         country:
   *           type: string
   *         city:
   *           type: string
   *         latitude:
   *           type: string
   *         longitude:
   *           type: string
   *         interests:
   *           type: array
   *           items:
   *             type: string
   *           minItems: 1
   *           maxItems: 10
   *         description:
   *           type: string
   *         bankAccountName:
   *           type: string
   *         bankAccountNumber:
   *           type: string
   *         bankName:
   *           type: string
   *
   * /api/organizations/{id}:
   *   get:
   *     summary: Get organization details by ID
   *     description: Returns the organization details for the given ID.
   *     tags:
   *       - Organizations
   *     parameters:
   *       - in: path
   *         name: id
   *         description: ID of the organization to get
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: OK
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 organization:
   *                   $ref: '#/components/schemas/Organization'
   *       '400':
   *         description: Bad request
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: object
   *                   properties:
   *                     statusCode:
   *                       type: integer
   *                     message:
   *                       type: string
   *                     details:
   *                       type: object
   *                       properties:
   *                         message:
   *                           type: string
   */
  route.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');
    try {
      const { id } = req.params;

      const organizationServiceInstance = Container.get(OrganizationService);
      const organization = await organizationServiceInstance.getOrganization(id);
      return res.json({ organization }).status(200);
    } catch (e) {
      logger.error('🔥 error: %o', e);
      return next(e);
    }
  });

  /**
   * @swagger
   * /api/organizations/{id}:
   *   patch:
   *     summary: Update an organization.
   *     description: Allows an admin user to update the details of an organization.
   *     tags:
   *       - Organizations
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         description: The ID of the organization to update.
   *         schema:
   *           type: string
   *     requestBody:
   *       required: false
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               charityRegNumber:
   *                 type: string
   *               email:
   *                 type: string
   *               interests:
   *                 type: array
   *                 items:
   *                   type: string
   *                   minLength: 1
   *                   maxLength: 50
   *                 minItems: 1
   *                 maxItems: 10
   *               description:
   *                 type: string
   *               bankAccountName:
   *                 type: string
   *               bankAccountNumber:
   *                 type: string
   *               bankName:
   *                 type: string
   *               logo:
   *                 type: string
   *                 format: binary
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               charityRegNumber:
   *                 type: string
   *               email:
   *                 type: string
   *               interests:
   *                 type: array
   *                 items:
   *                   type: string
   *                   minLength: 1
   *                   maxLength: 50
   *                 minItems: 1
   *                 maxItems: 10
   *               description:
   *                 type: string
   *               bankAccountName:
   *                 type: string
   *               bankAccountNumber:
   *                 type: string
   *               bankName:
   *                 type: string
   *     responses:
   *       200:
   *         description: The updated organization.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 organization:
   *                   $ref: '#/components/schemas/Organization'
   *       '400':
   *         description: Bad request
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: object
   *                   properties:
   *                     statusCode:
   *                       type: integer
   *                     message:
   *                       type: string
   *                     details:
   *                       type: object
   *                       properties:
   *                         message:
   *                           type: string
   */
  route.patch(
    '/:id',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    middlewares.isAdmin,
    upload.single('logo'),
    celebrate({
      body: Joi.object({
        name: Joi.string(),
        charityRegNumber: Joi.string(),
        email: Joi.string(),
        interests: Joi.array().items(Joi.string().trim().min(1).max(50)).min(1).max(10),
        description: Joi.string(),
        bankAccountName: Joi.string(),
        bankAccountNumber: Joi.string(),
        bankName: Joi.string(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling Update-organization endpoint with body: %o', req.body);
      try {
        const organizationServiceInstance = Container.get(OrganizationService);
        const organization = await organizationServiceInstance.updateOrganization(
          req.params.id,
          req.body as Partial<ICreateOrganizationInputDTO>,
          req.file as Multer.File,
        );
        return res.json({ organization }).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
