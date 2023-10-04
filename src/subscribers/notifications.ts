import { Container } from 'typedi';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { EventSubscriber, On } from 'event-dispatch';
import events from './events';
import { IReport } from '../interfaces/IPost';
import { Logger } from 'winston';
import NotificationService from '../services/notification';
import { NOTIFICATION_COMMUNITY_REPORT, NOTIFICATION_POST_REPORT } from '../utils/constants';

@EventSubscriber()
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default class NotificationSubscriber {
  @On(events.notification.postReport)
  public async onPostReport({ reason, post }: Partial<IReport>) {
    const Logger: Logger = Container.get('logger');
    const notificationService: NotificationService = Container.get(NotificationService);

    try {
      const title = `A user reported a post`;
      const message = `A user reported a post with the following reason: ${reason}`;
      const data = {
        title,
        message,
        actionId: post,
        type: NOTIFICATION_POST_REPORT,
      };
      Logger.silly('sending report to all admins');
      await notificationService.notifyAdmins(data);
    } catch (e) {
      Logger.error(`🔥 Error on event ${events.notification.postReport}: %o`, e);

      throw e;
    }
  }

  @On(events.notification.communityReport)
  public async onCommunityReport({ reason, community }: Partial<IReport>) {
    const Logger: Logger = Container.get('logger');
    const notificationService: NotificationService = Container.get(NotificationService);

    try {
      const title = `A user reported a community`;
      const message = `A user reported a community with the following reason: ${reason}`;
      const data = {
        title,
        message,
        actionId: community,
        type: NOTIFICATION_COMMUNITY_REPORT,
      };
      Logger.silly('sending report to all admins');
      await notificationService.notifyAdmins(data);
    } catch (e) {
      Logger.error(`🔥 Error on event ${events.notification.communityReport}: %o`, e);

      throw e;
    }
  }
}
