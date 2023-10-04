import { Service, Inject } from 'typedi';
import { IUser } from '../interfaces/IUser';
import { IDonation } from '../interfaces/IPayment';

@Service()
export class ImpactService {
  constructor(
    @Inject('donationModel') private donationModel: Models.DonationModel,
    @Inject('userModel') private userModel: Models.UserModel,
  ) {}

  async getUserImpact(userId: string): Promise<any> {
    const user: IUser = await this.userModel.findOne({ _id: userId });
    const donations: IDonation[] = await this.donationModel.find({ user: userId });

    const totalDonated = donations.reduce((acc, cur) => acc + cur.amount, 0);

    const donationsOverTime = donations.reduce((acc, cur) => {
      const monthYear = new Date(cur.createdAt).toISOString().slice(0, 7);
      acc[monthYear] = acc[monthYear] ? acc[monthYear] + cur.amount : cur.amount;
      return acc;
    }, {});

    const causesSupported = donations.reduce((acc, cur) => {
      const index = acc.findIndex(c => c.organization === cur.organization);
      if (index === -1) {
        acc.push({ organization: cur.organization, amountDonated: cur.amount });
      } else {
        acc[index].amountDonated += cur.amount;
      }
      return acc;
    }, []);

    const amountAchievements = [100, 500, 1000, 5000, 10000];
    const achievements = amountAchievements
      .filter(amount => totalDonated >= amount)
      .map(amount => ({
        title: `Donated over ${amount / 100} dollars`,
        description: `You have donated over ${
          amount / 100
        } dollars to charities on our platform. Thank you for your generosity!`,
        //image: 'https://example.com/achievements/donated.png', if we need to prepare a badge for the user
      }));

    return { totalDonated, donationsOverTime, causesSupported, achievements };
  }
}
