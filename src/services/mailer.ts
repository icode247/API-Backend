// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Service, Inject } from 'typedi';
import ejs from 'ejs';
import path from 'path';

@Service()
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default class MailerService {
  private serviceName = 'Hiroek';
  constructor(@Inject('emailClient') private emailClient, @Inject('emailDomain') private emailDomain) {}

  public async SendWelcomeEmail(email: string, otp: string) {
    const template = path.join(__dirname, '../templates/email-templates/send_welcome_email.ejs');
    const emailBody = await ejs.renderFile(template, { otp, serviceName: this.serviceName });
    const data = {
      from: 'Excited User <me@samples.mailgun.org>',
      to: [email],
      subject: 'Welcome to Hiroek',
      html: emailBody,
    };
    try {
      this.emailClient.messages.create(this.emailDomain, data);
      return { delivered: 1, status: 'ok' };
    } catch (e) {
      return { delivered: 0, status: 'error' };
    }
  }

  public async SendVerifyOTPMail(email: string, otp: string) {
    const template = path.join(__dirname, '../templates/email-templates/verify_email.ejs');
    const emailBody = await ejs.renderFile(template, { otp, serviceName: this.serviceName });

    const data = {
      from: 'Excited User <me@samples.mailgun.org>',
      to: [email],
      subject: 'Hiroek - Email Verification',
      html: emailBody,
    };
    try {
      this.emailClient.messages.create(this.emailDomain, data);
      return { delivered: 1, status: 'ok' };
    } catch (e) {
      return { delivered: 0, status: 'error' };
    }
  }

  public async SendPasswordResetRequestMail(email: string, resetCode: string) {
    const template = path.join(__dirname, '../templates/email-templates/reset_password.ejs');
    const emailBody = await ejs.renderFile(template, { resetCode, serviceName: this.serviceName });

    const data = {
      from: 'Excited User <me@samples.mailgun.org>',
      to: [email],
      subject: 'Hiroek - Password Reset Request',
      html: emailBody,
    };
    try {
      this.emailClient.messages.create(this.emailDomain, data);
      return { delivered: 1, status: 'ok' };
    } catch (e) {
      return { delivered: 0, status: 'error' };
    }
  }
}
