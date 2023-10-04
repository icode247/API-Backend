import { createClient, RedisClientType } from 'redis';
import config from '../config';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default async (): Promise<RedisClientType> => {
  const client: RedisClientType = createClient({
    url: config.redisURL,
  });

  client.on('error', err => console.log('Redis Client Error', err));
  await client.connect();

  return client;
};
