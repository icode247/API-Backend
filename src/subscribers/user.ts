import { Container } from 'typedi';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { EventSubscriber, On } from 'event-dispatch';
import events from './events';
import { TokenService } from '../services/auth';
import { IUser } from '../interfaces/IUser';
import { Logger } from 'winston';
import MailerService from '../services/mailer';
import SMSService from '../services/sms';

@EventSubscriber()
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default class UserSubscriber {
  @On(events.user.emailSignUp)
  public async onEmailSignUp({ _id, email }: Partial<IUser>) {
    const Logger: Logger = Container.get('logger');
    const mailerService: MailerService = Container.get(MailerService);

    try {
      const tokenServiceInstance = Container.get(TokenService);
      const otpKey = `otp-${_id}`;

      const token = await tokenServiceInstance.createToken(null, otpKey);
      Logger.info(`OTP generated: ${token}`);

      Logger.silly('Sending welcome email');
      await mailerService.SendWelcomeEmail(email, token);
    } catch (e) {
      Logger.error(`🔥 Error on event ${events.user.emailSignUp}: %o`, e);

      throw e;
    }
  }

  @On(events.user.emailSignin)
  public async onEmailSignIn({ _id, email }: Partial<IUser>) {
    const Logger: Logger = Container.get('logger');
    const mailerService: MailerService = Container.get(MailerService);

    try {
      const tokenServiceInstance = Container.get(TokenService);
      const otpKey = `otp-${_id}`;

      const token = await tokenServiceInstance.createToken(null, otpKey);
      Logger.info(`OTP generated: ${token}`);

      Logger.silly('Sending verify OTP email');
      await mailerService.SendVerifyOTPMail(email, token);
    } catch (e) {
      Logger.error(`🔥 Error on event ${events.user.emailSignUp}: %o`, e);

      throw e;
    }
  }

  @On(events.user.phoneSignin)
  public async onPhoneSignin({ _id, phone, callingCode }: Partial<IUser>) {
    const Logger: Logger = Container.get('logger');
    const smsService: SMSService = Container.get(SMSService);

    try {
      const tokenServiceInstance = Container.get(TokenService);
      const otpKey = `otp-${_id}`;

      const token = await tokenServiceInstance.createToken(null, otpKey);
      Logger.info(`OTP generated: ${token}`);

      Logger.silly('Sending verify OTP sms');
      await smsService.sendVerificationSMS(phone, callingCode, token);
    } catch (e) {
      Logger.error(`🔥 Error on event ${events.user.phoneSignin}: %o`, e);

      throw e;
    }
  }
}
