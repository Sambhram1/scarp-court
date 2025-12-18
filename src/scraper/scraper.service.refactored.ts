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
     * @returns Array of cause list entries
     */
    async scrapeDailyCauseList(dateStr: string): Promise<CauseListEntry[]> {
        logger.info(`[ScraperService] Starting scrape for date: ${dateStr}`);

        try {
            // Get browser context from manager (singleton browser)
            const context = await this.browserManager.createContext();

            try {
                // Execute scraping using orchestrator
                const entries = await this.orchestrator.scrape(context, dateStr);
                logger.info(`[ScraperService] Completed scrape with ${entries.length} entries`);
                return entries;
            } finally {
                // Always close context after scraping
                await context.close();
            }
        } catch (error) {
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
