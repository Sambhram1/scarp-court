import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ScraperService } from '../src/scraper/scraper.service';
import { RedisService } from '../src/services/redis.service';
import { CauseListEntry } from '../src/types';

const scraper = new ScraperService();
const redis = new RedisService();

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const dateStr = req.query.date as string;
        const courtRoom = (req.query.court as string) || 'COURT NO. 01';

        if (!dateStr) {
            return res.status(400).json({ error: 'Date parameter is required (YYYY-MM-DD)' });
        }

        console.log(`Fetching cause list for ${dateStr}, Court: ${courtRoom}`);

        // Check cache
        const cacheKey = `causelist:${dateStr}:${courtRoom}`;
        const cachedData = await redis.get<CauseListEntry[]>(cacheKey);

        if (cachedData && Array.isArray(cachedData)) {
            console.log(`Cache hit for ${dateStr}:${courtRoom}`);
            return res.json({
                source: 'cache',
                date: dateStr,
                court: courtRoom,
                count: cachedData.length,
                data: cachedData,
                disclaimer: 'Unofficial API. For informational use only.',
            });
        }

        console.log(`Cache miss for ${dateStr}:${courtRoom}, scraping...`);

        // Scrape data
        const data = await scraper.scrapeDailyCauseList(dateStr, courtRoom);

        // Cache for 24 hours
        await redis.set(cacheKey, data, 86400);

        return res.json({
            source: 'live',
            date: dateStr,
            court: courtRoom,
            count: data.length,
            data,
            disclaimer: 'Unofficial API. For informational use only.',
        });

    } catch (error: any) {
        console.error('Error:', error);
        return res.status(500).json({
            error: 'Failed to fetch cause list',
            message: error.message
        });
    }
}
