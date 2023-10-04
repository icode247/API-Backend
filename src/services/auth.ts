// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Service, Inject, Container } from 'typedi';
import jwt, { SignOptions } from 'jsonwebtoken';
import axios from 'axios';
import crypto from 'crypto';
import config from '../config';
import argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { RedisClientType } from 'redis';
import MailerService from './mailer';
import {
  IUser,
  IEmailSignupInputDTO,
  IVerifyOTPInputDTO,
  IPasswordResetInputDTO,
  IPhoneSigninInputDTO,
} from '../interfaces/IUser';
import { getUserByEmail } from '../selectors/user';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { EventDispatcher, EventDispatcherInterface } from '../decorators/eventDispatcher';
import events from '../subscribers/events';
import { EmailAlreadyExistsError, ValidationError } from '../config/exceptions';
import { deleteFCMToken, addFCMToken } from '../selectors/user';

@Service()
export default class AuthService {
  constructor(
    @Inject('userModel') private userModel: Models.UserModel,
    @Inject('donationManagerModel') private donationManagerModel: Models.DonationManagerModel,
    @Inject('logger') private logger,
    private mailer: MailerService,
    @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
  ) {}

  public async SignUp(emailSignUpInputDTO: IEmailSignupInputDTO): Promise<void> {
    try {
      const salt = randomBytes(32);

      if (await getUserByEmail(emailSignUpInputDTO.email)) {
        throw new EmailAlreadyExistsError();
      }

      this.logger.silly('Hashing password');
      const hashedPassword = await argon2.hash(emailSignUpInputDTO.password, { salt });

      this.logger.silly('Creating user db record');
      const userRecord = await this.userModel.create({
        ...emailSignUpInputDTO,
        salt: salt.toString('hex'),
        password: hashedPassword,
      });

      if (!userRecord) {
        throw new ValidationError('User cannot be created');
      }

      await this.donationManagerModel.create({
        user: userRecord._id,
      });

      this.eventDispatcher.dispatch(events.user.emailSignUp, userRecord);
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async PhoneSignin(phoneSigninInputDTO: IPhoneSigninInputDTO): Promise<void> {
    try {
      let userRecord = await this.userModel.findOne({ phone: phoneSigninInputDTO.phone });

      if (!userRecord) {
        userRecord = await this.userModel.create({
          phone: phoneSigninInputDTO.phone,
          callingCode: phoneSigninInputDTO.callingCode,
        });

        await this.donationManagerModel.create({
          user: userRecord._id,
        });
      }

      if (userRecord.blocked) {
        throw new ValidationError('This account has been blocked by our admin.');
      }

      this.eventDispatcher.dispatch(events.user.phoneSignin, userRecord);
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async VerifyOTP(verifyOTPInputDTO: IVerifyOTPInputDTO): Promise<{ user: IUser; token: string }> {
    try {
      const userRecord = await this.userModel.findOne({
        $or: [{ email: verifyOTPInputDTO.phoneOrEmail }, { phone: verifyOTPInputDTO.phoneOrEmail }],
      });

      if (!userRecord) {
        throw new ValidationError('Request not valid. Please try again');
      }

      const tokenServiceInstance = Container.get(TokenService);
      const otpKey = `otp-${userRecord._id}`;

      if (!(await tokenServiceInstance.compareToken(otpKey, verifyOTPInputDTO.otp))) {
        throw new ValidationError('OTP not valid or has expired');
      }

      await tokenServiceInstance.deleteToken(otpKey);

      if (userRecord.blocked) {
        throw new ValidationError('This account has been blocked by our admin.');
      }

      await addFCMToken(userRecord.email, verifyOTPInputDTO.fcm_token);

      const token = this.generateToken(userRecord);

      const user = userRecord.toObject();
      Reflect.deleteProperty(user, 'password');
      Reflect.deleteProperty(user, 'salt');
      return { user, token };
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async EmailSignin(email: string, password: string): Promise<void> {
    const userRecord = await this.userModel.findOne({ email });
    if (!userRecord) {
      throw new ValidationError('Incorrect login credentials!');
    }
    /**
     * We use verify from argon2 to prevent 'timing based' attacks
     */
    this.logger.silly('Checking password');
    const validPassword = await argon2.verify(userRecord.password, password);
    if (validPassword) {
      this.logger.silly('Incorrect login credentials!');

      if (userRecord.blocked) {
        throw new ValidationError('This account has been blocked by our admin.');
      }
      this.eventDispatcher.dispatch(events.user.emailSignin, userRecord);
    } else {
      throw new ValidationError('Incorrect login credentials!');
    }
  }

  public async AdminSignin(email: string, password: string): Promise<{ user: IUser; token: string }> {
    const userRecord = await this.userModel.findOne({ email });
    if (!userRecord) {
      throw new ValidationError('Incorrect login credentials!');
    }
    /**
     * We use verify from argon2 to prevent 'timing based' attacks
     */
    this.logger.silly('Checking password');
    const validPassword = await argon2.verify(userRecord.password, password);
    if (validPassword) {
      this.logger.silly('Incorrect login credentials!');

      if (!userRecord.isAdmin) {
        throw new ValidationError('This account is not an admin account.');
      }

      const token = this.generateToken(userRecord);

      const user = userRecord.toObject();
      Reflect.deleteProperty(user, 'password');
      Reflect.deleteProperty(user, 'salt');
      return { user, token };
    } else {
      throw new ValidationError('Incorrect login credentials!');
    }
  }

  public async GoogleSignin(loginToken: string, fcm_token: string): Promise<{ user: IUser; jwtToken: string }> {
    try {
      const email = await this.googleLogin(loginToken);

      let userRecord = await this.userModel.findOne({ email });
      if (!userRecord) {
        const salt = randomBytes(32);
        const tokenServiceInstance = Container.get(TokenService);

        this.logger.silly('Hashing password');
        const hashedPassword = await argon2.hash(tokenServiceInstance.generateOTP(10), { salt });
        userRecord = await this.userModel.create({
          email: email,
          salt: salt.toString('hex'),
          password: hashedPassword,
        });

        await this.donationManagerModel.create({
          user: userRecord._id,
        });
      }

      if (userRecord.blocked) {
        throw new ValidationError('This account has been blocked by our admin.');
      }

      const token = this.generateToken(userRecord);
      await addFCMToken(userRecord.email, fcm_token);

      const user = userRecord.toObject();
      Reflect.deleteProperty(user, 'password');
      Reflect.deleteProperty(user, 'salt');
      return { user, jwtToken: token };
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async PasswordResetRequest(email: string): Promise<void> {
    const user = await getUserByEmail(email);

    if (!user) {
      throw new ValidationError('An account with this email address does not exist');
    }

    const passwordResetKey = `password-reset-user-${user._id}`;
    const tokenServiceInstance = Container.get(TokenService);

    const token = await tokenServiceInstance.createToken(null, passwordResetKey);
    this.logger.info(`Password reset code generated: ${token}`);

    await this.mailer.SendPasswordResetRequestMail(user.email, token);
  }

  public async PasswordReset(passwordResetInputDTO: IPasswordResetInputDTO): Promise<void> {
    const user = await getUserByEmail(passwordResetInputDTO.email);

    if (!user) {
      throw new ValidationError('Request not valid!');
    }

    const passwordResetKey = `password-reset-user-${user._id}`;
    const tokenServiceInstance = Container.get(TokenService);

    if (!(await tokenServiceInstance.compareToken(passwordResetKey, passwordResetInputDTO.resetCode))) {
      throw new ValidationError('Password reset code is either not valid or has expired.');
    }

    await tokenServiceInstance.deleteToken(passwordResetKey);

    this.logger.silly('Hashing password');
    const salt = randomBytes(32);
    const hashedPassword = await argon2.hash(passwordResetInputDTO.password, { salt });

    this.logger.silly('Updating password...');
    await this.userModel.updateOne(
      { email: passwordResetInputDTO.email },
      {
        salt: salt.toString('hex'),
        password: hashedPassword,
      },
    );
  }

  private async googleLogin(token: string) {
    const GOOGLE_AUTH_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
    const payload = { access_token: token };

    try {
      const result = await axios.get(GOOGLE_AUTH_URL, { params: payload });
      return result.data.email;
    } catch (err) {
      throw new ValidationError('wrong or expired token.');
    }
  }

  private generateToken(user) {
    const today = new Date();
    const exp = new Date(today);
    exp.setDate(today.getDate() + 60);

    this.logger.silly(`Sign JWT for userId: ${user._id}`);
    const options: SignOptions = {
      algorithm: config.jwtAlgorithm,
    };

    return jwt.sign(
      {
        _id: user._id,
        role: user.role,
        fullname: user.fullname,
        exp: exp.getTime() / 1000,
      },
      config.jwtSecret,
      options,
    );
  }
}

@Service()
export class TokenService {
  public generateOTP(length = 6) {
    const digits = '0123456789';

    const allowsChars = digits;
    let password = '';
    while (password.length < length) {
      const charIndex = crypto.randomInt(0, allowsChars.length);
      if (password.length === 0 && allowsChars[charIndex] === '0') {
        continue;
      }
      password += allowsChars[charIndex];
    }
    return password;
  }

  public async createToken(timeout = 1200, key: string) {
    const token = this.generateOTP();
    const redisClient: RedisClientType = Container.get('redis');
    await redisClient.set(key, token);
    return token;
  }

  public async compareToken(key: string, otherToken: string) {
    const redisClient: RedisClientType = Container.get('redis');
    const token = await redisClient.get(key);

    return token == otherToken;
  }

  public async deleteToken(key: string) {
    const redisClient: RedisClientType = Container.get('redis');
    await redisClient.del(key);
  }
}
