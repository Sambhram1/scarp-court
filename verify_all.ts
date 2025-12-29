
import { chromium } from 'playwright';
import { ScraperOrchestrator } from './src/scraper/orchestrator';
import logger from './src/utils/logger';

async function verifyAll() {
    console.log('=== VERIFYING ALL SCRAPERS (Detailed) ===');

    console.log('Launching Browser...');
    const browser = await chromium.launch({ headless: true });
    // Use a context
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const orchestrator = new ScraperOrchestrator();

    // Test Config
    const dateStr = new Date().toISOString().split('T')[0]; // Today
    const dateStrCalcutta = '29-12-2025'; // Try specific format if needed, but strategy takes YYYY-MM-DD

    console.log(`Test Date: ${dateStr}`);

    try {
        // 1. Delhi
        console.log('\n--- Testing Delhi High Court ---');
        try {
            const entries = await orchestrator.scrape(context, dateStr, 'delhi');
            console.log(`[PASS] Delhi Found: ${entries.length} entries`);
            if (entries.length > 0) console.log(`Sample: ${entries[0].case_number} - ${entries[0].court_hall}`);
        } catch (e) {
            console.error(`[FAIL] Delhi: ${e.message}`);
        }

        // 2. Calcutta
        console.log('\n--- Testing Calcutta High Court ---');
        try {
            const entries = await orchestrator.scrape(context, dateStr, 'calcutta');
            console.log(`[PASS] Calcutta Found: ${entries.length} entries`);
            if (entries.length > 0) console.log(`Sample: ${entries[0].case_number} - ${entries[0].court_hall}`);
        } catch (e) {
            console.error(`[FAIL] Calcutta: ${e.message}`);
        }

        // 3. Mumbai
        console.log('\n--- Testing Mumbai High Court ---');
        try {
            const entries = await orchestrator.scrape(context, dateStr, 'mumbai');
            console.log(`[PASS] Mumbai Found: ${entries.length} entries`);
            if (entries.length > 0) console.log(`Sample: ${entries[0].case_number} - ${entries[0].court_hall}`);
        } catch (e) {
            console.error(`[FAIL] Mumbai: ${e.message}`);
        }

        // 4. Madras
        console.log('\n--- Testing Madras High Court ---');
        try {
            // Note: Madras usually takes time due to navigation
            // We set a shorter timeout or just let it run
            const entries = await orchestrator.scrape(context, dateStr, 'madras');
            console.log(`[PASS] Madras Found: ${entries.length} entries`);
            if (entries.length > 0) console.log(`Sample: ${entries[0].case_number} - ${entries[0].court_hall}`);
        } catch (e) {
            console.error(`[FAIL] Madras: ${e.message}`);
        }

    } catch (e) {
        console.error('Fatal:', e);
    } finally {
        console.log('Closing Browser...');
        await browser.close();
        console.log('=== VERIFICATION COMPLETE ===');
    }
}

verifyAll();
