
import { CalcuttaCauseListStrategy } from './src/scraper/strategies/calcutta.strategy';
import { MumbaiCauseListStrategy } from './src/scraper/strategies/mumbai.strategy';
import { CauseListEntry } from './src/types';

// Mock Page
const mockPage: any = {
    url: () => 'http://mock.com',
    goto: async () => { },
    close: async () => { },
    setExtraHTTPHeaders: async () => { },
    // Add other methods if strategies call them
};

async function verifyDirect() {
    console.log('=== VERIFYING BACKEND SCRAPERS (Direct Axios) ===');
    const dateStr = '2025-12-22'; // User reported date
    console.log(`Test Date: ${dateStr}`);

    // 1. Calcutta
    console.log('\n--- Testing Calcutta (Direct) ---');
    try {
        const strategy = new CalcuttaCauseListStrategy();

        // Mock fetchAndParse to access raw text? No, I can't easily mock private methods or inner logic without refactoring.
        // Instead, I'll trust the parser's logic for now but I want to see what TYPES are missing.
        // I will temporarily update the STRATEGY/PARSER to log unmatched lines? No, too invasive.

        // Actually, I can use the same technique I used: scrape and count.
        // But to see the TEXT, I need to fetch it myself in this script or modify the parser.
        // Let's modify the PARSER to log unmatched case-like lines for debugging.

        const entries = await strategy.scrape(mockPage, dateStr);
        const asCount = entries.filter(e => e.court_hall.includes('Appellate Side')).length;
        const osCount = entries.filter(e => e.court_hall.includes('Original Side')).length;
        console.log(`[PASS] Calcutta Found: ${entries?.length || 0} entries (AS: ${asCount}, OS: ${osCount})`);

        await Bun.write('calcutta_counts.txt', `AS: ${asCount}, OS: ${osCount}`);
        if (entries && entries.length > 0) {
            console.log('Sample:', JSON.stringify(entries[0], null, 2));
        }
    } catch (e) {
        console.error(`[FAIL] Calcutta: ${e.message}`);
    }

    // 2. Mumbai
    console.log('\n--- Testing Mumbai (Direct) ---');
    try {
        const strategy = new MumbaiCauseListStrategy();
        // Uses axios internally, might try navigation first but falls back?
        // My implementation of Mumbai (Step 261) calls `page.goto` first to find link.
        // If I pass mockPage, `page.goto` will do nothing (mocked).
        // Then it logs warning "Navigation... failed".
        // Then it tries to download PDF from hardcoded 'netbdpdf.php'.
        // So this SHOULD work if the site is up.

        const entries = await strategy.scrape(mockPage, dateStr);
        console.log(`[PASS] Mumbai Found: ${entries.length} entries`);
        if (entries.length > 0) {
            console.log('Sample:', JSON.stringify(entries[0], null, 2));
        }
    } catch (e) {
        console.error(`[FAIL] Mumbai: ${e.message}`);
    }
}

verifyDirect();
