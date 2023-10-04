import { CreateCommunityInputDTO, ICommunity, ICommunityDocument } from '../interfaces/ICommunity';
import mongoose from 'mongoose';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Service, Inject, Container } from 'typedi';
import { IUser, IUserDocument } from '../interfaces/IUser';
import { Logger } from 'winston';
import events from '../subscribers/events';
import { IReport } from '../interfaces/IPost';
import { paginate, IPaginationResult, IPaginateOptions } from '../selectors/pagination';
import { EventDispatcher, EventDispatcherInterface } from '../decorators/eventDispatcher';
import { FilterQuery } from 'mongoose';
import NotificationService from './notification';
import { ValidationError } from '../config/exceptions';
import { NOTIFICATION_COMMUNITY_INVITE } from '../utils/constants';

@Service()
class CommunityService {
  constructor(
    @Inject('communityModel') private communityModel: Models.CommunityModel,
    @Inject('postModel') private postModel: Models.PostModel,
    @Inject('userModel') private userModel: Models.UserModel,
    @Inject('reportModel') private reportModel: Models.ReportModel,
    @Inject('logger') private logger: Logger,
    @Inject('interestModel') private interestModel: Models.InterestModel,
    @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
  ) {}

  async sendInvite(community: ICommunityDocument, invitees: IUserDocument[]): Promise<void> {
    const notificationInstance = Container.get(NotificationService);

    invitees.forEach(async invitee => {
      if (!community.members.includes(invitee._id)) {
        community.invitees.push(invitee._id);

        await notificationInstance.SendNotification({
          recipient: invitee._id,
          message: 'You have been invited to join a community',
          title: 'Community Invite Request',
          type: NOTIFICATION_COMMUNITY_INVITE,
          actionId: community._id,
        });
      }
    });

    await community.save();
  }

