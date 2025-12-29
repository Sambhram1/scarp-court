import { BrowserManager } from './browser-manager';
import { ScraperOrchestrator } from './orchestrator';
import { CauseListEntry } from '../types';
import logger from '../utils/logger';

/**
 * Main scraper service (facade pattern).
 * Provides a simple public API while hiding internal complexity.
 */
export class ScraperService {
    private browserManager: BrowserManager;
    private orchestrator: ScraperOrchestrator;

    constructor() {
        this.browserManager = BrowserManager.getInstance();
        this.orchestrator = new ScraperOrchestrator();
    }

    /**
     * Scrape the daily cause list for a given date.
     * @param dateStr Date in YYYY-MM-DD format
     * @param courtRoom Optional court room to filter by (for Madras)
     * @param courtId Optional court identifier (madras | delhi)
     * @returns Array of cause list entries
     */
    async scrapeDailyCauseList(dateStr: string, courtRoom: string = 'COURT NO. 01', courtId: string = 'madras'): Promise<CauseListEntry[]> {
        logger.info(`[ScraperService] Starting scrape for date: ${dateStr}, court: ${courtId}`);

        try {
            // Optimization: Skip browser launch for API-based scrapers (Delhi, Calcutta, Mumbai)
            // They use Axios/Cheerio and don't need a heavy Playwright context.
            // This prevents timeouts if the browser fails to launch.
            let context = null;
            if (courtId === 'madras') {
                context = await this.browserManager.createContext();
            }

            try {
                // Execute scraping using orchestrator
                // Note: The orchestrator handles the 'madras' flow including navigation. 
                // Getting ALL entries from orchestrator, then filtering for 'courtRoom' if applicable (for Madras)
                const entries = await this.orchestrator.scrape(context, dateStr, courtId);

                let filteredEntries = entries;

                // Post-process filtering
                // If a specific court room/side is requested, filter the entries.
                // For Madras: specific court halls.
                // For Calcutta: "Appellate Side" vs "Original Side" prefixes.
                if (courtRoom && courtRoom !== 'ALL COURTS') {
                    // For Calcutta, if user selects "Appellate Side", we match "Appellate Side - ..."
                    // For Madras, we match "COURT NO. 1", etc.

                    filteredEntries = entries.filter(e => {
                        const room = e.court_hall || '';
                        return room === courtRoom || room.includes(courtRoom);
                    });
                }

                logger.info(`[ScraperService] Completed scrape with ${filteredEntries.length} entries`);
                return filteredEntries;
            } finally {
                // Always close context after scraping
                if (context) await context.close();
            }
        } catch (error: any) {
            const fs = require('fs');
            try { fs.appendFileSync('scraper_debug.log', `[ScraperService] ERROR: ${error.message}\n`); } catch (e) { }
            logger.error('[ScraperService] Scraping failed:', error);
            // Return empty array instead of throwing to avoid crashes
            return [];
        }
    }

    /**
     * Close the browser instance.
     * Should be called during graceful shutdown.
     */
    async close(): Promise<void> {
        await this.browserManager.close();
    }

    /**
     * Reset the circuit breaker.
     * Useful for manual recovery after repeated failures.
     */
    resetCircuitBreaker(): void {
        this.orchestrator.resetCircuitBreaker();
    }
}
