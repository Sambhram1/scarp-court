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
        console.log('[DEBUG] Full Query:', JSON.stringify(req.query));
        const dateStr = req.query.date as string;
        // Legacy 'court' param was used for Court Room (e.g. 'COURT NO. 01')
        // We now support 'courtId' to switch between High Courts (madras | delhi)
        // If 'court' param is 'delhi', we treat it as courtId='delhi' for convenience
        const queryCourt = req.query.court as string;
        let courtId = req.query.courtId as string;

        if (!courtId) {
            if (queryCourt?.toLowerCase() === 'delhi') {
                courtId = 'delhi';
            } else if (queryCourt?.toLowerCase() === 'calcutta') {
                courtId = 'calcutta';
            } else {
                courtId = 'madras';
            }
        }

        // For Madras, default to 'COURT NO. 01' if not specified. For Delhi, court room might be ignored or handled differently.
        const courtRoom = (courtId === 'madras' && !queryCourt) ? 'COURT NO. 01' : queryCourt;

        if (!dateStr) {
            return res.status(400).json({ error: 'Date parameter is required (YYYY-MM-DD)' });
        }

        console.log(`Fetching cause list for ${dateStr}, CourtId: ${courtId}, CourtRoom: ${courtRoom}`);

        // Check cache (include courtId in key)
        const cacheKey = `causelist:${courtId}:${dateStr}:${courtRoom || 'all'}`;
        const cachedData = await redis.get<CauseListEntry[]>(cacheKey);

        if (cachedData && Array.isArray(cachedData)) {
            console.log(`Cache hit for ${cacheKey}`);
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

        console.log(`Cache miss for ${cacheKey}, scraping...`);

        // Scrape data
        console.log('[DEBUG] About to call scraper.scrapeDailyCauseList');
        const startTime = Date.now();
        // Pass courtId to scraper
        const data = await scraper.scrapeDailyCauseList(dateStr, courtRoom, courtId);
        const elapsed = Date.now() - startTime;
        console.log(`[DEBUG] Scraper returned ${data.length} entries in ${elapsed}ms`);

        if (data.length === 0) {
            console.warn(`[WARNING] Scraper returned 0 entries for ${dateStr}, ${courtId}`);
        }

        // Cache for 24 hours
        await redis.set(cacheKey, data, 86400);

        return res.json({
            source: 'live',
            date: dateStr,
            court: courtRoom,
            courtId: courtId,
            count: data.length,
            data,
            disclaimer: 'Unofficial API. For informational use only.',
        });

    } catch (error: any) {
        console.error('Error:', error);
        // Clean up scraper resources if needed (though service manages its own)
        return res.status(500).json({
            error: 'Failed to fetch cause list',
            message: error.message
        });
    }
}
