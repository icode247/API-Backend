import mongoose from 'mongoose';

import { IPost, IReport } from '../interfaces/IPost';
import { IAttachment } from '../interfaces/IPost';
import { IComment } from '../interfaces/IPost';

const AttachmentSchema = new mongoose.Schema(
  {
    image: {
      type: String,
    },
  },
  { timestamps: true },
);

const CommentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
    },
    post: { type: mongoose.Types.ObjectId, ref: 'Post' },
    user: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
    likes: [{ type: mongoose.Types.ObjectId, ref: 'User' }],
    replies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
      },
    ],
  },
  { timestamps: true },
);

const PostSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      index: true,
    },
    community: { type: mongoose.Types.ObjectId, ref: 'Community' },
    user: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
    attachments: [{ type: mongoose.Types.ObjectId, ref: 'Attachment' }],
    likes: [{ type: mongoose.Types.ObjectId, ref: 'User' }],
    comments: [{ type: mongoose.Types.ObjectId, ref: 'Comment' }],
  },
  { timestamps: true },
);

PostSchema.index({ content: 'text' });

const ReportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: false,
    },
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Community',
      required: false,
    },
  },
  { timestamps: true },
);

export const Attachment = mongoose.model<IAttachment & mongoose.Document>('Attachment', AttachmentSchema);
export const Comment = mongoose.model<IComment & mongoose.Document>('Comment', CommentSchema);
export const Report = mongoose.model<IReport & mongoose.Document>('Report', ReportSchema);

export default mongoose.model<IPost & mongoose.Document>('Post', PostSchema);
