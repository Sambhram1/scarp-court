
import { ScraperService } from './src/scraper/scraper.service';
import logger from './src/utils/logger';

async function verifyService() {
    console.log('=== VERIFYING SCRAPER SERVICE ===');
    const service = new ScraperService();
    // 22-12-2025: Known to have OS entries
    const dateStr = '2025-12-22';
    const courtId = 'calcutta';
    const courtRoom = 'Original Side';

    console.log(`Testing: Date=${dateStr}, CourtId=${courtId}, CourtRoom=${courtRoom}`);

    try {
        const entries = await service.scrapeDailyCauseList(dateStr, courtRoom, courtId);
        console.log(`[RESULT] Service returned ${entries.length} entries.`);

        if (entries.length > 0) {
            console.log('Sample:', JSON.stringify(entries[0], null, 2));
        } else {
            console.log('WHY 0?');
            // Check without filtering?
            console.log('Retrying without filtering...');
            const allEntries = await service.scrapeDailyCauseList(dateStr, 'ALL COURTS', courtId);
            console.log(`[RESULT] Unfiltered returned ${allEntries.length} entries.`);
            const filteredCount = allEntries.filter(e => e.court_hall.includes('Original Side')).length;
            console.log(`[ANALYSIS] Manually filtered OS count: ${filteredCount}`);
            if (filteredCount > 0) {
                console.log('Sample Court Hall:', allEntries.find(e => e.court_hall.includes('Original Side'))?.court_hall);
            }
        }

    } catch (e) {
        console.error('Fatal:', e);
    } finally {
        await service.close();
        process.exit(0);
    }
}

verifyService();
