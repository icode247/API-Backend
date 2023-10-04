import { ValidationError } from '../config/exceptions';
import mongoose from 'mongoose';
import argon2 from 'argon2';
import { randomBytes } from 'crypto';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Service, Inject, Container } from 'typedi';
import { IOrganization, ICreateOrganizationInputDTO } from '../interfaces/IOrganization';
import { TokenService } from './auth';
import { IOrganizationLocationOptions } from '../interfaces/ILocation';
import { IPaginationResult, IOrganizationDocument } from '../interfaces/IPaginate';
import { IPaginateOptions, paginate, paginateLocationQuery } from '../selectors/pagination';
import { IUser } from 'src/interfaces/IUser';

const MAX_ORGANIZATION_FOLLOWS = 5; // the max charity a user can follow

@Service()
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default class OrganizationService {
  constructor(
    @Inject('logger') private logger,
    @Inject('userModel') private userModel: Models.UserModel,
    @Inject('interestModel') private interestModel: Models.InterestModel,
    @Inject('organizationModel') private organizationModel: Models.OrganizationModel,
    @Inject('donationManagerModel') private donationManagerModel: Models.DonationManagerModel,
  ) {}

  async createOrganization(
    createOrganizationInputDTO: ICreateOrganizationInputDTO,
    logo: Multer.File,
  ): Promise<IOrganization> {
    const fields = {};

    if (!logo) {
      throw new ValidationError('Please upload organization logo');
    }

    fields['logo'] = logo.location;

    const orgByEmail = await this.organizationModel.findOne({ email: createOrganizationInputDTO.email });

    if (orgByEmail) {
      throw new ValidationError('Organization with this email address already exist');
    }

    const orgByName = await this.organizationModel.findOne({ name: createOrganizationInputDTO.name });

    if (orgByName) {
      throw new ValidationError('Organization with this name already exist');
    }

    const orgAccountEmail = await this.userModel.findOne({ email: createOrganizationInputDTO.email });

    if (orgAccountEmail) {
      throw new ValidationError('Email address already in use');
    }

    const salt = randomBytes(32);
    const tokenServiceInstance = Container.get(TokenService);

    this.logger.silly('Hashing password');
    const hashedPassword = await argon2.hash(tokenServiceInstance.generateOTP(15), { salt });

    const interestIds = await this.interestModel
      .find({ name: { $in: createOrganizationInputDTO.interests } })
      .distinct('_id');

    Reflect.deleteProperty(createOrganizationInputDTO, 'interests');

    const userRecord = await this.userModel.create({
      email: createOrganizationInputDTO.email,
      salt: salt.toString('hex'),
      password: hashedPassword,
      fullname: createOrganizationInputDTO.name,
      photo: fields['logo'],
      interests: interestIds,
    });

    fields['loc'] = {
      type: 'Point',
      coordinates: [createOrganizationInputDTO.longitude, createOrganizationInputDTO.latitude],
    };

    fields['userId'] = userRecord._id;

    Reflect.deleteProperty(fields, 'longitude');
    Reflect.deleteProperty(fields, 'latitude');

    const organizationRecord = await this.organizationModel.create({
      ...createOrganizationInputDTO,
      ...fields,
      interests: interestIds,
    });

    return organizationRecord.toObject();
  }

  async followOrganization(organizationId: string, userId: string) {
    const donationManager = await this.donationManagerModel.findOne({
      user: userId,
    });

    if (!donationManager) {
      throw new ValidationError('Request could not be completed.');
    }

    if (donationManager.organizations && donationManager.organizations.includes(organizationId)) {
      return;
    }

    const organization = await this.organizationModel.findById(mongoose.Types.ObjectId(organizationId));

    if (!organization) {
      throw new ValidationError('Request not valid!!!');
    }

    if (donationManager.organizations.length == MAX_ORGANIZATION_FOLLOWS) {
      throw new ValidationError('You can only follow a maximum of 5 organisations.');
    }

    donationManager.organizations.push(organization._id);
    await donationManager.save();
  }

  async unfollowOrganization(organizationId: string, userId: string) {
    const donationManager = await this.donationManagerModel.findOneAndUpdate(
      { user: userId },
      { $pull: { organizations: organizationId } },
      { new: true },
    );

    if (!donationManager) {
      throw new ValidationError('Request could not be completed.');
    }
  }

  async swagOrganization(newOrganizationId: string, currentOrganizationId: string, userId: string) {
    const donationManager = await this.donationManagerModel.findOne({
      user: userId,
    });

    if (!donationManager) {
      throw new ValidationError('Request not valid!');
    }

    const organization = await this.organizationModel.findById(mongoose.Types.ObjectId(newOrganizationId));

    if (!organization) {
      throw new ValidationError('Request not valid!!!');
    }

    if (!donationManager.organizations.includes(currentOrganizationId)) {
      throw new ValidationError('Request not valid!');
    }

    if (donationManager.organizations.includes(newOrganizationId)) {
      throw new ValidationError('Already following this charity!');
    }

    const organizationIndex = donationManager.organizations.indexOf(currentOrganizationId);
    donationManager.organizations.splice(organizationIndex, 1);

    donationManager.organizations.push(newOrganizationId);
    await donationManager.save();
  }

  async getOrganizations(options: { page: number; pageSize: number; searchQuery?: string; interestFilter?: string[] }) {
    const { page, pageSize, searchQuery, interestFilter } = options;
    const filter = searchQuery
      ? { $text: { $search: searchQuery.trim() }, interests: { $in: interestFilter } }
      : {
          interests: { $in: interestFilter },
        };

    const paginationOptions: IPaginateOptions<IOrganizationDocument> = {
      model: this.organizationModel,
      filter: filter,
      page: page,
      pageSize: pageSize,
    };

    const results = await paginate(paginationOptions);

    return results;
  }

  async userDonationDetails(userId: string) {
    const user = await this.userModel.findById(mongoose.Types.ObjectId(userId));

    if (!user) {
      throw new ValidationError('Request not valid!');
    }

    const filter = { user: userId };
    const donationManager = await this.donationManagerModel.findOne(filter).populate([
      { path: 'user', select: ['fullname', 'email', 'username', 'photo', 'phone', 'callingCode'] },
      { path: 'organizations', select: ['charityRegNumber', 'name', '_id', 'logo', 'email', 'postalCode', 'address'] },
    ]);

    return donationManager;
  }

  async getOrganization(organizationId: string): Promise<IOrganization> {
    const organization = await this.organizationModel.findById(mongoose.Types.ObjectId(organizationId));
    if (!organization) {
      throw new Error('organization not found');
    }
    return organization.toObject();
  }

  async updateOrganization(
    organizationId: string,
    updateOrganizationInputDTO: Partial<ICreateOrganizationInputDTO>,
    photo: Multer.File,
  ): Promise<IOrganization> {
    const organization = await this.organizationModel.findById(mongoose.Types.ObjectId(organizationId));
    if (!organization) {
      throw new Error('organization not found');
    }
    const fields = {};
    if (photo) {
      fields['photo'] = photo.location;
    }

    const interestIds = await this.interestModel
      .find({ name: { $in: updateOrganizationInputDTO.interests } })
      .distinct('_id');

    Reflect.deleteProperty(updateOrganizationInputDTO, 'interests');

    organization.set({ ...updateOrganizationInputDTO, ...fields, interests: interestIds });
    await organization.save();
    return organization.toObject();
  }

  public async GetOrganizationsByLocation(
    options: IOrganizationLocationOptions,
  ): Promise<IPaginationResult<IOrganization>> {
    const { page, pageSize, loc } = options;
    const maxDistanceInMeters = 8046.72; // 8 kilometers in meters

    const aggregationPipeline = [
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: loc.coordinates,
          },
          distanceField: 'distance',
          maxDistance: maxDistanceInMeters,
          spherical: true,
        },
      },
    ];

    const paginationOptions: IPaginateOptions<IOrganizationDocument> = {
      model: this.organizationModel,
      filter: aggregationPipeline,
      page: page,
      pageSize: pageSize,
    };

    const results = await paginateLocationQuery(paginationOptions);
    return results;
  }

  public async SuggestedOrganizations(options: {
    page: number;
    pageSize: number;
    user: IUser;
  }): Promise<IPaginationResult<IOrganization>> {
    const { page, pageSize, user } = options;
    const interestFilters = user.interest || [];
    const followedUsersIds = user.following.map(user => user);

    const filter = { userId: { $nin: followedUsersIds } };

    const pipeline = [
      {
        $match: filter,
      },
      {
        $addFields: {
          sharedInterests: {
            $size: {
              $setIntersection: [interestFilters, '$interests'],
            },
          },
        },
      },
      {
        $addFields: {
          score: {
            $sum: ['$sharedInterests'],
          },
        },
      },
      { $sort: { score: -1 } },
    ];

    const query = this.organizationModel.aggregate(pipeline);

    const paginationOptions: IPaginateOptions<IOrganizationDocument> = {
      model: this.organizationModel,
      filter: filter,
      page: page,
      pageSize: pageSize,
      findQuery: query,
    };

    const results = await paginate(paginationOptions);
    return results;
  }
}
