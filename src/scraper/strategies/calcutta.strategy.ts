import { Page } from 'playwright';
import { ScrapingStrategy } from './base.strategy';
import { CauseListEntry } from '../../types';
import { CalcuttaPdfParser } from '../parsers/calcutta-pdf.parser';
import logger from '../../utils/logger';
import axios from 'axios';

export class CalcuttaCauseListStrategy implements ScrapingStrategy {
    getName(): string {
        return 'CalcuttaHighCourt-PDF';
    }

    async canHandle(page: Page): Promise<boolean> {
        return true;
    }

    async scrape(page: Page, dateStr: string): Promise<CauseListEntry[]> {
        console.log(`[DEBUG_CALCUTTA] Starting scrape for ${dateStr}`);
        // Date format for URL: clDDMMYYYY.pdf
        const [year, month, day] = dateStr.split('-');

        // Appellate Side URL: claDDMMYYYY.pdf
        const asFileName = `cla${day}${month}${year}.pdf`;
        const asUrl = `https://www.calcuttahighcourt.gov.in/downloads/old_cause_lists/AS/${asFileName}`;

        // Original Side URL: clDDMMYYYY.pdf
        const osFileName = `cl${day}${month}${year}.pdf`;
        const osUrl = `https://www.calcuttahighcourt.gov.in/downloads/old_cause_lists/OS/${osFileName}`;

        console.log(`[DEBUG_CALCUTTA] URLs: AS=${asUrl}, OS=${osUrl}`);
        logger.info(`[Calcutta Strategy] Attempting to download AS (${asUrl}) and OS (${osUrl}) lists...`);

        const fs = require('fs');
        const logMsg = `[${new Date().toISOString()}] Scrape called for ${dateStr}. URLs: ${asUrl}, ${osUrl}\n`;
        try { fs.appendFileSync('scraper_debug.log', logMsg); } catch (e) { }

        const entries: CauseListEntry[] = [];

        // Helper to fetch and parse
        const fetchAndParse = async (url: string, type: string) => {
            try {
                console.log(`[DEBUG_CALCUTTA] Fetching ${type} from ${url}`);
                const https = require('https');
                const response = await axios.get(url, {
                    responseType: 'arraybuffer',
                    headers: { 'User-Agent': 'Mozilla/5.0' },
                    httpsAgent: new https.Agent({
                        rejectUnauthorized: false,
                        secureOptions: require('crypto').constants.SSL_OP_LEGACY_SERVER_CONNECT
                    })
                });
                console.log(`[DEBUG_CALCUTTA] Response ${type}: ${response.status}, Size: ${response.data.length}`);

                try { fs.appendFileSync('scraper_debug.log', `[${type}] Downloaded ${response.data.length} bytes\n`); } catch (e) { }

                const pdf = require('pdf-parse');
                const data = await pdf(response.data);

                logger.info(`[Calcutta Strategy] Parsed ${type} PDF text length: ${data.text.length}`);
                console.log(`[DEBUG_CALCUTTA] PDF text length ${type}: ${data.text.length}`);

                try { fs.appendFileSync('scraper_debug.log', `[${type}] Text length ${data.text.length}\n`); } catch (e) { }

                const parsedEntries = CalcuttaPdfParser.parse(data.text, dateStr);
                console.log(`[DEBUG_CALCUTTA] Extracted ${parsedEntries.length} entries for ${type}`);

                // Prefix court_hall with type
                return parsedEntries.map(e => ({
                    ...e,
                    court_hall: `${type} - ${e.court_hall || 'Unknown Court'}`
                }));
            } catch (error: any) {
                console.error(`[DEBUG_CALCUTTA] ERROR for ${type}: ${error.message}`);
                logger.warn(`[Calcutta Strategy] Failed to fetch/parse ${type} list (${url}): ${error.message}`);
                try { fs.appendFileSync('scraper_debug.log', `[${type}] ERROR: ${error.message}\n`); } catch (e) { }
                return [];
            }
        };

        const [asEntries, osEntries] = await Promise.all([
            fetchAndParse(asUrl, 'Appellate Side'),
            fetchAndParse(osUrl, 'Original Side')
        ]);

        entries.push(...asEntries, ...osEntries);

        logger.info(`[Calcutta Strategy] Total entries found: ${entries.length}`);
        console.log(`[DEBUG_CALCUTTA] Total entries: ${entries.length}`);
        return entries;
    }
}
