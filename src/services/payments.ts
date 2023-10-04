// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Service, Inject } from 'typedi';
import { Stripe } from 'stripe';
import mongoose from 'mongoose';
import { v1 as uuidv1 } from 'uuid';

import { ValidationError } from '../config/exceptions';
import {
  IDonation,
  IUpdateDonationInputDTO,
  IDonationResponse,
  IDonationManagerDocument,
} from '../interfaces/IPayment';
import config from '../config';
import moment from 'moment';
@Service()
export default class PaymentService {
  constructor(
    @Inject('userRewardModel') private userRewardModel: Models.UserRewardModel,
    @Inject('stripeCustomerModel') private stripeCustomerModel: Models.StripeCustomerModel,
    @Inject('donationModel') private donationModel: Models.DonationModel,
    @Inject('organizationModel') private organizationModel: Models.OrganizationModel,
    @Inject('donationManagerModel') private donationManagerModel: Models.DonationManagerModel,
    @Inject('eventModel') private eventModel: Models.EventModel,
    @Inject('logger') private logger,
    @Inject('stripe') private stripe: Stripe,
  ) {}

  private async _getOrCreateStripeCustomer(userId: string) {
    let stripeCustomerObject = await this.stripeCustomerModel.findOne({ userId: userId });

    if (!stripeCustomerObject) {
      const customer = await this.stripe.customers.create();
      stripeCustomerObject = await this.stripeCustomerModel.create({
        userId,
        customerId: customer.id,
      });
    }

    return stripeCustomerObject;
  }

  private _takeSystemCharge(amount: string | number) {
    return Number(amount) - config.platformCharge;
  }

  private async _updateTotalDonations(userId: string, amount: number) {
    const donationManager = await this.donationManagerModel.findOne({ user: userId });
    if (donationManager) {
      donationManager.totalDonations += amount;
      await donationManager.save();
    }
  }

