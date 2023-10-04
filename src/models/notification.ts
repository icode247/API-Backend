import { NOTIFICATION_TYPES } from '../utils/constants';
import { INotification } from '../interfaces/INotification';
import mongoose from 'mongoose';

const Notification = new mongoose.Schema(
  {
    recipient: { type: mongoose.Types.ObjectId, ref: 'User' },
    message: {
      type: String,
    },
    title: {
      type: String,
    },
    actionId: {
      type: String,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export default mongoose.model<INotification & mongoose.Document>('Notification', Notification);
