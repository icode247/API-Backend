import express, { Router, Request, Response, NextFunction } from 'express';
import { celebrate, Joi, Segments } from 'celebrate';
import { Container } from 'typedi';
import { Logger } from 'winston';
import { Stripe } from 'stripe';

import middlewares from '../middlewares';
import config from '../../config';
import PaymentService from '../../services/payments';
import OrganizationService from '../../services/organization';
import { IUpdateDonationInputDTO } from '../../interfaces/IPayment';
import moment from 'moment';

const route = Router();

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default (app: Router) => {
  app.use('/donations', route);

  /**
   * @swagger
   * /api/donations/donation-details/{userId}:
   *   get:
   *     summary: Get the user's donation details
   *     tags:
   *       - Donations
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: The ID of the user.
   *     responses:
   *       200:
   *         description: Successfully swapped organization
   *       '400':
   *         $ref: '#/components/responses/BadRequest'
   */
  route.get('/donation-details/:userId', async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');
    try {
      const { userId } = req.params;

      const organizationServiceInstance = Container.get(OrganizationService);
      const result = await organizationServiceInstance.userDonationDetails(userId);
      return res.json({ result }).status(200);
    } catch (e) {
      logger.error('🔥 error: %o', e);
      return next(e);
    }
  });

  /**
   * @swagger
   * /api/donations/payment-intent:
   *   post:
   *     summary: Create a payment intent
   *     description: Endpoint to create a payment intent.
   *     security:
   *       - bearerAuth: []
   *     tags:
   *       - Donations
   *     requestBody:
   *       description: Payment intent details
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               organization:
   *                 type: string
   *                 description: The organization id. This should be passed only when the user is donating directly to a charity organization
   *               event:
   *                 type: string
   *                 description: The event id. This should be passed only if the user is donating in an event
   *               amount:
   *                 type: number
   *                 description: The payment amount. the amount should be represented in penny
   *                 required: true
   *     responses:
   *       200:
   *         description: Successful operation
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 paymentIntentId:
   *                   type: string
   *                   description: Payment intent ID
   *                 intent:
   *                   type: string
   *                   description: Payment intent secret
   *                 ephemeralKey:
   *                   type: string
   *                   description: Ephemeral key
   *                 customer:
   *                   type: string
   *                   description: Customer ID
   */
  route.post(
    '/payment-intent',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    celebrate({
      body: Joi.object({
        organization: Joi.string(),
        event: Joi.string(),
        amount: Joi.number().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');

      try {
        const { organization, event, amount } = req.body;
        const options = { organization: organization?.toString(), event: event?.toString() };
        const paymentServiceInstance = Container.get(PaymentService);
        const result = await paymentServiceInstance.paymentIntent(req.currentUser._id, amount, options);
        return res.json(result).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/donations/setup-donations:
   *   post:
   *     summary: Create a recurring donation
   *     tags:
   *       - Donations
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               amount:
   *                 type: number
   *                 minimum: 1
   *               interval:
   *                 type: string
   *                 enum: [day, week, month, year]
   *     responses:
   *       200:
   *         description: OK
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Payment subscription created successfully
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   */
  route.post(
    '/setup-donations',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    celebrate({
      body: Joi.object({
        amount: Joi.number().required(),
        interval: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');

      try {
        const { amount, interval } = req.body;
        const options = {
          interval: interval.toString(),
        };
        const paymentServiceInstance = Container.get(PaymentService);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const result = await paymentServiceInstance.paymentSubscription(req.currentUser._id, amount, options);
        return res.json(result).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/webhook',
    express.raw({ type: 'application/json' }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      const stripe: Stripe = Container.get('stripe');
      const sig = req.headers['stripe-signature'];
      let event: Stripe.Event;

      try {
        event = stripe.webhooks.constructEvent(req.body, sig, config.stripe.webhookSecret);
        const paymentServiceInstance = Container.get(PaymentService);
        const result = await paymentServiceInstance.handleWebhook(event);
        return res.json(result).status(200);
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
   *     DonationUpdate:
   *       type: object
   *       properties:
   *         amount:
   *           type: string
   *         interval:
   *           type: string
   *         freezeDonation:
   *           type: string
   *   securitySchemes:
   *     bearerAuth:
   *       type: http
   *       scheme: bearer
   *       bearerFormat: JWT
   *
   * /api/donations/edit:
   *   patch:
   *     summary: Update a donation
   *     security:
   *       - bearerAuth: []
   *     tags:
   *       - Donations
   *     parameters:
   *       - in: path
   *         name: donationId
   *         required: true
   *         schema:
   *           type: string
   *         description: The ID of the donation to be updated
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/DonationUpdate'
   *     responses:
   *       200:
   *         description: The updated donation object
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   */
  route.patch(
    '/edit',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    celebrate({
      [Segments.BODY]: Joi.object({
        amount: Joi.string(),
        interval: Joi.string(),
        freezeDonation: Joi.string(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');

      try {
        const paymentServiceInstance = Container.get(PaymentService);
        await paymentServiceInstance.updateDonation(req.currentUser._id, req.body as IUpdateDonationInputDTO);
        return res.json().status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};

/**
 * @swagger
 * /api/donations/donation-history:
 *   get:
 *     summary: Get active donations for the authenticated user over a period of time.
 *     tags:
 *       - Donations
 *     security:
 *       - bearerAuth: []
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *         description: The period of donation you want to get. Eg. week, month, year, default is month.
 *     responses:
 *       '200':
 *         description: Successful response with active donations.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 donations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: The donation ID.
 *                       organization:
 *                         type: string
 *                         description: The name of the organization the user donated to.
 *                       event:
 *                         type: string
 *                         description: The name of the event the user donated to.
 *                       amount:
 *                         type: number
 *                         format: float
 *                         description: The amount the user donated.
 *                       interval:
 *                         type: string
 *                         description: The interval the user donated at.
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: The date the donation was created.
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         description: The date the donation was last updated.
 *                 totalPages:
 *                   type: integer
 *                   description: The total number of pages of active donations.
 *                 currentPage:
 *                   type: integer
 *                   description: The current page number.
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */

route.get(
  '/donation-history',
  middlewares.isAuth,
  middlewares.attachCurrentUser,
  async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');

    try {
      const { period } = req.query;
      const userId = req.currentUser._id;

      let fromDate: Date, toDate: Date;
      switch (period) {
        case 'week':
          fromDate = moment().subtract(1, 'weeks').startOf('week').toDate();
          toDate = moment().endOf('week').toDate();
          break;
        case 'month':
          fromDate = moment().subtract(1, 'months').startOf('month').toDate();
          toDate = moment().endOf('month').toDate();
          break;
        case 'year':
          fromDate = moment().subtract(1, 'years').startOf('year').toDate();
          toDate = moment().endOf('year').toDate();
          break;
        default:
          fromDate = moment().subtract(1, 'months').startOf('month').toDate();
          toDate = moment().endOf('month').toDate();
      }

      const paymentServiceInstance = Container.get(PaymentService);
      const donations = await paymentServiceInstance.getDonationHistory(userId, fromDate, toDate);
      return res.json({ donations }).status(200);
    } catch (e) {
      logger.error('🔥 error: %o', e);
      return next(e);
    }
  },
);
