
import { DelhiCauseListStrategy } from './src/scraper/strategies/delhi.strategy';
import { CauseListEntry } from './src/types';

// Mock Page
const mockPage: any = {
    url: () => 'http://mock.com',
    goto: async () => { },
    close: async () => { },
    setExtraHTTPHeaders: async () => { },
};

async function verifyDelhiDirect() {
    console.log('=== VERIFYING DELHI SCRAPER (Direct Axios) ===');
    const dateStr = '2025-12-22'; // Known valid past date
    console.log(`Test Date: ${dateStr}`);

    try {
        const strategy = new DelhiCauseListStrategy();
        const entries = await strategy.scrape(mockPage, dateStr);
        console.log(`[PASS] Delhi Found: ${entries.length} entries`);
        if (entries.length > 0) {
            console.log('Sample:', JSON.stringify(entries[0], null, 2));
        }
    } catch (e) {
        console.error(`[FAIL] Delhi: ${e.message}`);
    }
}

verifyDelhiDirect();
