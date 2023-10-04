import mongoose from 'mongoose';
import { IConversation } from '../interfaces/IConversation';

const Conversation = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Types.ObjectId, ref: 'User' }],
    lastMessage: { type: mongoose.Types.ObjectId, ref: 'Message' },
  },
  { timestamps: true },
);

const conversationModel = mongoose.model<IConversation & mongoose.Document>('Conversation', Conversation);
export default conversationModel;
