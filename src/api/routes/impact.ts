import { Router, Request, Response } from 'express';
import { celebrate, Joi } from 'celebrate';
import { Container } from 'typedi';
import { ImpactService } from '../../services/impact';
import middlewares from '../middlewares';

const route = Router();

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default (app: Router) => {
  app.use('/users', route);

  /**
   * @swagger
   * components:
   *   schemas:
   *     ImpactData:
   *       type: object
   *       properties:
   *         totalDonated:
   *           type: number
   *           description: The total amount donated by the user.
   *         donationsOverTime:
   *           type: object
   *           description: A mapping of donations by month and year.
   *           additionalProperties:
   *             type: number
   *         causesSupported:
   *           type: array
   *           description: A list of causes supported by the user.
   *           items:
   *             type: object
   *             properties:
   *               organization:
   *                 type: string
   *                 description: The name of the organization.
   *               amountDonated:
   *                 type: number
   *                 description: The amount donated to the organization.
   *         impact:
   *           type: array
   *           description: A list of impact stories or testimonials.
   *           items:
   *             type: object
   *             properties:
   *               title:
   *                 type: string
   *                 description: The title of the story or testimonial.
   *               description:
   *                 type: string
   *                 description: The text of the story or testimonial.
   *               image:
   *                 type: string
   *                 description: A URL for an image related to the story or testimonial.
   *         achievements:
   *           type: array
   *           description: A list of achievements or badges earned by the user.
   *           items:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *                 description: The name of the achievement or badge.
   *               description:
   *                 type: string
   *                 description: A brief description of the achievement or badge.
   *               image:
   *                 type: string
   *                 description: A URL for an image representing the achievement or badge.
   */

  /**
   * @swagger
   * /api/users/{userId}/impact:
   *   get:
   *     summary: Get user impact data
   *     description: Get impact data for a specific user.
   *     security:
   *       - bearerAuth: []
   *     tags:
   *       - Users
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *         description: The ID of the user to retrieve impact data for.
   *     responses:
   *       200:
   *         description: Successful operation
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ImpactData'
   *       404:
   *         description: User not found
   */

  route.get(
    '/:userId/impact',
    middlewares.isAuth,
    middlewares.attachCurrentUser,
    celebrate({
      params: Joi.object({
        userId: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response) => {
      const impactServiceInstance = Container.get(ImpactService);
      const impact = await impactServiceInstance.getUserImpact(req.params.userId);
      return res.json(impact);
    },
  );
};
