import mongoose from 'mongoose';
import { IEvent } from '../interfaces/IEvent';

const Event = new mongoose.Schema(
  {
    photo: {
      type: String,
      index: true,
    },
    name: {
      type: String,
      index: true,
    },
    description: {
      type: String,
      index: true,
    },
    admin: { type: mongoose.Types.ObjectId, ref: 'User' },
    fundraisingGoal: { type: Number },
    fundRaised: { type: Number, default: 0 },
    goalReached: { type: Boolean, default: false },
    interests: [{ type: mongoose.Types.ObjectId, ref: 'Interest' }],
    organization: { type: mongoose.Types.ObjectId, ref: 'Organization' },
    endTime: Date,
    address: { type: String },
    members: [{ type: mongoose.Types.ObjectId, ref: 'User' }],
    community: { type: mongoose.Types.ObjectId, ref: 'Community' },
  },
  { timestamps: true },
);

Event.index({ loc: '2dsphere' });
Event.index({ name: 'text', description: 'text' });

export default mongoose.model<IEvent & mongoose.Document>('Events', Event);
