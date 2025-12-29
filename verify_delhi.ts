import { ScraperService } from './src/scraper/scraper.service';
import logger from './src/utils/logger';

async function testDelhiScraper() {
    console.log('--- Starting Delhi Scraper Test ---');
    const service = new ScraperService();

    // Date from the user request which is known to have a file
    const dateStr = '2025-12-22';

    try {
        console.log(`Scraping for date: ${dateStr}`);
        // Cast to any to avoid potential type mismatch if TS didn't pick up the change
        const entries = await (service as any).scrapeDailyCauseList(dateStr, undefined, 'delhi');

        console.log(`\nFound ${entries.length} entries.`);

        if (entries.length > 0) {
            console.log('\nSample Entry 1:');
            console.log(JSON.stringify(entries[0], null, 2));
        } else {
            console.error('No entries found! Check logs.');
        }

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await service.close();
        console.log('--- Test Completed ---');
    }
}

testDelhiScraper();
