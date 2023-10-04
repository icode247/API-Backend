import mongoose from 'mongoose';
import moment from 'moment';
import { ICreateEventInputDTO, IEvent, IEventDocument } from '../interfaces/IEvent';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Service, Inject, Container } from 'typedi';
import { IPaginateOptions, paginate } from '../selectors/pagination';
import { ValidationError } from '../config/exceptions';
import { IUser } from '../interfaces/IUser';
import NotificationService from './notification';
import { IInterestInputDTO } from '../interfaces/IInterest';
import { NOTIFICATION_EVENT_INVITE } from '../utils/constants';

@Service()
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default class EventService {
  constructor(
    @Inject('userModel') private userModel: Models.UserModel,
    @Inject('eventModel') private eventModel: Models.EventModel,
    @Inject('communityModel') private communityModel: Models.CommunityModel,
    @Inject('organizationModel') private organizationModel: Models.OrganizationModel,
    @Inject('interestModel') private interestModel: Models.InterestModel,
  ) {}

  async createEvent(createEventInputDTO: ICreateEventInputDTO, photo: Multer.File, userId: string): Promise<IEvent> {
    const fields = {};

    if (createEventInputDTO.communityId) {
      const community = await this.communityModel.findOne({ _id: createEventInputDTO.communityId });
      if (!community) {
        throw new ValidationError('Request failed. Please try again.');
      }

      if (community.admin.toString() != userId.toString()) {
        throw new Error('You are not authorized to create an event in this community');
      }

      fields['community'] = community._id;
    }

    const organization = await this.organizationModel.findOne({ _id: createEventInputDTO.organization });
    if (!organization) {
      throw new ValidationError('Request failed. Please try again.');
    }

    const interestIds = await this.interestModel.find({ _id: { $in: createEventInputDTO.interests } }).distinct('_id');
    if (!interestIds.length) {
      throw new ValidationError('Please select a correct interest for this event.');
    }

    if (!photo) {
      throw new ValidationError('Please upload event photo');
    }

    fields['photo'] = photo.location;
    createEventInputDTO.interests = interestIds;

    fields['endTime'] = moment.utc(createEventInputDTO.endTime);
    fields['admin'] = userId;

    const event = await this.eventModel.create({
      ...createEventInputDTO,
      ...fields,
    });
    event.members.push(userId);
    await event.save();

    const newEventObject = await this.eventModel.findById(mongoose.Types.ObjectId(event._id)).populate('interests');

    return newEventObject.toObject();
  }

  async addMembers(eventInputDTO: Partial<ICreateEventInputDTO>, eventId: string, adminId: string): Promise<IEvent> {
    const event = await this.eventModel.findById(mongoose.Types.ObjectId(eventId));
    if (event.admin.toString() != adminId.toString()) {
      throw new ValidationError('You are not authorized to perform this action');
    }

    const memberIds = await this.userModel.find({ _id: { $in: eventInputDTO.memberIds } }).distinct('_id');

    for (let i = 0; i < memberIds.length; i++) {
      const notificationInstance = Container.get(NotificationService);

      await notificationInstance.SendNotification({
        recipient: memberIds[i],
        message: `You have been invited to join ${event.name}`,
        title: 'You have a new event invite',
        type: NOTIFICATION_EVENT_INVITE,
        actionId: event._id,
      });
    }
    return event.toObject();
  }

  async getEvent(eventId: string): Promise<IEvent> {
    return await this.eventModel.findOne({ _id: eventId }).populate([
      { path: 'members', select: '_id username photo fullname' },
      { path: 'interests', select: '_id name' },
      { path: 'organization', select: '_id name logo description charityRegNumber email address' },
    ]);
  }

  async getTrendingEvents() {
    const currentTime = moment().startOf('day');
    const events = this.eventModel
      .find({
        endTime: {
          $gte: currentTime.toDate(),
        },
      })
      .limit(5)
      .sort({ createdAt: -1 })
      .populate([
        { path: 'members', select: '_id username photo fullname' },
        { path: 'interests', select: '_id name' },
        { path: 'organization', select: '_id name logo description charityRegNumber email address' },
      ]);
    return events;
  }

  async getEvents(options: { page: number; pageSize: number; userId: string; searchQuery?: string }) {
    const currentTime = moment().startOf('day');
    const { page, pageSize, userId, searchQuery } = options;

    const searchFilter = searchQuery ? { name: { $regex: new RegExp(searchQuery.trim(), 'i') } } : {};
    const filter = userId
      ? { admin: mongoose.Types.ObjectId(userId), ...searchFilter }
      : {
          goalReached: false,
          endTime: {
            $gte: currentTime.toDate(),
          },
          ...searchFilter,
        };

    const paginationOptions: IPaginateOptions<IEventDocument> = {
      model: this.eventModel,
      filter: filter,
      page: page,
      pageSize: pageSize,
      populateQuery: [
        { path: 'members', select: '_id username photo fullname' },
        { path: 'interests', select: '_id name' },
        { path: 'organization', select: '_id name logo description charityRegNumber email address' },
      ],
    };

    const results = await paginate(paginationOptions);
    return results;
  }

  async getOrganizationEvents(
    organizationId: string,
    options: {
      page: number;
      pageSize: number;
    },
  ) {
    const currentTime = moment().startOf('day');
    const { page, pageSize } = options;
    const filter = {
      organization: mongoose.Types.ObjectId(organizationId),
      endTime: {
        $gte: currentTime.toDate(),
      },
    };

    const paginationOptions: IPaginateOptions<IEventDocument> = {
      model: this.eventModel,
      filter: filter,
      page: page,
      pageSize: pageSize,
    };

    const results = await paginate(paginationOptions);

    return results;
  }

  async getJoinedEvents(options: { page: number; pageSize: number; userId: string; searchQuery?: string }) {
    const { page, pageSize, userId, searchQuery } = options;
    const currentTime = moment().startOf('day');

    const searchFilter = searchQuery ? { name: { $regex: new RegExp(searchQuery.trim(), 'i') } } : {};
    const filter = {
      endTime: {
        $gte: currentTime.toDate(),
      },
      members: mongoose.Types.ObjectId(userId),
      ...searchFilter,
    };

    const paginationOptions: IPaginateOptions<IEventDocument> = {
      model: this.eventModel,
      filter: filter,
      page: page,
      pageSize: pageSize,
      populateQuery: [
        { path: 'members', select: '_id username photo fullname' },
        { path: 'interests', select: '_id name' },
        { path: 'organization', select: '_id name logo description charityRegNumber email address' },
      ],
    };

    const results = await paginate(paginationOptions);

    return results;
  }

  async getCommunityEvents(options: { page: number; pageSize: number; communityId: string; searchQuery?: string }) {
    const { page, pageSize, communityId, searchQuery } = options;
    const currentTime = moment().startOf('day');

    const searchFilter = searchQuery ? { name: { $regex: new RegExp(searchQuery.trim(), 'i') } } : {};
    const filter = {
      endTime: {
        $gte: currentTime.toDate(),
      },
      community: mongoose.Types.ObjectId(communityId),
      ...searchFilter,
    };

    const paginationOptions: IPaginateOptions<IEventDocument> = {
      model: this.eventModel,
      filter: filter,
      page: page,
      pageSize: pageSize,
      populateQuery: [
        { path: 'members', select: '_id username photo fullname' },
        { path: 'interests', select: '_id name' },
        { path: 'organization', select: '_id name logo description charityRegNumber email address' },
      ],
    };

    const results = await paginate(paginationOptions);

    return results;
  }

  async updateEvent(
    eventId: string,
    eventInputDTO: Partial<ICreateEventInputDTO>,
    photo: Multer.File,
    adminId: string,
  ): Promise<IEvent> {
    let event = await this.eventModel.findOne({ _id: eventId });
    if (event.admin.toString() != adminId.toString()) {
      throw new ValidationError('You are not authorized to perform this action');
    }

    const fields = {
      interests: eventInputDTO.interests,
      endTime: moment.utc(eventInputDTO.endTime),
      fundraisingGoal: eventInputDTO.fundraisingGoal,
      name: eventInputDTO.name,
      description: eventInputDTO.description,
      address: eventInputDTO.address,
    };

    if (photo) {
      fields['photo'] = photo.location;
    }

    if (fields.fundraisingGoal < event.fundRaised) {
      throw new Error('Fund raising goal cannot be lower than fund raised');
    }

    if (fields.interests.length) {
      const interestIds = await this.interestModel.find({ _id: { $in: fields.interests } }).distinct('_id');
      if (interestIds.length) {
        fields.interests = interestIds;
      }
    }

    await this.eventModel.findOneAndUpdate({ _id: eventId }, fields);
    event = await this.eventModel.findById(eventId).populate([
      { path: 'members', select: '_id username photo fullname' },
      { path: 'interests', select: '_id name' },
      { path: 'organization', select: '_id name logo description charityRegNumber email address' },
    ]);
    return event.toObject();
  }

  async joinEvent(eventId: string, userId: string): Promise<IEvent> {
    const event = await this.eventModel.findById(eventId);
    if (!event) throw new Error('Event does not exists');
    if (event.members.indexOf(userId) === -1) {
      // User is not already a member, add them to the members array
      event.members.push(userId);
      event.save();

      return event;
    }
    throw new Error('You have already joined this event');
  }

  async getMembersDetails(userIds: string): Promise<IUser[]> {
    // convert the comma-separated string to a list
    const userIdList = typeof userIds === 'string' ? userIds.split(',') : userIds;

    return await this.userModel.find({ _id: { $in: userIdList } });
  }

  async updateInterest(interestId: string, interestInputDTO: IInterestInputDTO, photo: Multer.File): Promise<void> {
    const interest = await this.interestModel.findById(interestId);
    if (!interest) {
      throw new ValidationError('Request not valid.');
    }

    if (photo) {
      interest.image = photo.location;
    }

    if (interestInputDTO['name']) {
      interest.name = interestInputDTO.name;
    }

    await interest.save();
  }
}
