import mongoose from 'mongoose';
import { ICommunity } from '../interfaces/ICommunity';

const Community = new mongoose.Schema(
  {
    name: String,
    description: String,
    admin: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
    },
    interests: [{ type: mongoose.Types.ObjectId, ref: 'Interest', default: [] }],
    members: [
      {
        type: mongoose.Types.ObjectId,
        ref: 'User',
      },
    ],
    invitees: [
      {
        type: mongoose.Types.ObjectId,
        ref: 'User',
        default: [],
      },
    ],
    photo: String,
    moderators: [
      {
        type: mongoose.Types.ObjectId,
        ref: 'User',
        default: [],
      },
    ],
  },
  { timestamps: true },
);

Community.index({ name: 'text', description: 'text' });

export default mongoose.model<ICommunity & mongoose.Document>('Community', Community);
