import { Document, Model } from 'mongoose';
import { IUserDocument, IUser, IUserRewardDocument } from '../../interfaces/IUser';
import { IInterestDocument } from '../../interfaces/IInterest';
import { IOrganizationDocument } from '../../interfaces/IOrganization';
import { INotificationDocument } from '../../interfaces/INotification';
import { ICommunityDocument } from '../../interfaces/ICommunity';
import { IConversationDocument, IMessageDocument } from '../../interfaces/IConversation';
import { IPostDocument, IAttachmentDocument, ICommentDocument, IReportDocument } from '../../interfaces/IPost';
import { IEventDocument } from '../../interfaces/IEvent';
import { IStripeCustomerDocument, IDonationDocument, IDonationManagerDocument } from '../../interfaces/IPayment';
import { Readable } from 'stream';

declare global {
  namespace Express {
    export interface Request {
      currentUser: IUser & Document;
    }
  }

  namespace Models {
    export type UserModel = Model<IUserDocument & Document>;
    export type OrganizationModel = Model<IOrganizationDocument & Document>;
    export type InterestModel = Model<IInterestDocument & Document>;
    export type NotificationModel = Model<INotificationDocument & Document>;
    export type CommunityModel = Model<ICommunityDocument & Document>;
    export type PostModel = Model<IPostDocument & Document>;
    export type CommentModel = Model<ICommentDocument & Document>;
    export type AttachmentModel = Model<IAttachmentDocument & Document>;
    export type ReportModel = Model<IReportDocument & Document>;
    export type EventModel = Model<IEventDocument & Document>;
    export type StripeCustomerModel = Model<IStripeCustomerDocument & Document>;
    export type ConversationModel = Model<IConversationDocument & Document>;
    export type MessageModel = Model<IMessageDocument & Document>;
    export type DonationModel = Model<IDonationDocument & Document>;
    export type UserRewardModel = Model<IUserRewardDocument & Document>;
    export type DonationManagerModel = Model<IDonationManagerDocument & Document>;
  }

  namespace Multer {
    /** Object containing file metadata and access information. */
    interface File {
      /** Name of the form field associated with this file. */
      fieldname: string;
      /** Name of the file on the uploader's computer. */
      originalname: string;
      /**
       * Value of the `Content-Transfer-Encoding` header for this file.
       * @deprecated since July 2015
       * @see RFC 7578, Section 4.7
       */
      encoding: string;
      /** Value of the `Content-Type` header for this file. */
      mimetype: string;
      /** Size of the file in bytes. */
      size: number;
      /**
       * A readable stream of this file. Only available to the `_handleFile`
       * callback for custom `StorageEngine`s.
       */
      stream: Readable;
      /** `DiskStorage` only: Directory to which this file has been uploaded. */
      destination: string;
      /** `DiskStorage` only: Name of this file within `destination`. */
      filename: string;
      /** `DiskStorage` only: Full path to the uploaded file. */
      path: string;
      /** `MemoryStorage` only: A Buffer containing the entire file. */
      buffer: Buffer;

      location: string;
    }
  }
}
