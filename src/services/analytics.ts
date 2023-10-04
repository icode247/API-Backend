import { IPost } from '../interfaces/IPost';
import { IDonation } from '../interfaces/IPayment';
import { Inject } from 'typedi';
import { IUserReward } from '../interfaces/IUser';
import { IUser } from '../interfaces/IUser';

export class AnalyticsService {
  constructor(
    @Inject('donationModel') private donationModel: Models.DonationModel,
    @Inject('userRewardModel') private userRewardModel: Models.UserRewardModel,
    @Inject('organizationModel') private organizationModel: Models.OrganizationModel,
    @Inject('postModel') private postModel: Models.PostModel,
    @Inject('userModel') private userModel: Models.UserModel,
  ) {}
  async getUserDonations(userId: string): Promise<IDonation[]> {
    return this.donationModel.find({ user: userId, active: true }).exec();
  }

  async getCharityProgress(organizationId: string): Promise<{ fundRaised: number; totalDonations: number }> {
    const organization = await this.organizationModel.findById(organizationId).exec();
    return {
      fundRaised: organization?.fundRaised || 0,
      totalDonations: organization?.totalDonations || 0,
    };
  }

  async getPopularContent(): Promise<IPost[]> {
    return this.postModel.find().sort({ likes: -1 }).limit(10).exec();
  }

  async getUserRewards(userId: string): Promise<IUserReward> {
    return this.userRewardModel.findOne({ user: userId }).exec();
  }

  async getAnalytics(userId: string, organizationId: string): Promise<any> {
    const [userDonations, charityProgress, popularContent, userRewards] = await Promise.all([
      this.getUserDonations(userId),
      this.getCharityProgress(organizationId),
      this.getPopularContent(),
      this.getUserRewards(userId),
    ]);

    return {
      userDonations,
      charityProgress,
      popularContent,
      userRewards,
    };
  }
  async getAllUsers(): Promise<IUser[]> {
    return this.userModel.find().exec();
  }

  async getUserActivities(userId: string): Promise<{ donations: IDonation[]; posts: IPost[]; rewards: IUserReward[] }> {
    const [donations, posts, rewards] = await Promise.all([
      this.donationModel.find({ user: userId }).exec(),
      this.postModel.find({ user: userId }).exec(),
      this.userRewardModel.find({ user: userId }).exec(),
    ]);

    return { donations, posts, rewards };
  }

  async getAllUserActivities(): Promise<
    { user: IUser; activities: { donations: IDonation[]; posts: IPost[]; rewards: IUserReward[] } }[]
  > {
    const users = await this.getAllUsers();
    const userActivities = await Promise.all(
      users.map(async user => ({
        user,
        activities: await this.getUserActivities(user._id),
      })),
    );
    return userActivities;
  }

  async getAdminAnalytics(): Promise<{
    users: { user: IUser; activities: { donations: IDonation[]; posts: IPost[]; rewards: IUserReward[] } }[];
  }> {
    const users = await this.getAllUserActivities();
    return { users };
  }

  async getTransactions(): Promise<{ donations: IDonation[]; organizationDonations: IDonation[] }> {
    const [donations, organizationDonations] = await Promise.all([
      this.donationModel.find().exec(),
      this.donationModel.find({ organization: { $exists: true } }).exec(),
    ]);

    return { donations, organizationDonations };
  }

  async getAdminAnalyticsForTransactions(): Promise<{
    users: { user: IUser; activities: { donations: IDonation[]; posts: IPost[]; rewards: IUserReward[] } }[];
    transactions: { donations: IDonation[]; organizationDonations: IDonation[] };
    profits: number;
    revenue: number;
  }> {
    const [users, transactions] = await Promise.all([this.getAllUserActivities(), this.getTransactions()]);
    const donationsProfit = transactions.donations.reduce((acc, curr) => acc + curr.amount, 0) * 0.05;
    const organizationDonationsRevenue = transactions.organizationDonations.reduce((acc, curr) => acc + curr.amount, 0);
    const profits = donationsProfit + organizationDonationsRevenue;
    const revenue = organizationDonationsRevenue;

    return { users, transactions, profits, revenue };
  }
}
