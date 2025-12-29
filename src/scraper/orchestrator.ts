import { BrowserContext, Page } from 'playwright';
import { ScrapingStrategy } from './strategies/base.strategy';
import { HtmlCauseListStrategy } from './strategies/html.strategy';
import { PdfCauseListStrategy } from './strategies/pdf.strategy';
import { DelhiCauseListStrategy } from './strategies/delhi.strategy';
import { CalcuttaCauseListStrategy } from './strategies/calcutta.strategy';
import { MadrasApiStrategy } from './strategies/madras-api.strategy';
import { MumbaiCauseListStrategy } from './strategies/mumbai.strategy';
import { CauseListEntry } from '../types';
import logger from '../utils/logger';

/**
 * Orchestrates the scraping process using strategy pattern.
 * Handles navigation, date selection, and strategy execution with retry logic.
 */
export class ScraperOrchestrator {
    private readonly madrasStrategies: ScrapingStrategy[];
    private readonly delhiStrategies: ScrapingStrategy[];
    private readonly calcuttaStrategies: ScrapingStrategy[];
    private readonly mumbaiStrategies: ScrapingStrategy[];
    private readonly maxRetries = 3;
    private failureCount = 0;
    private readonly circuitBreakerThreshold = 10;

    constructor() {
        // Madras Strategies
        this.madrasStrategies = [new HtmlCauseListStrategy(), new PdfCauseListStrategy()];
        // Delhi Strategies
        this.delhiStrategies = [new DelhiCauseListStrategy()];
        // Calcutta Strategies
        this.calcuttaStrategies = [new CalcuttaCauseListStrategy()];
        // Mumbai Strategies
        this.mumbaiStrategies = [new MumbaiCauseListStrategy()];
    }

    async scrape(context: BrowserContext | null, dateStr: string, courtId: string = 'madras'): Promise<CauseListEntry[]> {
        // Circuit breaker check
        if (this.failureCount >= this.circuitBreakerThreshold) {
            logger.error('Circuit breaker triggered. Too many consecutive failures.');
            throw new Error('Service temporarily unavailable due to repeated failures');
        }

        try {
            const entries = await this.scrapeWithRetry(context, dateStr, courtId);
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
        context: BrowserContext | null,
        dateStr: string,
        courtId: string,
        attempt = 1
    ): Promise<CauseListEntry[]> {
        try {
            return await this.executeScraping(context, dateStr, courtId);
        } catch (error) {
            if (attempt < this.maxRetries) {
                const backoff = Math.pow(2, attempt) * 1000; // Exponential backoff
                logger.warn(`Retry attempt ${attempt + 1} after ${backoff}ms...`);
                await new Promise((resolve) => setTimeout(resolve, backoff));
                return this.scrapeWithRetry(context, dateStr, courtId, attempt + 1);
            }
            throw error;
        }
    }

    private async executeScraping(
        context: BrowserContext | null,
        dateStr: string,
        courtId: string
    ): Promise<CauseListEntry[]> {
        let page: Page | null = null;

        if (context) {
            try {
                page = await context.newPage();
            } catch (e) {
                logger.warn('Failed to create new page, proceeding with null page for API strategies if applicable', e);
            }
        }

        try {
            if (courtId === 'delhi') {
                return await this.executeDelhiScraping(page as any, dateStr);
            } else if (courtId === 'calcutta') {
                return await this.executeCalcuttaScraping(page as any, dateStr);
            } else if (courtId === 'mumbai') {
                return await this.executeMumbaiScraping(page as any, dateStr);
            } else {
                if (!page) throw new Error('Madras scraping requires a browser page');
                return await this.executeMadrasScraping(page, dateStr);
            }
        } finally {
            if (page) await page.close();
        }
    }

    // ... other execute methods ...

    private async executeDelhiScraping(page: Page, dateStr: string): Promise<CauseListEntry[]> {
        logger.info('Executing Delhi High Court scraping...');
        for (const strategy of this.delhiStrategies) {
            if (await strategy.canHandle(page)) {
                const entries = await strategy.scrape(page, dateStr);
                if (entries.length > 0) return entries;
            }
        }
        return [];
    }

    private async executeCalcuttaScraping(page: Page, dateStr: string): Promise<CauseListEntry[]> {
        logger.info('Executing Calcutta High Court scraping...');
        for (const strategy of this.calcuttaStrategies) {
            if (await strategy.canHandle(page)) {
                const entries = await strategy.scrape(page, dateStr);
                if (entries.length > 0) return entries;
            }
        }
        return [];
    }

    private async executeMumbaiScraping(page: Page, dateStr: string): Promise<CauseListEntry[]> {
        logger.info('Executing Mumbai High Court scraping...');
        for (const strategy of this.mumbaiStrategies) {
            if (await strategy.canHandle(page)) {
                // Mumbai strategy encapsulates its own error handling/fetching
                const entries = await strategy.scrape(page, dateStr);
                if (entries.length > 0) return entries;
            }
        }
        return [];
    }

    private async executeMadrasScraping(page: Page, dateStr: string): Promise<CauseListEntry[]> {
        // FAST PATH: Try API strategy first without navigation
        try {
            logger.info('Attempting Madras API strategy first (Fast Path)...');
            const apiStrategy = new MadrasApiStrategy();
            const entries = await apiStrategy.scrape(page, dateStr);
            if (entries.length > 0) {
                logger.info(`Madras API succeeded with ${entries.length} entries. Skipping legacy navigation.`);
                return entries;
            } else {
                logger.warn('Madras API return empty results. Proceeding with legacy scraping.');
            }
        } catch (error) {
            logger.warn('Madras API strategy failed.', error);
        }

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
        for (const strategy of this.madrasStrategies) {
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
    }

    private async selectDate(page: Page, dateStr: string): Promise<void> {
        logger.info('Selecting Daily List...');

        // Select "Daily List" radio button (Click label to avoid interception)
        await page.waitForSelector('label[for="dailylist"]', { timeout: 10000 });
        await page.click('label[for="dailylist"]');

        // Wait for date dropdown to populate (DOM-driven)
        logger.info('Waiting for date dropdown...');
        // Options may be in DOM but not "visible" in dropdown. Wait for attachment.
        await page.waitForSelector('#ct_date option', { state: 'attached', timeout: 30000 });

        // Verify date is available
        const dateSelect = page.locator('#ct_date');
        const values = await dateSelect
            .locator('option')
            .evaluateAll((opts) => opts.map((o: any) => o.getAttribute('value')));

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