  async createCommunity(
    communityInput: CreateCommunityInputDTO,
    adminId: string,
    photo: Multer.File,
  ): Promise<ICommunity> {
    try {
      const communityData: Partial<ICommunity> = {
        name: communityInput.name,
        description: communityInput.description,
        admin: adminId,
      };

      if (photo) {
        communityData['photo'] = photo.location;
      }

      const interestIds = await this.interestModel.find({ _id: { $in: communityInput.interests } }).distinct('_id');
      const invitees = await this.userModel.find({ _id: { $in: communityInput.invitees } }).select('_id fcm_tokens');

      communityData.interests = interestIds;

      const community = await this.communityModel.create({ ...communityData });

      await this.sendInvite(community, invitees);

      community.members.push(adminId);

      await community.save();

      return community;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async getCommunity(communityId: string): Promise<ICommunityDocument> {
    try {
      const result = await this.communityModel.aggregate([
        {
          $match: { _id: mongoose.Types.ObjectId(communityId) },
        },
        {
          $lookup: {
            from: 'posts',
            let: { communityId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$community', '$$communityId'],
                  },
                },
              },
              {
                $count: 'totalPosts',
              },
            ],
            as: 'posts',
          },
        },
        {
          $addFields: {
            totalMembers: { $size: '$members' },
            totalPosts: {
              $ifNull: [{ $arrayElemAt: ['$posts.totalPosts', 0] }, 0],
            },
          },
        },
      ]);

      if (result.length > 0) {
        const community = result[0];
        return community;
      }

      throw new ValidationError('Community does not exist');
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async getCommunityMembers(
    communityId: string,
    options: {
      page: number;
      pageSize: number;
    },
  ): Promise<IPaginationResult<IUserDocument>> {
    const { page, pageSize } = options;
    const community = await this.communityModel.findById(communityId);

    if (!community) {
      throw new ValidationError('Community not found');
    }

    const filter = {
      _id: { $in: community.members },
    };

    const paginationOptions: IPaginateOptions<IUserDocument> = {
      model: this.userModel,
      filter: filter,
      page: page,
      pageSize: pageSize,
    };

    const results = await paginate(paginationOptions);
    return results;
  }

  async inviteFriends(communityId: string, invitees: string[]): Promise<ICommunity> {
    const community = await this.communityModel.findById(communityId);

    if (!community) {
      throw new ValidationError('Community not found');
    }

    const inviteesData = await this.userModel.find({ _id: { $in: invitees } }).select('_id fcm_tokens');

    await this.sendInvite(community, inviteesData);

    await community.save();

    return community;
  }

  async leaveCommunity(communityId: string, memberId: string): Promise<void> {
    const community = await this.communityModel.findById(communityId);

    if (!community) {
      throw new ValidationError('Community not found');
    }

    const memberIndex = community.members.indexOf(memberId);

    if (memberIndex === -1) {
      throw new ValidationError('You are not a member of this community');
    }

    community.members.splice(memberIndex, 1);
    await community.save();
  }

  async removeFriend(communityId: string, adminId: string, memberId: string): Promise<void> {
    const notificationInstance = Container.get(NotificationService);
    const community = await this.communityModel.findById(communityId);
    const member = await this.userModel.findById(memberId);

    if (!community) {
      throw new ValidationError('Community not found');
    }

    if (community.admin.toString() !== adminId.toString()) {
      throw new ValidationError('You are not authorized to remove someone from this community');
    }

    const friendIndex = community.members.indexOf(memberId);

    if (friendIndex === -1) {
      throw new ValidationError('This person is not a member of this community');
    }

    community.members.splice(friendIndex, 1);
    community.save();
  }

  async joinCommunity(communityId: string, userId: string): Promise<ICommunity> {
    const community = await this.communityModel.findById(communityId);

    if (!community) {
      throw new ValidationError('Community not found');
    }

    const memberIndex = community.members.indexOf(userId);
    if (memberIndex > -1) {
      throw new ValidationError("You're already a member of this community");
    }

    community.members.push(userId);
    await community.save();
    return community;
  }

  async suggestCommunities(
    user: IUser,
    options: {
      searchQuery?: string;
      page: number;
      pageSize: number;
    },
  ): Promise<IPaginationResult<ICommunityDocument>> {
    const { searchQuery, page, pageSize } = options;
    const userInterests = user.interest || [];

    const filter: FilterQuery<ICommunityDocument> = {};

    if (searchQuery) {
      filter.name = { $regex: searchQuery, $options: 'i' };
    }

    const pipeline = [
      {
        $match: filter,
      },
      {
        $addFields: {
          sharedInterests: {
            $size: {
              $setIntersection: [userInterests, '$interests'],
            },
          },
        },
      },
      {
        $addFields: {
          score: {
            $sum: ['$sharedInterests'],
          },
        },
      },
      {
        $lookup: {
          from: 'posts',
          let: { communityId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$community', '$$communityId'],
                },
              },
            },
            {
              $count: 'totalPosts',
            },
          ],
          as: 'posts',
        },
      },
      {
        $lookup: {
          from: 'users', // The name of the collection (not the model)
          localField: 'members',
          foreignField: '_id',
          as: 'members', // The field name to populate
        },
      },
      {
        $addFields: {
          totalMembers: { $size: '$members' },
          totalPosts: {
            $ifNull: [{ $arrayElemAt: ['$posts.totalPosts', 0] }, 0],
          },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          admin: 1,
          interests: 1,
          photo: 1,
          totalMembers: 1,
          totalPosts: 1,
          members: {
            _id: 1,
            fullname: 1,
            username: 1,
            email: 1,
            photo: 1,
          },
        },
      },
      { $sort: { score: -1 } },
    ];

    const query = this.communityModel.aggregate(pipeline);

    const paginationOptions: IPaginateOptions<ICommunityDocument> = {
      model: this.communityModel,
      filter: filter,
      page: page,
      pageSize: pageSize,
      findQuery: query,
    };

    const results = await paginate(paginationOptions);
    return results;
  }

  async getCommunitiesByPopularity(): Promise<ICommunity[]> {
    try {
      const topCommunities = await this.communityModel
        .find({})
        .populate([{ path: 'members', select: '_id username photo fullname' }])
        .sort({ members: -1 })
        .limit(6);

      return topCommunities;
    } catch (err) {
      return [];
    }
  }

  async getMutualCommunities(userId: string, currentUserId: string): Promise<ICommunity[]> {
    try {
      const mutualCommunities = await this.communityModel
        .find({ members: { $all: [userId, currentUserId] } })
        .populate([{ path: 'members', select: '_id username photo fullname' }]);
      return mutualCommunities;
    } catch (err) {
      return [];
    }
  }

  async getCommunitiesByTrending(): Promise<ICommunity[]> {
    try {
      const trendingCommunities = await this.communityModel.aggregate([
        {
          $lookup: {
            from: 'posts',
            localField: '_id',
            foreignField: 'community',
            as: 'posts',
          },
        },
        {
          $lookup: {
            from: 'users', // The name of the collection (not the model)
            localField: 'members',
            foreignField: '_id',
            as: 'members', // The field name to populate
          },
        },
        {
          $addFields: {
            totalLikes: {
              $sum: '$posts.likes',
            },
            totalComments: {
              $sum: '$posts.comments',
            },
            totalPosts: {
              $size: '$posts',
            },
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            description: 1,
            admin: 1,
            interests: 1,
            photo: 1,
            totalPosts: 1,
            totalComments: 1,
            totalLikes: 1,
            members: {
              _id: 1,
              fullname: 1,
              username: 1,
              email: 1,
              photo: 1,
            },
          },
        },
        {
          $sort: {
            totalPosts: -1,
            totalComments: -1,
            totalLikes: -1,
          },
        },
        {
          $limit: 5,
        },
      ]);

      return trendingCommunities;
    } catch (err) {
      console.error('Error fetching communities:', err);
      return [];
    }
  }

  async getHostedCommunities(userId: string, searchQuery: string | null): Promise<ICommunity[]> {
    const searchFilter = searchQuery ? { name: { $regex: new RegExp(searchQuery.trim(), 'i') } } : {};
    const filter = { admin: userId, ...searchFilter };
    const communities = await this.communityModel
      .find(filter)
      .populate([{ path: 'members', select: '_id username photo fullname' }]);
    return communities;
  }

  async getJoinedCommunities(userId: string, searchQuery: string | null): Promise<ICommunity[]> {
    const searchFilter = searchQuery ? { name: { $regex: new RegExp(searchQuery.trim(), 'i') } } : {};
    const communities = await this.communityModel
      .find({
        members: { $in: [userId] },
        ...searchFilter,
      })
      .populate([{ path: 'members', select: '_id username photo fullname' }]);
    return communities;
  }

  async reportCommunity(communityId: string, userId: string, reason: string): Promise<IReport> {
    const community = await this.communityModel.findById(mongoose.Types.ObjectId(communityId));
    if (!community) throw new ValidationError('Post not found');

    const reportData = {
      reporter: userId,
      reason,
      community: community._id,
    };

    const report = await this.reportModel.create(reportData);
    this.eventDispatcher.dispatch(events.notification.postReport, report);
    return report;
  }
}

export default CommunityService;
