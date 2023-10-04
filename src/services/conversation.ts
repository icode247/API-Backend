// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Service, Inject } from 'typedi';
import mongoose from 'mongoose';
import { Logger } from 'winston';
import { Container } from 'typedi';
import * as socketIO from 'socket.io';
import { IPaginateOptions, paginate, paginateLocationQuery, IPaginationResult } from '../selectors/pagination';
import { IUser } from '../interfaces/IUser';
import { IConversation, IConversationDocument, IMessage, IMessageDocument } from '../interfaces/IConversation';
import { ValidationError } from '../config/exceptions';

@Service()
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class ConversationService {
  constructor(
    @Inject('userModel') private userModel: Models.UserModel,
    @Inject('conversationModel') private conversationModel: Models.ConversationModel,
    @Inject('messageModel') private messageModel: Models.MessageModel,
    @Inject('logger') private logger: Logger,
  ) {}

  async getOrCreateConversation(userOneId: string, userTwoId: string): Promise<IConversation> {
    const userTwo = await this.userModel.findById(mongoose.Types.ObjectId(userTwoId));

    if (!userTwo) throw new ValidationError('Request not valid!');

    const participants = [userOneId, userTwoId];
    let conversation = await this.conversationModel
      .findOne({
        participants: { $all: participants },
      })
      .populate([{ path: 'participants', select: '_id username photo fullname' }, { path: 'lastMessage' }]);

    if (!conversation) {
      const newConversation = new this.conversationModel({
        participants: participants,
      });
      await newConversation.save();

      conversation = await this.conversationModel
        .findById(newConversation._id)
        .populate([{ path: 'participants', select: '_id username photo fullname' }, { path: 'lastMessage' }]);
    }

    return conversation;
  }

  async getActiveUserConversations(
    userId: string,
    options: { page: number; pageSize: number; searchQuery?: string },
  ): Promise<IPaginationResult<IConversationDocument>> {
    const { page, pageSize, searchQuery } = options;

    const filter = { participants: { $in: [userId] }, lastMessage: { $ne: null } };

    if (searchQuery) {
      filter['participantsData.username'] = { $regex: new RegExp(searchQuery.trim(), 'i') };
    }

    const aggregationPipeline = [
      {
        $lookup: {
          from: 'users',
          localField: 'participants',
          foreignField: '_id',
          as: 'participantsData',
        },
      },
      {
        $unwind: '$participantsData',
      },
      {
        $lookup: {
          from: 'messages',
          localField: 'lastMessage',
          foreignField: '_id',
          as: 'lastMessageData',
        },
      },
      {
        $unwind: {
          path: '$lastMessageData',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: filter,
      },
      {
        $group: {
          _id: '$_id',
          createdAt: { $first: '$createdAt' },
          updatedAt: { $first: '$updatedAt' },
          participants: { $addToSet: '$participantsData' },
          lastMessageData: { $first: '$lastMessageData' },
        },
      },
      {
        $sort: {
          'lastMessageData.createdAt': -1,
          createdAt: -1,
        },
      },
      {
        $project: {
          _id: 1,
          createdAt: 1,
          updatedAt: 1,
          participants: {
            _id: 1,
            username: 1,
            photo: 1,
            fullname: 1,
          },
          lastMessage: '$lastMessageData',
        },
      },
    ];

    const paginationOptions: IPaginateOptions<IConversationDocument> = {
      model: this.conversationModel,
      filter: aggregationPipeline,
      page: page,
      pageSize: pageSize,
    };

    const results = await paginateLocationQuery(paginationOptions);

    const conversationsWithUnreadCounts = await Promise.all(
      results.data.map(async conversation => {
        console.log('Looking hrere::: ', conversation);
        const unreadMessages = await this.messageModel.countDocuments({
          conversation: conversation._id,
          sender: { $ne: userId },
          status: 'unread',
        });

        return {
          ...conversation,
          unreadMessages,
        };
      }),
    );

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    results.data = conversationsWithUnreadCounts;
    return results;
  }

  async createMessage(
    sender: IUser,
    conversationId: string,
    message: string,
    replying: string | undefined | null,
    attachment: Multer.File,
  ): Promise<IMessage> {
    const socketIO: socketIO.Server = Container.get('io');

    const conversation = await this.conversationModel
      .findById(mongoose.Types.ObjectId(conversationId))
      .populate([{ path: 'participants', select: '_id username photo fullname' }]);
    if (!conversation) throw new ValidationError('Request not valid!');

    const recipientIndex = conversation.participants.findIndex(p => !mongoose.Types.ObjectId(sender._id).equals(p._id));

    if (recipientIndex === -1) throw new ValidationError('Request not valid!');

    const recipient = conversation.participants[recipientIndex];

    const messageData = {
      conversation: conversation._id,
      sender,
      message,
      recipient,
    };

    if (attachment) {
      messageData['attachment'] = attachment.location;
    }

    if (!attachment && !message) {
      throw new ValidationError('No message content added!');
    }

    if (replying) {
      const repliedMessage = await this.messageModel.findById(mongoose.Types.ObjectId(replying));
      messageData['replying'] = repliedMessage;
    }

    const newMessage = await this.messageModel.create(messageData);

    const messageObject = {
      ...newMessage.toObject(),
      recipient,
      sender: sender,
      replying: messageData['replying'],
    };

    socketIO.emit(`conversation-${conversation._id}`, messageObject);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    socketIO.emit(`message-alert-${recipient._id}`, messageObject);
    conversation.lastMessage = newMessage._id;
    await conversation.save();
    return messageObject;
  }

  async getMessages(
    conversationId: string,
    currentUserId: string,
    options: { page: number; pageSize: number },
  ): Promise<IPaginationResult<IMessageDocument>> {
    const { page, pageSize } = options;

    const conversation = await this.conversationModel.findById(mongoose.Types.ObjectId(conversationId));
    if (!conversation) throw new ValidationError('Request not valid!');

    const userIndex = conversation.participants.findIndex(p => p._id.toString() == currentUserId.toString());
    if (userIndex === -1) throw new ValidationError('You are not part of this conversation');

    const filter = { conversation: conversationId };
    const paginationOptions: IPaginateOptions<IMessageDocument> = {
      model: this.messageModel,
      filter: filter,
      page: page,
      pageSize: pageSize,
      sortQuery: { createdAt: -1 },
      populateQuery: [
        { path: 'recipient', select: '_id username photo fullname' },
        { path: 'sender', select: '_id username photo fullname' },
        { path: 'replying' },
      ],
    };

    const results = await paginate(paginationOptions);
    return results;
  }

  async markMessageAsRead(conversationId: string, userId: string) {
    await this.messageModel.updateMany(
      {
        conversation: conversationId,
        recipient: userId,
        status: 'unread',
      },
      { $set: { status: 'read' } },
    );
  }

  async getUnreadMessagesCount(userId: string): Promise<number> {
    const unreadMessages = await this.messageModel.countDocuments({
      recipient: userId,
      status: 'unread',
    });

    return unreadMessages;
  }
}
