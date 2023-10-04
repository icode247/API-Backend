import { Document } from 'mongoose';
import { IOrganization } from './IOrganization';
import { IEvent } from './IEvent';

export interface IStripeCustomer {
  _id: string;
  customerId: string;
  userId: string;
}

export interface IDonation {
  createdAt: string | number | Date;
  _id: string;
  user: string;
  amount: number;
  status: string;
  organization: string;
  event: string;
  subscriptionId: string;
  paymentIntentId: string;
  active: boolean;
  interval: string;
  donationStatus: string;
}

export interface IDonationResponse {
  _id: string;
  user: string;
  amount: number;
  status: string;
  organization: IOrganization;
  event: IEvent;
  subscriptionId: string;
  paymentIntentId: string;
  active: boolean;
  interval: string;
  donationStatus: string;
}
export interface IDonationDocument extends IDonation, Document {
  _id: string;
}

export interface IDonationManager {
  _id: string;
  user: string;
  organizations: string[];
  interval: string;
  active: boolean;
  amount: number;
  totalDonations: number;
  subscriptionId: string;
}

export interface IDonationManagerDocument extends IDonationManager, Document {
  _id: string;
}

export interface IStripeCustomerDocument extends IStripeCustomer, Document {
  _id: string;
}

export interface IUpdateDonationInputDTO {
  amount?: number;
  interval?: string;
  freezeDonation?: boolean;
}
