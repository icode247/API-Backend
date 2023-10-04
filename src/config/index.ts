import dotenv from 'dotenv';
import { Algorithm } from 'jsonwebtoken';

// Set the NODE_ENV to 'development' by default

dotenv.config();

const jwtAlgorithm: Algorithm = 'HS256';

export default {
  /**
   * Your favorite port
   */
  port: parseInt(process.env.PORT, 10),

  /**
   * That long string from mlab
   */
  databaseURL: process.env.MONGODB_URI,

  redisURL: process.env.REDIS_URI,

  rollbarAccessToken: process.env.ROLLBAR_ACCESS_TOKEN,

  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  awsRegion: process.env.AWS_S3_REGION_NAME,
  s3BucketName: process.env.AWS_STORAGE_BUCKET_NAME,
  sqsConfigURL: process.env.AWS_NOTIFICATION_SQS_CONFIG_URL,

  /**
   * Your secret sauce
   */
  jwtSecret: process.env.JWT_SECRET,
  jwtAlgorithm: jwtAlgorithm,

  /**
   * Used by winston logger
   */
  logs: {
    level: process.env.LOG_LEVEL || 'silly',
  },

  /**
   * API configs
   */
  api: {
    prefix: '/api',
  },
  /**
   * Mailgun email credentials
   */
  emails: {
    apiKey: process.env.MAILGUN_API_KEY,
    apiUsername: process.env.MAILGUN_USERNAME,
    domain: process.env.MAILGUN_DOMAIN,
  },

  sms: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    smsSender: process.env.TWILIO_FROM_NUMBER,
  },

  subscriptionIntervals: ['day', 'week', 'month', 'year'],
  platformCharge: 50,

  stripe: {
    apiKey: process.env.STRIPE_API_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOKSECRET,
    defaultCurrency: 'gbp',
    apiVersion: '2022-11-15',
  },
};
