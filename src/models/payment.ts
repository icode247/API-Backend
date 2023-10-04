import { IStripeCustomer, IDonation, IDonationManager } from '../interfaces/IPayment';
import config from '../config';
import mongoose from 'mongoose';

const StripeCustomerSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      unique: true,
    },
    userId: {
      type: String,
    },
  },
  { timestamps: true },
);

const DonationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failure'],
      default: 'pending',
    },
    donationStatus: {
      type: String,
      enum: ['open', 'frozen'],
      default: 'open',
    },
    interval: {
      type: String,
      enum: config.subscriptionIntervals,
      default: 'month',
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: false,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: false,
    },
    subscriptionId: {
      type: String,
    },
    paymentIntentId: {
      type: String,
    },
    active: {
      type: Boolean,
      default: false,
    },
    createAt: {
      type: Date,
      default: Date.now(),
    },
  },
  { timestamps: true },
);

const DonationManagerSchema = new mongoose.Schema(
  {
    organizations: [{ type: mongoose.Types.ObjectId, ref: 'Organization' }],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    interval: {
      type: String,
      enum: config.subscriptionIntervals,
      default: 'month',
    },
    active: {
      type: Boolean,
      default: false,
    },
    subscriptionId: {
      type: String,
    },
    amount: {
      type: Number,
      default: 0,
    },
    totalDonations: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

export const DonationManager = mongoose.model<IDonationManager & mongoose.Document>(
  'DonationManager',
  DonationManagerSchema,
);

export const StripeCustomer = mongoose.model<IStripeCustomer & mongoose.Document>(
  'StripeCustomer',
  StripeCustomerSchema,
);

export const Donation = mongoose.model<IDonation & mongoose.Document>('Donation', DonationSchema);
