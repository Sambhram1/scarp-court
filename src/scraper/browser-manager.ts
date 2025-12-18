import { chromium, Browser, BrowserContext } from 'playwright';
import logger from '../utils/logger';

/**
 * Singleton browser manager for efficient browser lifecycle management.
 * Reuses browser instance across scraping requests.
 */
export class BrowserManager {
    private static instance: BrowserManager;
    private browser: Browser | null = null;
    private isLaunching = false;

    private constructor() { }

    static getInstance(): BrowserManager {
        if (!BrowserManager.instance) {
            BrowserManager.instance = new BrowserManager();
        }
        return BrowserManager.instance;
    }

    async getBrowser(): Promise<Browser> {
        if (this.browser && this.browser.isConnected()) {
            return this.browser;
        }

        // Prevent concurrent launches
        if (this.isLaunching) {
            await this.waitForBrowser();
            return this.browser!;
        }

        this.isLaunching = true;
        try {
            logger.info('Launching Playwright browser...');
            this.browser = await chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
            });
            logger.info('Browser launched successfully');
        } finally {
            this.isLaunching = false;
        }

        return this.browser!;
    }

    async createContext(): Promise<BrowserContext> {
        const browser = await this.getBrowser();
        return browser.newContext({
            acceptDownloads: true,
            userAgent:
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        });
    }

    async close(): Promise<void> {
        if (this.browser) {
            logger.info('Closing browser...');
            await this.browser.close();
            this.browser = null;
        }
    }

    private async waitForBrowser(): Promise<void> {
        const maxWait = 30000; // 30 seconds
        const start = Date.now();
        while (this.isLaunching && Date.now() - start < maxWait) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }
}
