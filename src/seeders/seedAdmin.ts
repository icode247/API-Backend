import mongoose from 'mongoose';
import argon2 from 'argon2';
import { v1 as uuidv1 } from 'uuid';
import { randomBytes } from 'crypto';
import mongooseLoader from '../loaders/mongoose';
import User from '../models/user';

const runSeeder = async () => {
  await mongooseLoader();

  const salt = randomBytes(32);
  const password = '123456';
  const hashedPassword = await argon2.hash(password, { salt });

  const user = {
    email: `${uuidv1()}@gmail.com`,
    password: hashedPassword,
    fullname: 'admin confi',
    isAdmin: true,
    role: 'admin',
  };

  console.log(`
    ####################################
      seeding data...
    ###################################`);
  await User.create(user);
  console.log('Done seeding 🥳', { email: user.email, password });
  mongoose.connection.close();
};

runSeeder();
