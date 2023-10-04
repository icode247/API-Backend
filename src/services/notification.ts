// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Service, Inject } from 'typedi';
import mongoose from 'mongoose';
import { INewNotificationInputDTO, INotificationDocument } from '../interfaces/INotification';
import { IPaginateOptions, paginate } from '../selectors/pagination';
import { ValidationError } from '../config/exceptions';
import { enqueueNotification } from '../selectors/notification';

@Service()
export default class NotificationService {
  constructor(
    @Inject('notificationModel') private notificationModel: Models.NotificationModel,
    @Inject('userModel') private userModel: Models.UserModel,
    @Inject('logger') private logger,
  ) {}

  public async NotificationsList(options: { page: number; pageSize: number; userId: string }) {
    const { page, pageSize, userId } = options;

    const filter = { recipient: mongoose.Types.ObjectId(userId) };
    const paginationOptions: IPaginateOptions<INotificationDocument> = {
      model: this.notificationModel,
      filter: filter,
      page: page,
      pageSize: pageSize,
    };

    const results = await paginate(paginationOptions);

    return results;
  }

  public async updateNotificationStatus(notificationId: string): Promise<void> {
    try {
      const notification = await this.notificationModel.findById(mongoose.Types.ObjectId(notificationId));

      if (!notification) {
        throw new ValidationError('Request not valid. Please try again!');
      }

      notification.isRead = true;
      await notification.save();
    } catch (err) {
      this.logger.error(err);
      throw err;
    }
  }

  public async SendNotification(notificationInputDTO: INewNotificationInputDTO): Promise<void> {
    try {
      const user = await this.userModel.findById(mongoose.Types.ObjectId(notificationInputDTO.recipient));

      if (!user) {
        throw new ValidationError('Request not valid');
      }

      await this.notificationModel.create(notificationInputDTO);
      const notificationData = {
        notification: {
          body: notificationInputDTO.message,
          title: notificationInputDTO.title,
        },
        priority: 'high',
        data: {
          body: notificationInputDTO.message,
          title: notificationInputDTO.title,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          sound: 'default',
        },
        to: user.fcm_tokens,
      };
      await enqueueNotification(notificationData);
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async notifyAdmins(messageData: { title: string; message: string; actionId: string; type: string; }) {
    try {
      const admins = await this.userModel.find({ isAdmin: true });

      if (!admins.length) return;

      for (let adminIndex = 0; adminIndex < admins.length; adminIndex++) {
        const data: INewNotificationInputDTO = {
          ...messageData,
          recipient: admins[adminIndex]._id,
        };

        await this.notificationModel.create(data);
      }
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public truncate(input: string): string {
    return input.length > 5 ? `${input.substring(0, 5)}...` : input;
  }
}
