import { Document } from 'mongoose';
import { IUser } from './IUser';

export interface ICommunity {
  admin: string;
  _id: string;
  name: string;
  description: string;
  members: string[];
  invitees: string[];
  interests: string[];
  events: string[];
  photo: string;
  popularity?: number;
  moderators?: IUser[];
}

export interface ICommunityDocument extends ICommunity, Document {
  _id: string;
}

export interface CreateCommunityInputDTO {
  name: string;
  description: string;
  interests: string[];
  invitees: string[];
  moderators?: string[];
}
