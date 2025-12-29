import { Page } from 'playwright';
import { ScrapingStrategy } from './base.strategy';
import { CauseListEntry } from '../../types';
import { DelhiPdfParser } from '../parsers/delhi-pdf.parser';
import logger from '../../utils/logger';
import fs from 'fs';
import https from 'https';
import path from 'path';

const pdf = require('pdf-parse');

export class DelhiCauseListStrategy implements ScrapingStrategy {
    getName(): string {
        return 'DelhiHighCourt-PDF';
    }

    async canHandle(page: Page): Promise<boolean> {
        // This strategy is explicitly invoked by functionality, 
        // but for interface compliance we can check if we are meant to handle it.
        // In the new architecture, the orchestrator will likely direct to this strategy based on a flag.
        return true;
    }

    async scrape(page: Page, dateStr: string): Promise<CauseListEntry[]> {
        logger.info(`[Delhi Strategy] Starting scrape for ${dateStr}`);

        // URL Format: https://www.delhihighcourt.nic.in/files/2025-12/cause-list/combined_cause_list_22.12.2025.pdf
        const [year, month, day] = dateStr.split('-');
        const url = `https://www.delhihighcourt.nic.in/files/${year}-${month}/cause-list/combined_cause_list_${day}.${month}.${year}.pdf`;

        logger.info(`[Delhi Strategy] Constructed URL: ${url}`);

        try {
            const pdfBuffer = await this.downloadPdf(url);
            if (!pdfBuffer) {
                return [];
            }

            const pdfData = await pdf(pdfBuffer);
            const entries = DelhiPdfParser.parse(pdfData.text, dateStr);

            logger.info(`[Delhi Strategy] Parsed ${entries.length} entries`);
            return entries;

        } catch (error) {
            logger.error('[Delhi Strategy] Failed:', error);
            return [];
        }
    }

    private async downloadPdf(url: string): Promise<Buffer | null> {
        return new Promise((resolve) => {
            https.get(url, (res) => {
                const chunks: any[] = [];

                if (res.statusCode !== 200) {
                    logger.warn(`[Delhi Strategy] PDF not found or error. Status: ${res.statusCode}`);
                    resolve(null);
                    return;
                }

                res.on('data', (chunk) => chunks.push(chunk));
                res.on('end', () => resolve(Buffer.concat(chunks)));
                res.on('error', (e) => {
                    logger.error(`[Delhi Strategy] Download error: ${e.message}`);
                    resolve(null);
                });
            });
        });
    }
}
