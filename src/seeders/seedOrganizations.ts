import mongoose from 'mongoose';
import argon2 from 'argon2';
import { randomBytes } from 'crypto';
import NodeCache from 'node-cache';
import fs from 'fs';
import path from 'path';
import mongooseLoader from '../loaders/mongoose';
import User from '../models/user';
import Organization from '../models/organization';
import Interest from '../models/interest';

const SALT_LENGTH = 32;
const PASSWORD_LENGTH = 15;

const interestCache = new NodeCache({ maxKeys: 20000, stdTTL: 3600 });
const organizationCache = new NodeCache({ maxKeys: 10000, stdTTL: 20 });

function generatePassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#%&+;:_';
  const passwordBuffer = randomBytes(PASSWORD_LENGTH);
  return Array.from(passwordBuffer)
    .map(byte => chars.charAt(byte % chars.length))
    .join('');
}

function getOrganization(orgName: string) {
  const organization = organizationCache.get(orgName);
  if (!organization) {
    organizationCache.set(orgName, orgName);
    return null;
  }
  return organization;
}

async function getOrCreateInterest(name) {
  let interest = interestCache.get(name);
  if (!interest) {
    interest = await Interest.findOneAndUpdate({ name }, { name: name }, { upsert: true, new: true });
    interestCache.set(name, interest);
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return interest._id;
}

async function createUser(charity) {
  const salt = randomBytes(SALT_LENGTH);
  const password = generatePassword();
  const hashedPassword = await argon2.hash(password, { salt });

  const userData = {
    email: charity.email?.trim(),
    fullname: charity.name,
    role: 'organization',
    password: hashedPassword,
    loc: null,
  };

  const existingUser = await User.findOne({ email: charity.email });

  if (existingUser) {
    return null;
  }

  return await User.create(userData);
}

async function charityData(charity) {
  if (!charity.email?.trim()) {
    return null;
  }

  const charityCauses = charity.causes?.trim().split(',');
  const charitySubCategory = charity.subcategory?.trim().split(',');
  const interestNames = charityCauses.concat(charitySubCategory);
  const interests = await Promise.all(interestNames.map(getOrCreateInterest));

  const locationData = {};
  if (charity.latitude && charity.longitude) {
    locationData['loc'] = {
      type: 'Point',
      coordinates: [parseFloat(charity.longitude), parseFloat(charity.latitude)],
    };
  }

  return {
    name: charity['charity_name']?.trim(),
    charityRegNumber: charity['registration_number'],
    email: charity['email']?.trim(),
    description: charity['description'],
    postalCode: charity['postcode'],
    country: charity['country'],
    city: charity['city'],
    address: charity['address'],
    interests: interests,
    logo: charity.logo_filename,
    ...locationData,
  };
}

async function processCharities(charities) {
  for (const charity of charities) {
    const cachedOrgName = getOrganization(charity['charity_name']?.trim());
    if (!cachedOrgName) {
      try {
        const charityOrgData = await charityData(charity);
        if (charityOrgData) {
          const existingDoc = await Organization.findOne({
            $or: [{ name: charityOrgData.name }, { email: charityOrgData.email }],
          });
          if (!existingDoc) {
            const user = await createUser(charityOrgData);
            if (user) {
              const insertOperation = {
                userId: user._id,
                ...charityOrgData,
              };
              await Organization.create(insertOperation);
            }
          }
        }
      } catch (error) {
        console.error(`Error processing charity data: ${error.message}`);
        continue;
      }
    }
  }
  console.log('clean round -----------------------------------------------');
}

const runSeeder = async () => {
  console.time('runSeeder');
  await mongooseLoader();

  const dataFolder = path.join(__dirname, 'datasets');
  const files = fs.readdirSync(dataFolder);

  for (const file of files) {
    if (path.extname(file) === '.json') {
      const filePath = path.join(dataFolder, file);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const charities = JSON.parse(fs.readFileSync(filePath));
      await processCharities(charities);
    }
  }

  console.log('Done seeding 🥳');
  mongoose.connection.close();
  console.timeEnd('runSeeder');
};

runSeeder();
