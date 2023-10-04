// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Service, Inject } from 'typedi';
import { Twilio } from 'twilio';
import config from '../config';

@Service()
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default class SMSService {
  constructor(@Inject('smsClient') private smsClient: Twilio) {}

  public async sendSMS(phoneNumber: string, message: string) {
    try {
      const response = await this.smsClient.messages.create({
        from: config.sms.smsSender,
        to: phoneNumber,
        body: message,
      });
      return { delivered: 1, status: 'ok', messageId: response.sid };
    } catch (e) {
      return { delivered: 0, status: 'error', error: e.message };
    }
  }

  public async sendVerificationSMS(phoneNumber: string, callingCode: string, otp: string) {
    const message = `Please use this OTP code: ${otp} to verify your account. OTP code expires after 5 minutes. This OTP is not to be shared with anyone`;
    const numberWithCallingCode = `+${callingCode + phoneNumber}`;

    const response = await this.sendSMS(numberWithCallingCode, message);
    return response;
  }
}
