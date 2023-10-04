import expressLoader from './express';
import dependencyInjectorLoader from './dependencyInjector';
import mongooseLoader from './mongoose';
import redisLoader from './redis';

// import jobsLoader from './jobs';
import Logger from './logger';
//We have to import at least all the events once so they can be triggered
import './events';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default async ({ expressApp }): Promise<void> => {
  await mongooseLoader();
  await redisLoader();
  Logger.info('✌️ DB loaded and connected!');

  /**
   *
   * We are injecting the mongoose models into the DI container.
   * This will provide a lot of flexibility at the time
   * of writing unit tests.
   */

  const userModel = {
    name: 'userModel',
    // Notice the require syntax and the '.default'
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    model: require('../models/user').default,
  };

  const userRewardModel = {
    name: 'userRewardModel',
    // Notice the require syntax and the '.default'
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    model: require('../models/user').UserReward,
  };

  const donationManagerModel = {
    name: 'donationManagerModel',
    // Notice the require syntax and the '.default'
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    model: require('../models/payment').DonationManager,
  };

  const organizationModel = {
    name: 'organizationModel',
    // Notice the require syntax and the '.default'
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    model: require('../models/organization').default,
  };

  const interestModel = {
    name: 'interestModel',
    // Notice the require syntax and the '.default'
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    model: require('../models/interest').default,
  };

  const notificationModel = {
    name: 'notificationModel',
    // Notice the require syntax and the '.default'
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    model: require('../models/notification').default,
  };

  const communityModel = {
    name: 'communityModel',
    // Notice the require syntax and the '.default'
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    model: require('../models/community').default,
  };

  const postModel = {
    name: 'postModel',
    // Notice the require syntax and the '.default'
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    model: require('../models/post').default,
  };

  const postAttachmentModel = {
    name: 'postAttachmentModel',
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    model: require('../models/post').Attachment,
  };

  const commentModel = {
    name: 'commentModel',
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    model: require('../models/post').Comment,
  };

  const reportModel = {
    name: 'reportModel',
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    model: require('../models/post').Report,
  };

  const eventModel = {
    name: 'eventModel',
    // Notice the require syntax and the '.default'
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    model: require('../models/event').default,
  };

  const stripeCustomerModel = {
    name: 'stripeCustomerModel',
    // Notice the require syntax and the '.default'
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    model: require('../models/payment').StripeCustomer,
  };

  const donationModel = {
    name: 'donationModel',
    // Notice the require syntax and the '.default'
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    model: require('../models/payment').Donation,
  };

  const messageModel = {
    name: 'messageModel',
    // Notice the require syntax and the '.default'
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    model: require('../models/message').default,
  };
  const conversationModel = {
    name: 'conversationModel',
    // Notice the require syntax and the '.default'
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    model: require('../models/conversation').default,
  };
  await dependencyInjectorLoader({
    models: [
      userModel,
      organizationModel,
      interestModel,
      notificationModel,
      communityModel,
      postModel,
      postAttachmentModel,
      commentModel,
      reportModel,
      eventModel,
      stripeCustomerModel,
      messageModel,
      conversationModel,
      donationModel,
      userRewardModel,
      donationManagerModel,
    ],
  });
  Logger.info('✌️ Dependency Injector loaded');

  // await jobsLoader({ agenda });
  // Logger.info('✌️ Jobs loaded');

  await expressLoader({ app: expressApp });
  Logger.info('✌️ Express loaded');
};
