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
            // Legacy 'court' param validation
            const queryCourt = req.query.court as string;
            const courtId = (req.query.courtId as string) || (queryCourt?.toLowerCase() === 'delhi' ? 'delhi' : 'madras');

            // For Madras, default to 'COURT NO. 01'. For Delhi, 'court' param might represent something else or be ignored.
            const courtRoom = (courtId === 'madras' && !queryCourt) ? 'COURT NO. 01' : queryCourt;

            if (!dateStr) {
                return res.status(400).json({ error: 'Date parameter is required (YYYY-MM-DD)' });
            }

            const fs = require('fs');
            try {
                fs.appendFileSync('scraper_debug.log', `[Controller] Request: date=${dateStr}, courtId=${courtId}, court=${queryCourt}, room=${courtRoom}\n`);
            } catch (e) { }

            logger.info(`Fetching cause list for ${dateStr}, CourtId: ${courtId}, CourtRoom: ${courtRoom}`);

            // Check cache (include courtId in key) - v2 to invalidate old empty results
            const cacheKey = `causelist:${courtId}:${dateStr}:${courtRoom || 'all'}:v2`;

            // DISABLE CACHE FOR DEBUGGING CALCUTTA/MUMBAI
            let cachedData = null;
            if (courtId === 'madras' || courtId === 'delhi') {
                cachedData = await this.redis.get<CauseListEntry[]>(cacheKey);
            }

            if (cachedData) {
                logger.info(`Cache hit for ${cacheKey}`);
                try { fs.appendFileSync('scraper_debug.log', `[Controller] Cache hit for ${cacheKey}\n`); } catch (e) { }
                return res.json({
                    source: 'cache',
                    date: dateStr,
                    court: courtRoom,
                    courtId: courtId,
                    count: cachedData.length,
                    data: cachedData,
                    disclaimer: 'Unofficial API. For informational use only.',
                });
            }

            logger.info(`Cache miss for ${cacheKey}, scraping...`);
            try { fs.appendFileSync('scraper_debug.log', `[Controller] Cache miss, calling scraper...\n`); } catch (e) { }

            // Scrape data with court parameter
            const data = await this.scraper.scrapeDailyCauseList(dateStr, courtRoom, courtId);

            try { fs.appendFileSync('scraper_debug.log', `[Controller] Scraper returned ${data.length} entries\n`); } catch (e) { }

            // Cache for 24 hours
            if (data.length > 0) {
                await this.redis.set(cacheKey, data, 86400);
            }

            res.json({
                source: 'live',
                DEBUG_MODE: "ON_VERIFY_FILE_USAGE",
                date: dateStr,
                court: courtRoom,
                courtId: courtId,
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