  private async _setupPaymentIntent(userId: string, amount: number) {
    const payment_method_types = ['card', 'link'];

    const stripeCustomerObject = await this._getOrCreateStripeCustomer(userId);

    const ephemeralKey = await this.stripe.ephemeralKeys.create(
      { customer: stripeCustomerObject.customerId },
      { apiVersion: config.stripe.apiVersion.toString() },
    );
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount,
      currency: config.stripe.defaultCurrency,
      payment_method_types,
      metadata: { userId: userId.toString() },
    });

    return {
      paymentIntentId: paymentIntent.id,
      paymentIntent: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: stripeCustomerObject.customerId,
    };
  }

  private async _setupSubscription(userId: string, amount: number, interval: string) {
    if (!config.subscriptionIntervals.includes(interval)) {
      throw new ValidationError('Incorrect donation interval specified.');
    }

    const stripeCustomerObject = await this._getOrCreateStripeCustomer(userId);

    const ephemeralKey = await this.stripe.ephemeralKeys.create(
      { customer: stripeCustomerObject.customerId },
      { apiVersion: config.stripe.apiVersion.toString() },
    );

    const price = await this.stripe.prices.create({
      currency: config.stripe.defaultCurrency,
      unit_amount: amount,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      recurring: { interval: interval },
      product_data: {
        name: uuidv1(),
      },
    });
    const subscription = await this.stripe.subscriptions.create({
      customer: stripeCustomerObject.customerId,
      items: [{ price: price.id }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      metadata: { userId: userId.toString() },
    });

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const { client_secret } = subscription.latest_invoice.payment_intent;

    return {
      subscriptionId: subscription.id,
      paymentIntent: client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: stripeCustomerObject.customerId,
    };
  }

  private async _getUserFollowedOrganizations(userId: string) {
    const donationManager = await this.donationManagerModel.findOne({ user: userId });

    if (!donationManager || donationManager.organizations.length < 1) {
      throw new ValidationError('Request not valid. please try again');
    }

    return donationManager.organizations;
  }

  private async _validateEventId(eventId: string) {
    const event = await this.eventModel.findOne({ _id: mongoose.Types.ObjectId(eventId) });

    if (!event) {
      throw new ValidationError('Request not valid. please try again.');
    }

    return event;
  }

  private async _validateOrganizationId(organizationId: string) {
    const organization = await this.organizationModel.findOne({ _id: mongoose.Types.ObjectId(organizationId) });

    if (!organization) {
      throw new ValidationError('Request not valid. please try again');
    }
  }

  private async _handleSubscriptionEvent(subscription: Stripe.Response<Stripe.Subscription>) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const amountWithoutCharge = this._takeSystemCharge(subscription.plan.amount);
    const organizationIds = await this._getUserFollowedOrganizations(subscription.metadata.userId);
    const individualDonation = amountWithoutCharge / organizationIds.length;

    organizationIds.forEach(async organizationId => {
      const organization = await this.organizationModel.findById(mongoose.Types.ObjectId(organizationId));

      const donation = await this.donationModel.create({
        user: subscription.metadata.userId,
        amount: individualDonation,
        status: 'success',
        active: true,
        subscriptionId: subscription.id,
        organization: organizationId,
      });

      organization.fundRaised = organization.fundRaised + donation.amount;
      organization.totalDonations = organization.totalDonations + 1;
      await organization.save();
    });

    await this._updateTotalDonations(subscription.metadata.userId, amountWithoutCharge);

    await this.incrementUserPoint(subscription.metadata.userId);
  }

  public async paymentIntent(userId: string, amount: number, options: { organization?: string; event?: string }) {
    const organizationId = options.organization || null;
    const eventId = options.event || null;

    const paymentIntentData = await this._setupPaymentIntent(userId, amount);
    const paymentIntentId = paymentIntentData.paymentIntentId;

    const amountWithoutCharge = this._takeSystemCharge(amount);

    const paymentData = {
      user: userId,
      paymentIntentId: paymentIntentId,
      amount: amountWithoutCharge,
    };

    if (organizationId) {
      await this._validateOrganizationId(organizationId);
      paymentData['organization'] = organizationId;
    }

    if (eventId) {
      const event = await this._validateEventId(eventId);

      if (event.goalReached) {
        throw new ValidationError('The goal for this event is already reached');
      }
      paymentData['event'] = eventId;
    }

    await this.donationModel.create({ ...paymentData });

    return paymentIntentData;
  }

  public async paymentSubscription(userId: string, amount: number, options: { interval: string }) {
    await this._getUserFollowedOrganizations(userId);

    const subscriptionData = await this._setupSubscription(userId, amount, options.interval);

    const donationManager = await this.donationManagerModel.findOne({ user: userId });

    donationManager.subscriptionId = subscriptionData.subscriptionId;
    donationManager.interval = options.interval;
    donationManager.amount = this._takeSystemCharge(amount);

    await donationManager.save();

    return subscriptionData;
  }

  public async handleWebhook(event: Stripe.Event) {
    const dataObject = event.data.object;

    if (dataObject['billing_reason'] == 'subscription_create') {
      const subscription_id = dataObject['subscription'];
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const payment_intent_id = dataObject.id;

      const payment_intent = await this.stripe.paymentIntents.retrieve(payment_intent_id);

      await this.stripe.subscriptions.update(subscription_id, {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        default_payment_method: payment_intent.payment_method,
      });

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      await this.stripe.customers.update(payment_intent.customer, {
        invoice_settings: {
          default_payment_method: payment_intent.payment_method,
        },
      });
    }

    if (event.type === 'invoice.payment_succeeded') {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const subscriptionId = dataObject.subscription;

      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (subscription.status === 'active' && subscription.latest_invoice.paid) {
        await this._handleSubscriptionEvent(subscription);
        this.logger.info(`Subscription ${subscriptionId} has been paid for.`);
      }
    }

    if (event.type === 'payment_intent.succeeded') {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const paymentIntentId = dataObject.id;
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        const donation = await this.donationModel.findOne({ paymentIntentId: paymentIntentId });

        if (donation) {
          const amountWithoutCharge = this._takeSystemCharge(paymentIntent.amount_received);
          let organization = null;

          if (donation.event) {
            const event = await this.eventModel.findById(mongoose.Types.ObjectId(donation.event));

            if (event) {
              event.fundRaised = event.fundRaised + amountWithoutCharge;

              if (event.fundRaised >= event.fundraisingGoal) {
                event.goalReached = true;
              }
              await event.save();
              organization = await this.organizationModel.findOne({ _id: mongoose.Types.ObjectId(event.organization) });
            }
          } else {
            organization = await this.organizationModel.findOne({
              _id: mongoose.Types.ObjectId(donation.organization),
            });
          }
          if (organization) {
            organization.fundRaised = organization.fundRaised + amountWithoutCharge;
            organization.totalDonations = organization.totalDonations + 1;
          }
          donation.status = 'success';
          await donation.save();

          await this._updateTotalDonations(donation.user, amountWithoutCharge);
          await this.incrementUserPoint(donation.user);
        }

        this.logger.info(`Payment ${paymentIntentId} has been paid for.`);
      } else {
        // Payment failed or has not yet succeeded
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      const failedPaymentIntent = dataObject;

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const donation = await this.donationModel.findOne({ paymentIntentId: failedPaymentIntent.id });

      if (donation) {
        donation.status = 'failure';
        await donation.save();
      }
    }
  }

  private async _updatePriceAndIntervalItem(
    subscription: Stripe.Subscription,
    donationManager: IDonationManagerDocument & mongoose.Document<any, any, any>,
    updateDonationInputDTO: IUpdateDonationInputDTO,
  ) {
    const newPriceData = {
      currency: config.stripe.defaultCurrency,
      unit_amount: updateDonationInputDTO.amount,
      product_data: {
        name: uuidv1(),
      },
    };

    if (updateDonationInputDTO.interval) {
      if (!config.subscriptionIntervals.includes(updateDonationInputDTO.interval)) {
        throw new ValidationError('Incorrect donation interval set');
      }
      donationManager.interval = updateDonationInputDTO.interval;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      newPriceData['recurring'] = { interval: updateDonationInputDTO.interval };
    }

    if (updateDonationInputDTO.amount) {
      donationManager.amount = updateDonationInputDTO.amount;
    }

    await donationManager.save();

    const newPrice = await this.stripe.prices.create(newPriceData);
    return [
      {
        id: subscription.items.data[0].id,
        price: newPrice,
      },
    ];
  }

  public async updateDonation(userId: string, updateDonationInputDTO: IUpdateDonationInputDTO) {
    const freezeDonationKey = 'freezeDonation';
    const donationManager = await this.donationManagerModel.findOne({ user: userId });

    if (!donationManager) {
      throw new ValidationError('Request could not be completed');
    }

    const newStripeArguments = {};

    if (donationManager.subscriptionId) {
      const subscription = await this.stripe.subscriptions.retrieve(donationManager.subscriptionId);

      if (updateDonationInputDTO.interval || updateDonationInputDTO.amount) {
        newStripeArguments['items'] = this._updatePriceAndIntervalItem(
          subscription,
          donationManager,
          updateDonationInputDTO,
        );
      }

      if (Object.keys(updateDonationInputDTO).includes(freezeDonationKey)) {
        if (updateDonationInputDTO.freezeDonation) {
          newStripeArguments['pause_collection'] = { behavior: 'void ' };
        } else {
          newStripeArguments['pause_collection'] = null;
        }

        donationManager.active = updateDonationInputDTO.freezeDonation;
        await donationManager.save();
      }

      await this.stripe.subscriptions.update(donationManager.subscriptionId, newStripeArguments);
    }

    throw new ValidationError('Request not valid');
  }

  public async incrementUserPoint(userId: string) {
    try {
      let userPoint = await this.userRewardModel.findOne({ user: userId });

      if (!userPoint) {
        userPoint = new this.userRewardModel({
          user: userId,
          points: 1,
        });
      } else {
        userPoint.points++;
      }

      await userPoint.save();
      return userPoint;
    } catch (error) {
      throw error;
    }
  }

  async getDonationHistory(userId: string, fromDate: Date, toDate: Date): Promise<IDonationResponse[]> {
    const donations: IDonation[] = await this.donationModel
      .find({
        user: userId,
        createdAt: {
          $gte: moment(fromDate).startOf('day').toDate(),
          $lte: moment(toDate).endOf('day').toDate(),
        },
      })
      .populate('user', 'name email')
      .populate('organization', 'name')
      .populate('event', 'name');

    return donations.map(
      (donation: any) =>
        ({
          _id: donation._id,
          user: donation.user,
          amount: donation.amount,
          status: donation.status,
          organization: donation.organization?.name,
          event: donation.event?.name,
          subscriptionId: donation.subscriptionId,
          paymentIntentId: donation.paymentIntentId,
          active: donation.active,
          interval: donation.interval,
          donationStatus: donation.donationStatus,
        } as IDonationResponse),
    );
  }
}
