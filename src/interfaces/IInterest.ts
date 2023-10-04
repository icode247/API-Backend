import { Document } from 'mongoose';

export interface IInterest {
  _id: string;
  name: string;
  image: string;
}

export interface IInterestDocument extends IInterest, Document {
  _id: string;
}

export interface IInterestInputDTO {
  name: string;
}
