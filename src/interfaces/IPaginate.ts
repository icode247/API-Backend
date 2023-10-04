import { Document } from 'mongoose';
import { ILocation } from './ILocation';

export interface IPaginationResult<T> {
  data: T[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export interface IOrganizationDocument extends Document {
  _id: string;
  userId: string;
  name: string;
  logo: string;
  charityRegNumber: string;
  email: string;
  postalCode: string;
  country: string;
  address: string;
  fundRaised: number;
  totalDonations: number;
  city: string;
  loc: ILocation;
  interests: string[];
  description: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankName: string;
}
