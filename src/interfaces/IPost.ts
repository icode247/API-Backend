import { Document } from 'mongoose';

import { IUserDocument } from './IUser';
import { ICommunityDocument } from './ICommunity';

export interface IComment {
  _id: string;
  post: IPostDocument['_id'];
  user: IUserDocument['_id'];
  likes: IUserDocument['_id'][];
  content: string;
  replies: IComment['_id'][];
}

export interface ICommentDocument extends IComment, Document {
  _id: string;
}

export interface IPost {
  _id: string;
  user: IUserDocument['_id'];
  likes: IUserDocument['_id'][];
  community: ICommunityDocument['_id'];
  content: string;
  comments: ICommentDocument['_id'][];
  attachments: string[];
}

export interface IPostDocument extends IPost, Document {
  _id: string;
}

export interface IReport {
  _id: string;
  reporter: IUserDocument['_id'];
  post?: IPostDocument['_id'];
  community?: ICommunityDocument['_id'];
  reason: string;
}

export interface IReportDocument extends IReport, Document {
  _id: string;
}

export interface IAttachmentDocument extends IAttachment, Document {
  _id: string;
}

export interface IAttachment {
  _id: string;
  image: string;
}

export interface ICreatePostInputDTO {
  content: string;
  communityId?: string;
}
