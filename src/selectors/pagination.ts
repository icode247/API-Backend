import { Model, Document, FilterQuery, PopulateOptions, Query, EnforceDocument, Aggregate } from 'mongoose';

export interface IPaginationResult<T> {
  data: T[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export interface IPaginateOptions<T extends Document> {
  model: Model<T>;
  filter: FilterQuery<T> | any;
  page?: number;
  pageSize?: number;
  populateQuery?: PopulateOptions | PopulateOptions[];
  // eslint-disable-next-line @typescript-eslint/ban-types
  findQuery?: Query<EnforceDocument<T, {}>[], EnforceDocument<T, {}>, {}, T> | any;
  sortQuery?: Record<string, number>;
}

export async function paginate<T extends Document>({
  model,
  filter,
  page = 1,
  pageSize = 10,
  populateQuery,
  findQuery,
  sortQuery,
}: IPaginateOptions<T>): Promise<IPaginationResult<T>> {
  const totalCountPromise = model.countDocuments(filter);

  let query = findQuery ? findQuery : model.find(filter).sort({ createdAt: -1 });
  if (sortQuery) {
    query = query.sort(sortQuery);
  }

  query = query.skip((page - 1) * pageSize).limit(pageSize);

  if (populateQuery) {
    query = query.populate(populateQuery);
  }

  const [totalCount, results] = await Promise.all([totalCountPromise, query]);

  const totalPages = Math.ceil(totalCount / pageSize);
  const currentPage = Math.min(Math.max(page, 1), totalPages);

  return {
    data: results,
    totalCount,
    currentPage,
    totalPages,
  };
}

export async function paginateLocationQuery<T extends Document>({
  model,
  filter,
  page = 1,
  pageSize = 10,
}: IPaginateOptions<T>): Promise<IPaginationResult<T>> {
  const skip = (page - 1) * pageSize;

  filter.push({
    $facet: {
      paginatedResults: [
        {
          $skip: skip,
        },
        {
          $limit: pageSize,
        },
      ],
      totalCount: [
        {
          $count: 'count',
        },
      ],
    },
  });

  const results = await model.aggregate(filter);

  const totalCount = results[0].totalCount.length > 0 ? results[0].totalCount[0].count : 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const currentPage = page;

  return {
    data: results[0].paginatedResults,
    totalCount,
    currentPage,
    totalPages,
  };
}
