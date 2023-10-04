import { ILocation } from './ILocation';
import { Document } from 'mongoose';

export interface IUser {
  _id: string;
  fullname: string;
  username: string;
  phone: string;
  photo: string;
  birthDate: Date;
  callingCode: string;
  isAdmin: boolean;
  isActive: boolean;
  blocked: boolean;
  role: string;
  email: string;
  password: string;
  salt: string;
  interest: string[];
  followers: string[];
  following: string[];
  importedContacts: string[];
  loc: ILocation;
  fcm_tokens: string;
}

export interface IUserDocument extends IUser, Document {
  _id: string;
}

export interface IUserReward {
  _id: string;
  user: string;
  points: number;
}

export interface IUserRewardDocument extends IUserReward, Document {
  _id: string;
}

export interface IEmailSignupInputDTO {
  fullname: string;
  email: string;
  password: string;
}

export interface IPhoneSigninInputDTO {
  phone: string;
  callingCode: string;
}

export interface IVerifyOTPInputDTO {
  otp: string;
  phoneOrEmail: string;
  fcm_token?: string;
}

export interface IPasswordResetInputDTO {
  email: string;
  resetCode: string;
  password: string;
}

export interface IProfileUpdateInputDTO {
  username: string;
  fullname: string;
  birthDate?: string;
  password: string;
  latitude: string;
  longitude: string;
}
export interface IContactsImportInputDTO {
  phone: string[];
}
