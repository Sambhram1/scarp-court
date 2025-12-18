import app from './app';
import logger from './utils/logger';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { ScraperService } from './scraper/scraper.service';
import { RedisService } from './services/redis.service';

dotenv.config();

const PORT = process.env.PORT || 3000;
const redis = new RedisService();
const scraper = new ScraperService();

// Connect to Redis
redis.connect();

app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
});

// Cron Job: 5 AM IST
// Cron pattern: 0 5 * * *
cron.schedule(process.env.CRON_SCHEDULE || '0 5 * * *', async () => {
    logger.info('Running cron job: Prefetching cause list...');
    const today = new Date().toISOString().split('T')[0];
    try {
        const data = await scraper.scrapeDailyCauseList(today);
        if (data.length > 0) {
            await redis.set(`cause_list:${today}`, data);
            logger.info(`Cron job SUCCESS: Cached ${data.length} entries for ${today}`);
        } else {
            logger.warn(`Cron job: No entries found for ${today}`);
        }
    } catch (error) {
        logger.error('Cron job FAILED', error);
    }
});
