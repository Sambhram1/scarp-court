
import { Page } from 'playwright';
import { ScrapingStrategy } from './base.strategy';
import { CauseListEntry } from '../../types';
import logger from '../../utils/logger';
import https from 'https';

export class MadrasApiStrategy implements ScrapingStrategy {
    getName(): string {
        return 'MadrasAPI';
    }

    async canHandle(page: Page): Promise<boolean> {
        return true;
    }

    async scrape(page: Page, dateStr: string): Promise<CauseListEntry[]> {
        logger.info(`[MadrasAPI] Fetching data for ${dateStr}`);

        // dateStr is YYYY-MM-DD
        const [year, month, day] = dateStr.split('-');
        // File format is cause_DDMMYYYY.xml
        const filename = `cause_${day}${month}${year}.xml`;
        const url = `https://www.mhc.tn.gov.in/judis/clists/clists-madras/api/result.php?file=${filename}`;

        logger.debug(`[MadrasAPI] Targeting URL: ${url}`);

        try {
            const items = await this.fetchJson(url);

            if (!Array.isArray(items)) {
                logger.warn('[MadrasAPI] API response is not an array');
                return [];
            }

            logger.info(`[MadrasAPI] Retrieved ${items.length} items from API`);
            const entries = items.map((item: any) => this.mapToEntry(item, dateStr));
            return entries;
        } catch (error) {
            logger.error('[MadrasAPI] Failed to fetch or parse:', error);
            return [];
        }
    }

    private mapToEntry(item: any, dateStr: string): CauseListEntry {
        const petitioner = item.pname || '';
        const respondent = item.rname || '';
        const pCounsel = item.mpadv || '';

        let rCounsel = '';
        if (Array.isArray(item.mradv)) {
            rCounsel = item.mradv.join(', ').trim();
        } else if (typeof item.mradv === 'string') {
            rCounsel = item.mradv;
        }

        const judge1 = item.judge1 || '';
        const judge2 = item.judge2 || '';
        // Filter out empty judge names and combine
        const judges = [judge1, judge2].filter((j: any) => j && typeof j === 'string' && j.trim().length > 0);
        const judgeName = judges.join(' & ');

        const benchType = judges.length > 1 ? 'Division' : 'Single';

        // Remove newlines from court remarks if useful, or just ignore

        return {
            case_number: `${item.mcasetype}/${item.mcaseno}/${item.mcaseyr}`,
            case_type: item.mcasetype || 'Unknown',
            petitioner: petitioner,
            respondent: respondent,
            advocates: {
                petitioner_counsel: pCounsel,
                respondent_counsel: rCounsel
            },
            bench_type: benchType,
            judge_name: judgeName,
            court_hall: item.courtno || 'Unknown',
            cause_list_date: dateStr,
            item_number: item.serial_no || '',
            source_type: 'JSON'
        };
    }

    private fetchJson(url: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const agent = new https.Agent({ rejectUnauthorized: false });
            const req = https.get(url, { agent }, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    if (res.statusCode !== 200) {
                        logger.warn(`[MadrasAPI] API returned status ${res.statusCode}`);
                        resolve([]);
                        return;
                    }
                    try {
                        const json = JSON.parse(body);
                        resolve(json);
                    } catch (e) {
                        logger.error('[MadrasAPI] JSON Parse Error');
                        resolve([]);
                    }
                });
            });

            req.on('error', (err) => {
                logger.error(`[MadrasAPI] Request Error: ${err.message}`);
                reject(err);
            });
            req.end();
        });
    }
}
