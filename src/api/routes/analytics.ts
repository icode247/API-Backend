import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import { Logger } from 'winston';
import { celebrate, Joi } from 'celebrate';
import middlewares from '../middlewares';
import { AnalyticsService } from '../../services/analytics';

const route = Router();

export default (app: Router) => {
  app.use('/analytics', route);

  /**
   * @swagger
   * /api/analytics:
   *   get:
   *     summary: Get analytics data
   *     description: Endpoint to get analytics data about user donations, charity progress, popular content, and user rewards.
   *     security:
   *       - bearerAuth: []
   *     tags:
   *       - Analytics
   *     parameters:
   *       - in: query
   *         name: userId
   *         schema:
   *           type: string
   *         required: true
   *         description: User ID for fetching user-specific analytics
   *       - in: query
   *         name: organizationId
   *         schema:
   *           type: string
   *         required: true
   *         description: Organization ID for fetching charity progress
   *     responses:
   *       200:
   *         description: Successful operation
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 userDonations:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/IDonation'
   *                 charityProgress:
   *                   type: object
   *                   properties:
   *                     fundRaised:
   *                       type: number
   *                     totalDonations:
   *                       type: number
   *                 popularContent:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/IPost'
   *                 userRewards:
   *                   $ref: '#/components/schemas/IUserReward'
   */

  route.get(
    '/',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    celebrate({
      query: Joi.object({
        userId: Joi.string().required(),
        organizationId: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      const { userId, organizationId } = req.query;

      try {
        const analyticsServiceInstance = Container.get(AnalyticsService);
        const result = await analyticsServiceInstance.getAnalytics(userId as string, organizationId as string);
        return res.json(result).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
