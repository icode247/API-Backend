import { IUser, IUserReward } from '../interfaces/IUser';
import mongoose from 'mongoose';

const User = new mongoose.Schema(
  {
    photo: {
      type: String,
    },
    fullname: {
      type: String,
      index: true,
    },
    username: {
      type: String,
      lowercase: true,
      index: true,
    },
    phone: {
      type: String,
      index: { unique: true, sparse: true },
    },
    email: {
      type: String,
      lowercase: true,
      index: { unique: true, sparse: true },
    },
    callingCode: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    blocked: {
      type: Boolean,
      default: false,
    },
    password: String,

    birthDate: Date,

    salt: String,

    role: {
      type: String,
      default: 'user',
    },
    loc: {
      type: { type: String },
      coordinates: [Number],
    },
    interest: [{ type: mongoose.Types.ObjectId, ref: 'Interest', default: [] }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
    importedContacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
    fcm_tokens: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

User.index({ loc: '2dsphere' });

User.index({ email: 'text', fullname: 'text', username: 'text' });

const UserRewardSchema = new mongoose.Schema(
  {
    points: {
      type: Number,
      default: 0,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

export const UserReward = mongoose.model<IUserReward & mongoose.Document>('UserReward', UserRewardSchema);

export default mongoose.model<IUser & mongoose.Document>('User', User);
