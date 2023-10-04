import { Container } from 'typedi';
import formData from 'form-data';
import Mailgun from 'mailgun.js';
import Twilio from 'twilio';
import { Stripe } from 'stripe';
import LoggerInstance from './logger';
import redis from './redis';
import config from '../config';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async ({ models }: { models: { name: string; model: any }[] }): Promise<void> => {
  try {
    models.forEach(m => {
      Container.set(m.name, m.model);
    });
    const mgInstance = new Mailgun(formData);

    const LATEST_STRIPE_API_VERSION = '2022-11-15';
    const stripe = new Stripe(config.stripe.apiKey, { apiVersion: LATEST_STRIPE_API_VERSION });

    Container.set('redis', await redis());
    Container.set('logger', LoggerInstance);
    Container.set('emailClient', mgInstance.client({ key: config.emails.apiKey, username: config.emails.apiUsername }));
    Container.set('smsClient', Twilio(config.sms.accountSid, config.sms.authToken));
    Container.set('emailDomain', config.emails.domain);
    Container.set('stripe', stripe);
  } catch (e) {
    LoggerInstance.error('🔥 Error on dependency injector loader: %o', e);
    throw e;
  }
};
