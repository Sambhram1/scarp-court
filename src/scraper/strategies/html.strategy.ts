import { Page } from 'playwright';
import { ScrapingStrategy } from './base.strategy';
import { CauseListEntry } from '../../types';
import { HtmlTableParser } from '../parsers/html-table.parser';
import logger from '../../utils/logger';

/**
 * HTML scraping strategy.
 * Attempts to parse cause list from HTML tables on the page.
 */
export class HtmlCauseListStrategy implements ScrapingStrategy {
    getName(): string {
        return 'HTML';
    }

    async canHandle(page: Page): Promise<boolean> {
        try {
            // Check if there are tables on the page
            const tables = await page.locator('table').count();
            return tables > 0;
        } catch {
            return false;
        }
    }

    async scrape(page: Page, dateStr: string): Promise<CauseListEntry[]> {
        logger.info('[HTML Strategy] Starting HTML parsing...');

        try {
            // Wait for tables to be present (DOM-driven wait, not blind timeout)
            await page.waitForSelector('table', { timeout: 10000 });

            // Get page content
            const html = await page.content();

            // Parse using HTML parser
            const entries = HtmlTableParser.parse(html, dateStr);

            if (entries.length > 0) {
                logger.info(`[HTML Strategy] Successfully parsed ${entries.length} entries`);
                return entries;
            } else {
                logger.warn('[HTML Strategy] No entries found in HTML tables');
                return [];
            }
        } catch (error) {
            logger.error('[HTML Strategy] Parsing failed:', error);
            return [];
        }
    }
}
