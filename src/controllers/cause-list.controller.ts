import { Request, Response } from 'express';
import { ScraperService } from '../scraper/scraper.service';
import { RedisService } from '../services/redis.service';
import logger from '../utils/logger';
import { CauseListEntry } from '../types';

export class CauseListController {
    private scraper: ScraperService;
    private redis: RedisService;

    constructor() {
        this.scraper = new ScraperService();
        this.redis = new RedisService();
        this.redis.connect(); // Ensure redis connects on startup
    }

    private getCacheKey(date: string): string {
        return `cause_list:${date}`;
    }

    // GET /api/cause-list?date=YYYY-MM-DD
    getCauseList = async (req: Request, res: Response) => {
        try {
            const dateStr = req.query.date as string;
            const courtRoom = req.query.court as string || 'COURT NO. 01';

            if (!dateStr) {
                return res.status(400).json({ error: 'Date parameter is required (YYYY-MM-DD)' });
            }

            logger.info(`Fetching cause list for ${dateStr}, Court: ${courtRoom}`);

            // Check cache
            const cacheKey = `causelist:${dateStr}:${courtRoom}`;
            const cachedData = await this.redis.get<CauseListEntry[]>(cacheKey);
            if (cachedData) {
                logger.info(`Cache hit for ${dateStr}:${courtRoom}`);
                return res.json({
                    source: 'cache',
                    date: dateStr,
                    court: courtRoom,
                    count: cachedData.length,
                    data: cachedData,
                    disclaimer: 'Unofficial API. For informational use only.',
                });
            }

            logger.info(`Cache miss for ${dateStr}:${courtRoom}, scraping...`);

            // Scrape data with court parameter
            const data = await this.scraper.scrapeDailyCauseList(dateStr, courtRoom);

            // Cache for 24 hours
            await this.redis.set(cacheKey, data, 86400);

            res.json({
                source: 'live',
                date: dateStr,
                court: courtRoom,
                count: data.length,
                data,
                disclaimer: "Unofficial API. For informational use only."
            });

        } catch (error) {
            logger.error('Error fetching cause list', error);
            res.status(500).json({ error: 'Failed to fetch cause list' });
        }
    };

    // GET /api/cause-list/today
    getTodayCauseList = async (req: Request, res: Response) => {
        const today = new Date().toISOString().split('T')[0];
        req.query.date = today;
        return this.getCauseList(req, res);
    };

    // GET /health
    getHealth = async (req: Request, res: Response) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    }
}
