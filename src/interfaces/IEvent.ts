import moment from 'moment';
import { ILocation } from './ILocation';
import { ICommunity } from './ICommunity';
import { Document } from 'mongoose';

export interface IEvent {
  _id: string;
  photo: string;
  name: string;
  description: string;
  fundraisingGoal: number;
  fundRaised: number;
  interests: string[];
  organization: string;
  endTime: Date | moment.Moment;
  loc: ILocation;
  members: string[];
  community: ICommunity;
  admin: string;
  goalReached: boolean;
}

export interface IEventDocument extends IEvent, Document {
  _id: string;
}

export interface ICreateEventInputDTO {
  name: string;
  description: string;
  fundraisingGoal: number;
  interests: string[];
  organization: string;
  endTime: string;
  address: string;
  memberIds?: string[];
  communityId?: string;
}
