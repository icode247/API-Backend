// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Service, Inject, Container } from 'typedi';
import mongoose from 'mongoose';
import { IUser } from '../interfaces/IUser';
import { IPaginateOptions, paginate } from '../selectors/pagination';
import {
  ICreatePostInputDTO,
  IPost,
  IPostDocument,
  IComment,
  ICommentDocument,
  IReport,
  IReportDocument,
} from '../interfaces/IPost';
import { UnauthorizedError, ValidationError } from '../config/exceptions';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { EventDispatcher, EventDispatcherInterface } from '../decorators/eventDispatcher';
import events from '../subscribers/events';
import NotificationService from './notification';
import { NOTIFICATION_NEW_COMMENT, NOTIFICATION_NEW_LIKE } from '../utils/constants';

@Service()
export default class PostService {
  constructor(
    @Inject('postModel') private postModel: Models.PostModel,
    @Inject('commentModel') private commentModel: Models.CommentModel,
    @Inject('postAttachmentModel') private postAttachmentModel: Models.AttachmentModel,
    @Inject('communityModel') private communityModel: Models.CommunityModel,
    @Inject('reportModel') private reportModel: Models.ReportModel,
    @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
  ) {}

  async getCommunityPosts(options: { page: number; pageSize: number; communityId: string; searchQuery?: string }) {
    const { page, pageSize, communityId, searchQuery } = options;

    const searchFilter = searchQuery ? { $text: { $search: searchQuery.trim() } } : {};
    const filter = { community: mongoose.Types.ObjectId(communityId), ...searchFilter };

    const paginationOptions: IPaginateOptions<IPostDocument> = {
      model: this.postModel,
      filter: filter,
      page: page,
      pageSize: pageSize,
      populateQuery: [{ path: 'user' }, { path: 'attachments' }],
    };

    const results = await paginate(paginationOptions);

    return results;
  }

  async getPosts(options: { page: number; pageSize: number; userId: string; searchQuery?: string }) {
    const { page, pageSize, userId, searchQuery } = options;

    const searchFilter = searchQuery ? { $text: { $search: searchQuery.trim() } } : {};
    const filter = userId ? { user: mongoose.Types.ObjectId(userId), ...searchFilter } : { ...searchFilter };

    const paginationOptions: IPaginateOptions<IPostDocument> = {
      model: this.postModel,
      filter: filter,
      page: page,
      pageSize: pageSize,
      populateQuery: [{ path: 'user' }, { path: 'attachments' }],
    };

    const results = await paginate(paginationOptions);

    return results;
  }

  async getPost(postId: string) {
    const post = await this.postModel
      .findById(mongoose.Types.ObjectId(postId))
      .populate({ path: 'user' })
      .populate({ path: 'attachments' });
    if (!post) throw new ValidationError('Post not found');

    return post;
  }

  async postComments(options: { page: number; pageSize: number; postId: string }) {
    const { page, pageSize, postId } = options;

    const post = await this.postModel.findById(mongoose.Types.ObjectId(postId));

    if (!post) throw new ValidationError('Request not valid');

    const filter = { _id: { $in: post.comments } };
    const paginationOptions: IPaginateOptions<ICommentDocument> = {
      model: this.commentModel,
      filter: filter,
      page: page,
      pageSize: pageSize,
      populateQuery: [{ path: 'user' }, { path: 'replies' }],
    };

    const results = await paginate(paginationOptions);
    return results;
  }

  private async uploadAttachments(attachments: Multer.File[]) {
    const attachmentIds = [];

    for (let currentAttachmentIndex = 0; currentAttachmentIndex < attachments.length; currentAttachmentIndex++) {
      const attachment = attachments[currentAttachmentIndex];

      const result = await this.postAttachmentModel.create({ image: attachment.location });
      attachmentIds.push(result._id);
    }

    return attachmentIds;
  }

  async createPost(createPostInputDTO: ICreatePostInputDTO, attachment: Multer.File, user: IUser) {
    let attachmentList = [];

    if (attachment) {
      attachmentList = await this.uploadAttachments([attachment]);
    }

    createPostInputDTO['user'] = user._id;

    const post = new this.postModel(createPostInputDTO);

    if (attachmentList.length) {
      post.attachments.push(...attachmentList);
    }

    if (createPostInputDTO.communityId) {
      const community = await this.communityModel.findById(mongoose.Types.ObjectId(createPostInputDTO.communityId));

      if (community) {
        post.community = community._id;
      }
    }
    await post.save();
    const postObject = await this.postModel
      .findById(post._id)
      .populate({ path: 'user' })
      .populate({ path: 'attachments' })
      .lean();
    return postObject;
  }

