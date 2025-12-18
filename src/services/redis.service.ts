import Redis from 'ioredis';
import logger from '../utils/logger';

export class RedisService {
    private client: Redis;
    private readonly defaultTTL = 24 * 60 * 60; // 24 hours

    constructor() {
        // Mock Redis for now if connection fails or just for this environment if no redis is installed
        this.client = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: Number(process.env.REDIS_PORT) || 6379,
            password: process.env.REDIS_PASSWORD,
            lazyConnect: true,
            retryStrategy: (times) => {
                return null; // Stop retrying
            }
        });

        // Silence errors for demo purposes if no redis
        this.client.on('error', (err) => {
            // logger.warn('Redis Client Error (Soft fail)', err.message);
        });
    }

    async connect() {
        // no-op or try connect but catch
        try {
            // await this.client.connect(); 
            logger.warn('Redis connection skipped for testing/simulation');
        } catch (e) { }
    }

    async get<T>(key: string): Promise<T | null> {
        return null; // Always cache miss
    }

    async set(key: string, value: any, ttlSeconds: number = this.defaultTTL): Promise<void> {
        // no-op
    }

    async quit() {
        await this.client.quit();
    }
}
