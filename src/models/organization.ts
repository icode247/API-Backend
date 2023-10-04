import { IOrganization } from '../interfaces/IOrganization';
import mongoose from 'mongoose';

const Organization = new mongoose.Schema(
  {
    name: { type: String, unique: true },
    userId: String,
    logo: String,
    charityRegNumber: String,
    email: String,
    postalCode: String,
    country: String,
    fundRaised: { type: Number, default: 0 },
    totalDonations: { type: Number, default: 0 },
    city: String,
    address: String,
    interests: [{ type: mongoose.Types.ObjectId, ref: 'Interest', default: [] }],
    description: String,
    bankAccountName: String,
    bankAccountNumber: String,
    bankName: String,
    loc: {
      type: { type: String },
      coordinates: [Number],
    },
  },
  { timestamps: true },
);

Organization.index({ loc: '2dsphere' });
Organization.index({ name: 'text', description: 'text' });

export default mongoose.model<IOrganization & mongoose.Document>('Organization', Organization);
