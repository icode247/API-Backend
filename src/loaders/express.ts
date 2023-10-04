import express from 'express';
import HTTP from 'http';
import cors from 'cors';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import helmet from 'helmet';
import { CelebrateError, isCelebrateError } from 'celebrate';
import routes from '../api';
import config from '../config';
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default ({ app }: { app: express.Application }) => {
  /**
   * Health Check endpoints
   */
  app.get('/status', (req, res) => {
    res.status(200).end();
  });
  app.head('/status', (req, res) => {
    res.status(200).end();
  });

  // Useful if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
  // It shows the real origin IP in the heroku or Cloudwatch logs
  app.enable('trust proxy');

  // The magic package that prevents frontend developers going nuts
  // Alternate description:
  // Enable Cross Origin Resource Sharing to all origins by default
  app.use(cors());

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  app.use(require('method-override')());

  // Transforms the raw string of req.body into json
  app.use((req, res, next) => {
    if (req.originalUrl === '/api/donations/webhook') {
      next();
    } else {
      express.json()(req, res, next);
    }
  });
  app.use(express.urlencoded({ extended: true }));

  app.use(helmet.xssFilter());
  app.use(helmet.hidePoweredBy());

  if (app.get('env') === 'production') {
    app.set('trust proxy', 1);
  }

  app.use(
    helmet({
      dnsPrefetchControl: { allow: true },
    }),
  );

  // Load API routes
  app.use(config.api.prefix, routes());

  const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Hiroek API Doc',
        version: '1.0.0',
      },
    },
    apis: ['./build/api/routes/*', './src/api/routes/*'],
  };

  const openapiSpecification = swaggerJsdoc(options);

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpecification));

  /// catch 404 and forward to error handler
  app.use((req, res, next) => {
    const err = new Error('Not Found');
    err['status'] = 404;
    next(err);
  });

  const celebrateError = (err: CelebrateError) => {
    const DEFAULT_STATUS_CODE = 400;

    const validation = {};
    // eslint-disable-next-line no-restricted-syntax
    for (const [_, joiError] of err.details.entries()) {
      validation['details'] = {
        message: joiError.message.replace(/['"]+/g, ''),
      };
    }

    const result = {
      statusCode: DEFAULT_STATUS_CODE,
      message: HTTP.STATUS_CODES[DEFAULT_STATUS_CODE],
      ...validation,
    };

    return result;
  };

  /// error handlers
  app.use((err, req, res, next) => {
    /**
     * Handle 401 thrown by express-jwt library
     */
    if (err.name === 'UnauthorizedError') {
      return res
        .status(err.status)
        .send({
          error: {
            statusCode: err.status,
            message: HTTP.STATUS_CODES[err.status],
            details: {
              message: err.message,
            },
          },
        })
        .end();
    }
    return next(err);
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err, req, res, next) => {
    res.status(err.status || 500);

    const statusCode = err.status;

    if (isCelebrateError(err)) {
      const result = celebrateError(err);

      res.status(result.statusCode);
      res.json({ error: result });
      return;
    }

    if (err.name === 'ValidationError') {
      const statusCode = 400;
      res.status(statusCode);
      res.json({
        error: {
          statusCode: statusCode,
          message: HTTP.STATUS_CODES[statusCode],
          details: {
            message: err.message,
          },
        },
      });
      return;
    }

    res.json({
      error: {
        statusCode: err.status,
        message: HTTP.STATUS_CODES[statusCode],
        details: {
          message: err.message,
        },
      },
    });
  });
};
