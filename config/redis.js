import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS,
  socket: {
    connectTimeout: 10000,
    reconnectStrategy: (retries) => Math.min(retries * 50, 2000),
  },
});

redisClient.on('connect', () => {
    console.log("Redis has connected successfully")
});

redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
});

const connectRedis = async () => {
    if(redisClient.isOpen) return;
    await redisClient.connect();
}

export { redisClient , connectRedis };