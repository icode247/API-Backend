import { Document } from 'mongoose';
import { ILocation } from './ILocation';

export interface IOrganization {
  _id: string;
  userId: string;
  name: string;
  logo: string;
  charityRegNumber: string;
  email: string;
  postalCode: string;
  country: string;
  city: string;
  address: string;
  fundRaised: number;
  totalDonations: number;
  loc: ILocation;
  interests: string[];
  description: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankName: string;
}

export interface ICreateOrganizationInputDTO {
  name: string;
  charityRegNumber: string;
  email: string;
  postalCode: string;
  country: string;
  city: string;
  address: string;
  fundRaised: number;
  totalDonations: number;
  latitude: string;
  longitude: string;
  interests: string[];
  description: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankName: string;
}

export interface IOrganizationDocument extends IOrganization, Document {
  _id: string;
}
