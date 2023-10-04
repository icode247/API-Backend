// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Service, Inject, Container } from 'typedi';
import { Document } from 'mongoose';
import mongoose from 'mongoose';
import argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { IUser, IUserDocument, IProfileUpdateInputDTO, IContactsImportInputDTO } from '../interfaces/IUser';
import NotificationService from './notification';
import { IInterestDocument } from '../interfaces/IInterest';
import { ValidationError } from '../config/exceptions';
import { IPaginateOptions, paginate } from '../selectors/pagination';
import moment from 'moment';
import { NOTIFICATION_FOLLOW } from '../utils/constants';

@Service()
export default class UserService {
  constructor(
    @Inject('userModel') private userModel: Models.UserModel,
    @Inject('postModel') private postModel: Models.PostModel,
    @Inject('eventModel') private eventModel: Models.EventModel,
    @Inject('donationModel') private donationModel: Models.DonationModel,
    @Inject('userRewardModel') private userRewardModel: Models.UserRewardModel,
    @Inject('logger') private logger,
    @Inject('interestModel') private interestModel: Models.InterestModel,
  ) {}

  public async UserProfileUpdate(
    userDetails: IUser & Document,
    profileUpdateInputDTO: IProfileUpdateInputDTO,
    photo: Multer.File,
  ): Promise<IUser> {
    try {
      const salt = randomBytes(32);

      const fields = {};

      if (photo) {
        fields['photo'] = photo.location;
      }

      if (profileUpdateInputDTO.latitude && profileUpdateInputDTO.longitude) {
        fields['loc'] = {
          type: 'Point',
          coordinates: [profileUpdateInputDTO.longitude, profileUpdateInputDTO.latitude],
        };
      }

      if (profileUpdateInputDTO.birthDate) {
        fields['birthDate'] = moment.utc(profileUpdateInputDTO.birthDate);
        Reflect.deleteProperty(profileUpdateInputDTO, 'birthDate');
      }

      if (profileUpdateInputDTO.password) {
        this.logger.silly('Hashing password');
        const hashedPassword = await argon2.hash(profileUpdateInputDTO.password, { salt });
        fields['password'] = hashedPassword;
        fields['salt'] = salt.toString('hex');
      }

      this.logger.silly('Updating user record');
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      await this.userModel.updateOne({ _id: userDetails._id }, { ...profileUpdateInputDTO, ...fields });

      const userRecord = await this.userModel.findById(userDetails._id);

      const user = userRecord.toObject();
      Reflect.deleteProperty(user, 'password');
      Reflect.deleteProperty(user, 'salt');
      return user;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async UserProfileById(userId: string) {
    try {
      const userRecord = await this.userModel.findById(mongoose.Types.ObjectId(userId));

      if (!userRecord) {
        throw new ValidationError('User account does not exist');
      }

      const user = userRecord.toObject();
      Reflect.deleteProperty(user, 'password');
      Reflect.deleteProperty(user, 'salt');
      return user;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async updateUserInterests(interests: string[], userId: string): Promise<IUser | null> {
    try {
      const interestIds = await this.interestModel.find({ _id: { $in: interests } }).distinct('_id');

      const filter = { _id: userId };
      const update = { $addToSet: { interest: { $each: interestIds } } };
      const options = { new: true };
      await this.userModel.updateOne(filter, update, options);

      const updatedUser = await this.userModel.findOne({ _id: userId });

      return updatedUser;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async UserFollow(currentUserId: string, userId: string): Promise<void> {
    const currentUser = await this.userModel.findById(mongoose.Types.ObjectId(currentUserId));
    const userToFollow = await this.userModel.findById(mongoose.Types.ObjectId(userId));

    if (!userToFollow) {
      throw new ValidationError('User not found');
    }

    if (!currentUser.following.includes(userId)) {
      currentUser.following.push(userId);
      userToFollow.followers.push(currentUserId);

      await currentUser.save();
      await userToFollow.save();

      const notificationInstance = Container.get(NotificationService);
      await notificationInstance.SendNotification({
        recipient: userId,
        message: `${userToFollow.fullname ?? userToFollow.username} You have a new follower`,
        title: 'New Follower',
        actionId: currentUser._id,
        type: NOTIFICATION_FOLLOW,
      });
    }
  }

  public async UserUnFollow(currentUserId: string, userId: string): Promise<void> {
    const currentUser = await this.userModel.findById(mongoose.Types.ObjectId(currentUserId));
    const userToUnfollow = await this.userModel.findById(mongoose.Types.ObjectId(userId));

    if (!userToUnfollow) {
      throw new ValidationError('User not found');
    }

    if (currentUser.following.includes(userId)) {
      const unfollowUserIndex = currentUser.following.indexOf(userId);
      const followingIndex = userToUnfollow.followers.indexOf(currentUserId);

      currentUser.following.splice(unfollowUserIndex, 1);
      userToUnfollow.followers.splice(followingIndex, 1);

      await currentUser.save();
      await userToUnfollow.save();
    }
  }

  public async UserFollowing(options: { page: number; pageSize: number; userId: string }) {
    const { page, pageSize, userId } = options;

    const user = await this.userModel.findById(mongoose.Types.ObjectId(userId));

    if (!user) {
      throw new ValidationError('User not found');
    }

    const filter = { _id: { $in: user.following }, role: 'user' };
    const paginationOptions: IPaginateOptions<IUserDocument> = {
      model: this.userModel,
      filter: filter,
      page: page,
      pageSize: pageSize,
    };

    const results = await paginate(paginationOptions);

    return results;
  }

  public async UserFollowers(options: { page: number; pageSize: number; userId: string }) {
    const { page, pageSize, userId } = options;

    const user = await this.userModel.findById(mongoose.Types.ObjectId(userId));

    if (!user) {
      throw new ValidationError('User not found');
    }

    const filter = { _id: { $in: user.followers }, role: 'user' };
    const paginationOptions: IPaginateOptions<IUserDocument> = {
      model: this.userModel,
      filter: filter,
      page: page,
      pageSize: pageSize,
    };

    const results = await paginate(paginationOptions);

    return results;
  }

  public async UserFriends(userId: string, options: { page: number; pageSize: number }) {
    const { page, pageSize } = options;

    const user = await this.userModel.findById(mongoose.Types.ObjectId(userId));

    if (!user) {
      throw new ValidationError('User not found');
    }

    const userFollowers = user.followers || [];
    const userFollowings = user.following || [];
    const friendsIds = [...userFollowers, ...userFollowings];

    const filter = { _id: { $in: friendsIds }, role: 'user' };
    const paginationOptions: IPaginateOptions<IUserDocument> = {
      model: this.userModel,
      filter: filter,
      page: page,
      pageSize: pageSize,
    };

    const results = await paginate(paginationOptions);

    return results;
  }

  public async Interests(options: { page: number; pageSize: number; displayOthers?: string }) {
    const { page, pageSize, displayOthers } = options;
    const filter = {};

    if (displayOthers) {
      const user = await this.userModel.findById(mongoose.Types.ObjectId(displayOthers));
      if (!user) {
        throw new ValidationError('Request not valid!');
      }
      filter['_id'] = { $nin: user.interest };
    }

    const paginationOptions: IPaginateOptions<IInterestDocument> = {
      model: this.interestModel,
      filter: filter,
      page: page,
      pageSize: pageSize,
    };

    const results = await paginate(paginationOptions);

    return results;
  }

  public async UserList(options: { page: number; pageSize: number; query: string }) {
    const { page, pageSize, query } = options;
    const filter = query ? { $text: { $search: query.trim() } } : {};

    const paginationOptions: IPaginateOptions<IUserDocument> = {
      model: this.userModel,
      filter: filter,
      page: page,
      pageSize: pageSize,
    };

    const results = await paginate(paginationOptions);

    return results;
  }

  public async BlockUser(userId: string): Promise<void> {
    const user = await this.userModel.findById(mongoose.Types.ObjectId(userId));

    if (!user) {
      throw new ValidationError('User not found');
    }

    if (!user.blocked) {
      await this.userModel.updateOne({ _id: mongoose.Types.ObjectId(userId) }, { blocked: true });
    }
  }

  public async UnblockUser(userId: string): Promise<void> {
    const user = await this.userModel.findById(mongoose.Types.ObjectId(userId));

    if (!user) {
      throw new ValidationError('User not found');
    }

    if (user.blocked) {
      await this.userModel.updateOne({ _id: mongoose.Types.ObjectId(userId) }, { blocked: false });
    }
  }

  public async UserImportContacts(userId: string, contacts: IContactsImportInputDTO): Promise<void> {
    try {
      const contactIds = await this.userModel.find({ phone: { $in: contacts.phone } }).distinct('_id');

      await this.userModel.findOneAndUpdate(
        { _id: userId },
        { $addToSet: { importedContacts: { $each: contactIds } } },
        { new: true },
      );
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async UserSuggestions(user: IUser, options: { page: number; pageSize: number }) {
    const { page, pageSize } = options;
    const importedContactsIds = user.importedContacts || [];
    const userInterests = user.interest || [];
    const followedUsersIds = user.following.map(user => user);

    const filter = {
      $and: [{ _id: { $ne: user._id } }, { _id: { $nin: followedUsersIds } }, { role: 'user' }],
    };

    const pipeline = [
      {
        $match: filter,
      },
      {
        $addFields: {
          sharedContacts: {
            $size: {
              $setIntersection: [importedContactsIds, '$importedContacts'],
            },
          },
          sharedInterests: {
            $size: {
              $setIntersection: [userInterests, '$interest'],
            },
          },
        },
      },
      {
        $addFields: {
          score: {
            $sum: ['$sharedInterests', { $multiply: ['$sharedContacts', 2] }],
          },
          isInImportedContacts: {
            $in: ['$_id', importedContactsIds],
          },
        },
      },
      { $sort: { score: -1, isInImportedContacts: -1 } },
    ];

    const query = this.userModel.aggregate(pipeline);
    const paginationOptions: IPaginateOptions<IUserDocument> = {
      model: this.userModel,
      filter: filter,
      page: page,
      pageSize: pageSize,
      findQuery: query,
    };

    const results = await paginate(paginationOptions);

    return results;
  }

  public async UserStats(userId: string) {
    const user = await this.userModel.findById(mongoose.Types.ObjectId(userId));

    if (!user) {
      throw new ValidationError('User not found');
    }

    let totalPoints = 0;
    const userRewardDoc = await this.userRewardModel.findOne({ user: userId });

    if (userRewardDoc) {
      totalPoints = userRewardDoc.points;
    }

    const totalDonations = await this.donationModel.find({ status: { $ne: 'pending' }, user: userId }).count();
    const totalPosts = await this.postModel.find({ user: userId }).count();

    const result = await this.eventModel.aggregate([
      { $match: { admin: mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, totalAmountRaised: { $sum: '$fundRaised' } } },
    ]);

    const amountRaised = result[0]?.totalAmountRaised ?? 0;

    const userFollowers = user.followers || [];
    const userFollowings = user.following || [];
    const friendsIds = [...userFollowers, ...userFollowings];

    const filter = { _id: { $in: friendsIds }, role: 'user' };
    const totalFriends = await this.userModel.find(filter).count();

    return {
      totalPosts,
      totalDonations,
      totalPoints,
      totalFriends,
      amountRaised,
    };
  }
}
