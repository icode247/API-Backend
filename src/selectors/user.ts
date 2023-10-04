import { IUser } from '../interfaces/IUser';
import { Container } from 'typedi';

export const getUserByEmail = async (email: string): Promise<IUser> => {
  const userModel: Models.UserModel = Container.get('userModel');
  return await userModel.findOne({ email: email });
};

export const addFCMToken = async (email: string, token: string) => {
  const userModel: Models.UserModel = Container.get('userModel');
  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      throw new Error('User not found');
    }
    user.fcm_tokens = token;
    await user.save();
  } catch (error) {
    console.error(error);
    throw new Error('Internal server error');
  }
};

export const deleteFCMToken = async (email: string, token: string) => {
  const userModel: Models.UserModel = Container.get('userModel');
  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      throw new Error('User not found');
    }
    user.fcm_tokens = user.fcm_tokens = null;
    await user.save();
  } catch (error) {
    console.error(error);
    throw new Error('Internal server error');
  }
};
