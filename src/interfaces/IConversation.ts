import { Document } from 'mongoose';
import { IUser } from './IUser';

export interface IMessage {
  sender: IUser | string;
  recipient: IUser | string;
  conversation: IConversation | string;
  message: string;
  attachment: string;
  replying: IMessage | string;
  status: string;
}

export interface IMessageDocument extends IMessage, Document {
  _id: string;
}

export interface IConversation {
  participants: IUser[] | string[];
  lastMessage: IMessage | string;
  unreadMessages: number;
}

export interface IConversationDocument extends IConversation, Document {
  _id: string;
}
