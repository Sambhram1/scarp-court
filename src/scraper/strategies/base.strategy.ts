import { Page } from 'playwright';
import { CauseListEntry } from '../../types';

/**
 * Base interface for scraping strategies.
 * Each strategy handles a different format (HTML vs PDF).
 */
export interface ScrapingStrategy {
    /**
     * Execute the scraping strategy.
     * @param page Playwright page instance
     * @param dateStr Date in YYYY-MM-DD format
     * @returns Array of cause list entries
     */
    scrape(page: Page, dateStr: string): Promise<CauseListEntry[]>;

    /**
     * Check if this strategy can handle the current page state.
     * @param page Playwright page instance
     * @returns True if strategy is applicable
     */
    canHandle(page: Page): Promise<boolean>;

    /**
     * Get the strategy name for logging.
     */
    getName(): string;
}
