import { Document } from 'mongoose';
import { IUserDocument } from './IUser';

export interface INotification {
  _id: string;
  recipient: IUserDocument;
  message: string;
  title: string;
  isRead: boolean;
}

export interface INotificationDocument extends INotification, Document {
  _id: string;
}

export interface INewNotificationInputDTO {
  recipient: string;
  message: string;
  title: string;
  actionId: string;
  type: string;
}
