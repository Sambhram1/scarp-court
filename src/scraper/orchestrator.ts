import { BrowserContext, Page } from 'playwright';
import { ScrapingStrategy } from './strategies/base.strategy';
import { HtmlCauseListStrategy } from './strategies/html.strategy';
import { PdfCauseListStrategy } from './strategies/pdf.strategy';
import { CauseListEntry } from '../types';
import logger from '../utils/logger';

/**
 * Orchestrates the scraping process using strategy pattern.
 * Handles navigation, date selection, and strategy execution with retry logic.
 */
export class ScraperOrchestrator {
    private readonly strategies: ScrapingStrategy[];
    private readonly maxRetries = 3;
    private failureCount = 0;
    private readonly circuitBreakerThreshold = 10;

    constructor() {
        // Order matters: Try HTML first, then PDF
        this.strategies = [new HtmlCauseListStrategy(), new PdfCauseListStrategy()];
    }

    async scrape(context: BrowserContext, dateStr: string): Promise<CauseListEntry[]> {
        // Circuit breaker check
        if (this.failureCount >= this.circuitBreakerThreshold) {
            logger.error('Circuit breaker triggered. Too many consecutive failures.');
            throw new Error('Service temporarily unavailable due to repeated failures');
        }

        try {
            const entries = await this.scrapeWithRetry(context, dateStr);
            // Reset failure count on success
            this.failureCount = 0;
            return entries;
        } catch (error) {
            this.failureCount++;
            logger.error(`Scraping failed. Failure count: ${this.failureCount}`, error);
            throw error;
        }
    }

    private async scrapeWithRetry(
        context: BrowserContext,
        dateStr: string,
        attempt = 1
    ): Promise<CauseListEntry[]> {
        try {
            return await this.executeScraping(context, dateStr);
        } catch (error) {
            if (attempt < this.maxRetries) {
                const backoff = Math.pow(2, attempt) * 1000; // Exponential backoff
                logger.warn(`Retry attempt ${attempt + 1} after ${backoff}ms...`);
                await new Promise((resolve) => setTimeout(resolve, backoff));
                return this.scrapeWithRetry(context, dateStr, attempt + 1);
            }
            throw error;
        }
    }

    private async executeScraping(
        context: BrowserContext,
        dateStr: string
    ): Promise<CauseListEntry[]> {
        const page = await context.newPage();

        try {
            // Navigate to main page
            const baseUrl =
                process.env.MHC_CAUSE_LIST_URL || 'https://www.mhc.tn.gov.in/judis/clists/';
            logger.info(`Navigating to ${baseUrl}...`);
            await page.goto(baseUrl, { timeout: 60000, waitUntil: 'domcontentloaded' });

            // Navigate to Madras High Court page
            const madrasUrl = 'https://www.mhc.tn.gov.in/judis/clists/clists-madras/index.php';
            await page.goto(madrasUrl, { timeout: 60000, waitUntil: 'domcontentloaded' });

            // Select date
            await this.selectDate(page, dateStr);

            // Try strategies in order
            for (const strategy of this.strategies) {
                logger.info(`Attempting strategy: ${strategy.getName()}`);

                if (await strategy.canHandle(page)) {
                    const entries = await strategy.scrape(page, dateStr);

                    if (entries.length > 0) {
                        logger.info(`Strategy ${strategy.getName()} succeeded with ${entries.length} entries`);
                        return entries;
                    } else {
                        logger.warn(`Strategy ${strategy.getName()} returned no entries, trying next...`);
                    }
                } else {
                    logger.info(`Strategy ${strategy.getName()} cannot handle current page state`);
                }
            }

            logger.warn('All strategies exhausted with no results');
            return [];
        } finally {
            await page.close();
        }
    }

    private async selectDate(page: Page, dateStr: string): Promise<void> {
        logger.info('Selecting Daily List...');

        // Select "Daily List" radio button (DOM-driven wait)
        await page.waitForSelector('input[type="radio"][value="1"]', { timeout: 10000 });
        await page.click('input[type="radio"][value="1"]');

        // Wait for date dropdown to populate (DOM-driven)
        logger.info('Waiting for date dropdown...');
        await page.waitForSelector('#ct_date option', { timeout: 10000 });

        // Verify date is available
        const dateSelect = page.locator('#ct_date');
        const values = await dateSelect
            .locator('option')
            .evaluateAll((opts) => opts.map((o) => o.getAttribute('value')));

        logger.info(`Available dates: ${values.length} options`);

        if (!values.includes(dateStr)) {
            logger.warn(`Date ${dateStr} not available. First available: ${values[0]}`);
            throw new Error(`Date ${dateStr} not found in dropdown`);
        }

        // Select the date
        await dateSelect.selectOption(dateStr);
        logger.info(`Selected date: ${dateStr}`);

        // Click NEXT (DOM-driven wait for navigation)
        await page.click('input[name="btn_dailylist"]');
        await page.waitForLoadState('domcontentloaded');
        logger.info('Navigated to results page');
    }

    resetCircuitBreaker(): void {
        this.failureCount = 0;
        logger.info('Circuit breaker reset');
    }
}
