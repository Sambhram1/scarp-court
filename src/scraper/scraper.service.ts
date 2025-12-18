import { chromium, Browser } from 'playwright';
import logger from '../utils/logger';
import { CauseListEntry } from '../types';
import * as https from 'https';
import * as http from 'http';

export class ScraperService {
    private browser: Browser | null = null;

    async init() {
        if (this.browser) {
            logger.info('Launching Playwright browser...');
            this.browser = await chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    async scrapeDailyCauseList(dateStr: string, courtRoom: string = 'COURT NO. 01'): Promise<CauseListEntry[]> {
        const entries: CauseListEntry[] = [];

        try {
            // The HTML page fetches JSON from: ../api/result.php?file=cause_DDMMYYYY.xml
            // Full URL: https://www.mhc.tn.gov.in/judis/clists/clists-madras/api/result.php?file=cause_DDMMYYYY.xml

            const [year, month, day] = dateStr.split('-');
            const ddmmyyyy = `${day}${month}${year}`;

            const apiUrl = `https://www.mhc.tn.gov.in/judis/clists/clists-madras/api/result.php?file=cause_${ddmmyyyy}.xml`;

            logger.info(`Fetching JSON data from: ${apiUrl} for ${courtRoom}`);

            // Download JSON
            const jsonData = await this.downloadJson(apiUrl);

            if (!jsonData) {
                logger.warn(`No JSON data received for date ${dateStr}`);
                return [];
            }

            logger.info(`JSON received with ${Object.keys(jsonData).length} entries`);

            // Filter for specified courtroom and parse entries
            const parsedEntries = this.parseJsonData(jsonData, dateStr, courtRoom);
            entries.push(...parsedEntries);

            logger.info(`Successfully parsed ${entries.length} entries for ${courtRoom}`);

        } catch (error) {
            logger.error('Scraping failed', error);
        }

        return entries;
    }

    private downloadJson(url: string): Promise<any | null> {
        return new Promise((resolve, reject) => {
            const protocol = url.startsWith('https') ? https : http;

            const options = {
                rejectUnauthorized: false,
            };

            protocol.get(url, options as any, (response) => {
                if (response.statusCode === 404) {
                    logger.warn(`API not found (404): ${url}`);
                    resolve(null);
                    return;
                }

                if (response.statusCode !== 200) {
                    logger.error(`HTTP ${response.statusCode} when downloading JSON`);
                    reject(new Error(`HTTP ${response.statusCode}`));
                    return;
                }

                const chunks: Buffer[] = [];
                response.on('data', (chunk) => chunks.push(chunk));
                response.on('end', () => {
                    try {
                        const json = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
                        resolve(json);
                    } catch (e: any) {
                        logger.error(`JSON parse error: ${e.message}`);
                        reject(e);
                    }
                });
                response.on('error', reject);
            }).on('error', (err) => {
                logger.error(`Download error: ${err.message}`);
                reject(err);
            });
        });
    }

    private parseJsonData(jsonData: any, date: string, courtFilter: string): CauseListEntry[] {
        const entries: CauseListEntry[] = [];

        // JSON structure based on the JavaScript code:
        // Each entry has: courtno, mcasetype, mcaseno, mcaseyr, pname, rname, mpadv, mradv, judge1-5, stagename, serial_no, extra[]

        // Convert object to array if needed
        const dataArray = Array.isArray(jsonData) ? jsonData : Object.values(jsonData);

        // Filter by court number
        const filteredData = dataArray.filter((item: any) => item.courtno === courtFilter);

        logger.info(`Filtered ${filteredData.length} entries for ${courtFilter}`);

        filteredData.forEach((item: any) => {
            // Main case entry
            const caseNumber = `${item.mcasetype} ${item.mcaseno}/${item.mcaseyr}`.trim();

            // Get judge names
            const judges = [];
            if (item.judge1) judges.push(item.judge1);
            if (item.judge2) judges.push(item.judge2);
            if (item.judge3) judges.push(item.judge3);
            if (item.judge4) judges.push(item.judge4);
            if (item.judge5) judges.push(item.judge5);
            const judgeName = judges.join(', ');

            entries.push({
                case_number: caseNumber,
                case_type: item.mcasetype || 'Unknown',
                petitioner: item.pname || 'Unknown',
                respondent: item.rname || 'Unknown',
                advocates: {
                    petitioner_counsel: item.mpadv || '',
                    respondent_counsel: item.mradv || '',
                },
                bench_type: item.stagename || 'Unknown',
                judge_name: judgeName,
                court_hall: item.courtno || courtFilter,
                cause_list_date: date,
                item_number: item.serial_no?.toString() || '',
                source_type: 'JSON',
            });

            // Handle extra cases (clubbed/tagged cases)
            if (item.extra) {
                const extraArray = Array.isArray(item.extra) ? item.extra : [item.extra];
                extraArray.forEach((extra: any) => {
                    if (extra.excasetype) {
                        const extraCaseNumber = `${extra.excasetype} ${extra.excaseno}/${extra.excaseyr}`.trim();
                        entries.push({
                            case_number: extraCaseNumber,
                            case_type: extra.excasetype || 'Unknown',
                            petitioner: extra.expname || 'Unknown',
                            respondent: extra.exrname || 'Unknown',
                            advocates: {
                                petitioner_counsel: extra.expadv || '',
                                respondent_counsel: extra.exradv || '',
                            },
                            bench_type: item.stagename || 'Unknown',
                            judge_name: judgeName,
                            court_hall: item.courtno || courtFilter,
                            cause_list_date: date,
                            item_number: item.serial_no?.toString() || '',
                            source_type: 'JSON',
                        });
                    }
                });
            }
        });

        return entries;
    }
}