  async likePost(postId: string, userId: string): Promise<IPost> {
    const post = await this.postModel.findById(mongoose.Types.ObjectId(postId));
    if (!post) {
      throw new ValidationError('Post not found');
    }
    if (post.likes.includes(userId)) {
      return post;
    }

    post.likes.push(userId);
    await post.save();

    if (post.user.toString() != userId.toString()) {
      const notificationInstance = Container.get(NotificationService);
      await notificationInstance.SendNotification({
        recipient: post.user,
        message: 'Someone liked your post',
        title: 'New Post Like',
        type: NOTIFICATION_NEW_LIKE,
        actionId: postId,
      });
    }

    return post;
  }

  async unlikePost(postId: string, userId: string): Promise<void> {
    const post = await this.postModel.findById(mongoose.Types.ObjectId(postId));
    if (!post) {
      throw new ValidationError(`Post not found with id: ${postId}`);
    }
    if (!post.likes.includes(userId)) {
      return;
    }

    const index = post.likes.indexOf(userId);
    post.likes.splice(index, 1);

    await post.save();
  }

  async createComment(postId: string, content: string, userId: string): Promise<IComment> {
    const post = await this.postModel.findById(mongoose.Types.ObjectId(postId));
    if (!post) {
      throw new ValidationError('Post not found');
    }
    const comment = await this.commentModel.create({ user: userId, post: post._id, content: content });
    post.comments.push(comment._id);
    await post.save();

    if (post.user.toString() != userId.toString()) {
      const notificationInstance = Container.get(NotificationService);
      await notificationInstance.SendNotification({
        recipient: post.user,
        message: 'A user commented on your post',
        title: 'New Comment',
        type: NOTIFICATION_NEW_COMMENT,
        actionId: postId,
      });
    }
    return comment;
  }

  async addReply(commentId: string, content: string, userId: string) {
    const comment = await this.commentModel.findById(mongoose.Types.ObjectId(commentId));
    if (!comment) {
      throw new ValidationError('Post not found');
    }

    const reply = await this.commentModel.create({ user: userId, post: comment.post, content });
    await this.commentModel.findByIdAndUpdate(comment._id, { $push: { replies: reply._id } });

    if (comment.user.toString() != userId.toString()) {
      const notificationInstance = Container.get(NotificationService);
      await notificationInstance.SendNotification({
        recipient: comment.user,
        message: 'A user replied to your comment',
        title: 'New Comment',
        type: NOTIFICATION_NEW_COMMENT,
        actionId: comment.post,
      });
    }
    return reply;
  }

  async likeComment(userId: string, commentId: string): Promise<IComment> {
    const comment = await this.commentModel.findById(mongoose.Types.ObjectId(commentId));
    if (!comment) {
      throw new Error('Comment not found');
    }
    if (comment.likes.includes(userId)) {
      return comment;
    }
    comment.likes.push(userId);
    await comment.save();
    return comment;
  }

  async unlikeComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.commentModel.findById(mongoose.Types.ObjectId(commentId));
    if (!comment) {
      throw new ValidationError(`Post not found with id: ${commentId}`);
    }
    if (!comment.likes.includes(userId)) {
      return;
    }

    const index = comment.likes.indexOf(userId);
    comment.likes.splice(index, 1);

    await comment.save();
  }

  async reportPost(postId: string, userId: string, reason: string): Promise<IReport> {
    const post = await this.postModel.findById(mongoose.Types.ObjectId(postId));
    if (!post) throw new ValidationError('Post not found');

    const reportData = {
      reporter: userId,
      reason,
      post: post._id,
    };

    const report = await this.reportModel.create(reportData);
    this.eventDispatcher.dispatch(events.notification.postReport, report);
    return report;
  }

  async reports(options: { page: number; pageSize: number }) {
    const { page, pageSize } = options;

    const filter = {};
    const paginationOptions: IPaginateOptions<IReportDocument> = {
      model: this.reportModel,
      filter: filter,
      page: page,
      pageSize: pageSize,
    };

    const results = await paginate(paginationOptions);

    return results;
  }

  async deletePost(postId: string, user: IUser): Promise<void> {
    const post = await this.postModel.findById(mongoose.Types.ObjectId(postId));
    if (!post) throw new ValidationError('Post not found');

    if (post.user.toString() != user._id.toString() && !user.isAdmin) {
      throw new UnauthorizedError("You're not allowed to carry out this action");
    }

    await this.postModel.deleteOne({ _id: mongoose.Types.ObjectId(postId) });
  }
}
