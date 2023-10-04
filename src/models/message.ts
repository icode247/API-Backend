import { Message } from 'aws-sdk/clients/cloudwatch';
import mongoose from 'mongoose';
import { IMessage } from '../interfaces/IConversation';

const Message = new mongoose.Schema(
  {
    sender: { type: mongoose.Types.ObjectId, ref: 'User' },
    recipient: { type: mongoose.Types.ObjectId, ref: 'User' },
    conversation: { type: mongoose.Types.ObjectId, ref: 'Conversation' },
    message: String,
    attachment: {
      type: String,
    },
    replying: { type: mongoose.Types.ObjectId, ref: 'Message' },
    status: { type: String, enum: ['read', 'unread'], default: 'unread' },
  },
  { timestamps: true },
);

const message = mongoose.model<IMessage & mongoose.Document>('Message', Message);
export default message;
