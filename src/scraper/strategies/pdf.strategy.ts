import { Page } from 'playwright';
import { ScrapingStrategy } from './base.strategy';
import { CauseListEntry } from '../../types';
import { PdfTextParser } from '../parsers/pdf-text.parser';
import logger from '../../utils/logger';
import fs from 'fs';

const pdf = require('pdf-parse');

/**
 * PDF scraping strategy - Updated for court-specific PDFs.
 * Downloads Court 1 (or other court) PDF and extracts data.
 */
export class PdfCauseListStrategy implements ScrapingStrategy {
    getName(): string {
        return 'PDF';
    }

    async canHandle(page: Page): Promise<boolean> {
        try {
            // Check for court-specific PDF links (Court 1, Court 2, etc.)
            const courtLinks = await page.getByText('Court', { exact: false }).count();
            return courtLinks > 0;
        } catch {
            return false;
        }
    }

    async scrape(page: Page, dateStr: string): Promise<CauseListEntry[]> {
        logger.info('[PDF Strategy] Looking for court-specific PDFs...');

        try {
            // Look for Court 1 PDF (or first available court)
            const download = await this.downloadCourtPdf(page);

            if (!download) {
                logger.warn('[PDF Strategy] Could not download court PDF');
                return [];
            }

            // Parse PDF
            const downloadPath = await download.path();
            logger.info(`[PDF Strategy] Downloaded court PDF to: ${downloadPath}`);

            const dataBuffer = fs.readFileSync(downloadPath);
            const pdfData = await pdf(dataBuffer);

            // Parse using state-machine parser
            const entries = PdfTextParser.parse(pdfData.text, dateStr);

            logger.info(`[PDF Strategy] Successfully parsed ${entries.length} entries from court PDF`);

            // Cleanup
            try {
                fs.unlinkSync(downloadPath);
            } catch { }

            return entries;
        } catch (error) {
            logger.error('[PDF Strategy] Court PDF parsing failed:', error);
            return [];
        }
    }

    private async downloadCourtPdf(page: Page): Promise<any | null> {
        // Try different selectors for court PDFs
        const courtSelectors = [
            'a:has-text("Court 1")',
            'a:has-text("Court No. 1")',
            'a:has-text("Court-1")',
            'a:has-text("Court")', // Fallback to any court link
        ];

        for (const selector of courtSelectors) {
            const element = page.locator(selector).first();
            if ((await element.count()) > 0) {
                logger.info(`[PDF Strategy] Trying court PDF link: ${selector}`);
                try {
                    const [download] = await Promise.all([
                        page.waitForEvent('download', { timeout: 20000 }),
                        element.click(),
                    ]);
                    return download;
                } catch (error) {
                    logger.warn(`[PDF Strategy] Selector failed: ${selector}`);
                }
            }
        }

        return null;
    }
}
