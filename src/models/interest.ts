import { IInterest } from '../interfaces/IInterest';
import mongoose from 'mongoose';

const Interest = new mongoose.Schema(
  {
    image: {
      type: String,
    },
    name: {
      type: String,
      index: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model<IInterest & mongoose.Document>('Interest', Interest);
