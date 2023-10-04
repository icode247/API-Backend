import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import AuthService from '../../services/auth';
import {
  IEmailSignupInputDTO,
  IVerifyOTPInputDTO,
  IPasswordResetInputDTO,
  IPhoneSigninInputDTO,
} from '../../interfaces/IUser';
import middlewares from '../middlewares';
import { celebrate, Joi } from 'celebrate';
import { Logger } from 'winston';

const route = Router();
const ALLOWED_MAIL_DOMAINS = ['com', 'net', 'io', 'me', 'co'];
const EMAIL_VALIDATION_OPTIONS = { minDomainSegments: 2, tlds: { allow: ALLOWED_MAIL_DOMAINS } };

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default (app: Router) => {
  app.use('/auth', route);

  /**
   * @swagger
   * /api/auth/email-signup:
   *   post:
   *     summary: Register a new user by email
   *     tags:
   *       - Authentication
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               fullname:
   *                 type: string
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *             required:
   *               - fullname
   *               - email
   *               - password
   *     responses:
   *       '201':
   *         description: User created successfully
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
    '/email-signup',
    celebrate({
      body: Joi.object({
        fullname: Joi.string().required(),
        email: Joi.string().required().email(EMAIL_VALIDATION_OPTIONS),
        password: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling Sign-Up endpoint with body: %o', req.body);
      try {
        const authServiceInstance = Container.get(AuthService);
        await authServiceInstance.SignUp(req.body as IEmailSignupInputDTO);
        return res.status(201).json({});
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/auth/phone-signin:
   *   post:
   *     summary: Sign in with phone number
   *     tags:
   *       - Authentication
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               phone:
   *                 type: string
   *                 description: Phone number to sign in with
   *               callingCode:
   *                 type: string
   *                 description: The calling code for the user's phone number (calling code should be without the `+` prefix)
   *             required:
   *               - phone
   *               - callingCode
   *     responses:
   *       '201':
   *         description: Phone signin successful
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
    '/phone-signin',
    celebrate({
      body: Joi.object({
        phone: Joi.string().required(),
        callingCode: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling Phone-Singin endpoint with body: %o', req.body);
      try {
        const authServiceInstance = Container.get(AuthService);
        await authServiceInstance.PhoneSignin(req.body as IPhoneSigninInputDTO);
        return res.status(201).json({});
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/auth/verify-otp:
   *   post:
   *     summary: Verify OTP
   *     description: Endpoint to verify OTP
   *     tags:
   *       - Authentication
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               otp:
   *                 type: string
   *                 required: true
   *                 description: The OTP to verify
   *               phoneOrEmail:
   *                 type: string
   *                 required: true
   *                 description: The phone number or email associated with the OTP
   *             example:
   *               otp: "123456"
   *               phoneOrEmail: "john@example.com"
   *     responses:
   *       200:
   *         description: Successful response
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 user:
   *                   $ref: '#/components/schemas/User'
   *                 token:
   *                   type: string
   *                   description: The JWT token generated after successful OTP verification
   *             example:
   *               user:
   *                 id: "1234567890"
   *                 fullname: "John Doe"
   *                 email: "john@example.com"
   *                 phone: "+1234567890"
   *               token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
   *       400:
   *         description: Bad request response
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
   *                       description: The HTTP status code of the error
   *                     message:
   *                       type: string
   *                       description: The message of the error
   *                     details:
   *                       type: object
   *                       properties:
   *                         message:
   *                           type: string
   *                           description: The details of the error
   *               example:
   *                 error:
   *                   statusCode: 400
   *                   message: Bad Request
   *                   details:
   *                     message: "Invalid OTP"
   */
  route.post(
    '/verify-otp',
    celebrate({
      body: Joi.object({
        otp: Joi.string().required(),
        phoneOrEmail: Joi.string().required(),
        fcm_token: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling Verify-OTP endpoint with body: %o', req.body);
      try {
        const authServiceInstance = Container.get(AuthService);
        const { user, token } = await authServiceInstance.VerifyOTP(req.body as IVerifyOTPInputDTO);
        return res.status(200).json({ user, token });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   * /api/auth/email-signin:
   *   post:
   *     summary: Email Signin
   *     description: Endpoint for email signin
   *     tags:
   *       - Authentication
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
   *                           example: Invalid email or password
   */
  route.post(
    '/email-signin',
    celebrate({
      body: Joi.object({
        email: Joi.string().required().email(EMAIL_VALIDATION_OPTIONS),
        password: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling Email-Signin endpoint with body: %o', req.body);
      try {
        const { email, password, fcm_token } = req.body;
        const authServiceInstance = Container.get(AuthService);
        await authServiceInstance.EmailSignin(email, password);
        return res.status(200).json({});
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   *
   * /api/auth/google-signin:
   *   post:
   *     summary: Sign in with Google
   *     tags:
   *       - Authentication
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               token:
   *                 type: string
   *                 required: true
   *                 description: Google access token
   *     responses:
   *       200:
   *         description: Successful response
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 user:
   *                   $ref: '#/components/schemas/User'
   *                 token:
   *                   type: string
   *                   description: The JWT token generated after successful OTP verification
   *             example:
   *               user:
   *                 id: "1234567890"
   *                 fullname: "John Doe"
   *                 email: "john@example.com"
   *                 phone: "+1234567890"
   *               token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
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
   *                           example: Invalid access token
   */
  route.post(
    '/google-signin',
    celebrate({
      body: Joi.object({
        token: Joi.string().required(),
        fcm_token: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling Google-Signin endpoint with body: %o', req.body);
      try {
        const { token, fcm_token } = req.body;
        const authServiceInstance = Container.get(AuthService);
        const { user, jwtToken } = await authServiceInstance.GoogleSignin(token, fcm_token);
        return res.status(200).json({ user, token: jwtToken });
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   *
   * /api/auth/password-reset-request:
   *   post:
   *     summary: Send password reset request
   *     description: Send a password reset request to the given email address.
   *     tags:
   *       - Authentication
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
   *                 description: The email address to send the password reset request.
   *                 example: user@example.com
   *             required:
   *               - email
   *     responses:
   *       200:
   *         description: Password reset request sent successfully.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   description: The success message.
   *                   example: Password reset request sent successfully.
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
   *                           example: An account with this email address does not exist
   */
  route.post(
    '/password-reset-request',
    celebrate({
      body: Joi.object({
        email: Joi.string().required().email(EMAIL_VALIDATION_OPTIONS),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling Password-Reset-Request endpoint with body: %o', req.body);
      try {
        const { email } = req.body;
        const authServiceInstance = Container.get(AuthService);
        await authServiceInstance.PasswordResetRequest(email);
        return res.status(200).json({});
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   *
   * /api/auth/password-reset:
   *   post:
   *     summary: Reset password
   *     description: Resets user's password using the reset code sent to their email.
   *     tags:
   *       - Authentication
   *     requestBody:
   *       description: User's email, reset code and new password
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               resetCode:
   *                 type: string
   *               password:
   *                 type: string
   *             required:
   *               - email
   *               - resetCode
   *               - password
   *     responses:
   *       '200':
   *         description: Password reset successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Password reset successful
   *                 data:
   *                   type: object
   *                   properties: {}
   *                   example: {}
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
   *                           example: Invalid reset code
   */
  route.post(
    '/password-reset',
    celebrate({
      body: Joi.object({
        email: Joi.string().required().email(EMAIL_VALIDATION_OPTIONS),
        resetCode: Joi.string().required(),
        password: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      logger.debug('Calling Password-Reset endpoint with body: %o', req.body);
      try {
        const authServiceInstance = Container.get(AuthService);
        await authServiceInstance.PasswordReset(req.body as IPasswordResetInputDTO);
        return res.status(200).json({});
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  /**
   * @swagger
   *
   * /api/auth/logout:
   *   post:
   *     summary: User logout endpoint.
   *     description: Endpoint for logging out authenticated users.
   *     tags:
   *       - Authentication
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User successfully logged out.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
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
   *                           example: Unauthorized access. Please log in.
   */
  route.post('/logout', middlewares.isAuth, (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');
    logger.debug('Calling Sign-Out endpoint with body: %o', req.body);
    try {
      //@TODO AuthService.Logout(req.user) do some clever stuff
      return res.status(200).end();
    } catch (e) {
      logger.error('🔥 error %o', e);
      return next(e);
    }
  });
};
