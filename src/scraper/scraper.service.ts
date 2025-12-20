import * as https from 'https';
import logger from '../utils/logger';
import { CauseListEntry } from '../types';

export class ScraperService {




    async scrapeDailyCauseList(dateStr: string, courtRoom: string = 'COURT NO. 01'): Promise<CauseListEntry[]> {
        const entries: CauseListEntry[] = [];

        try {
            const [year, month, day] = dateStr.split('-');
            const ddmmyyyy = `${day}${month}${year}`;

            const apiUrl = `https://www.mhc.tn.gov.in/judis/clists/clists-madras/api/result.php?file=cause_${ddmmyyyy}.xml`;

            logger.info(`Fetching JSON data from: ${apiUrl} for ${courtRoom}`);

            // Download JSON using fetch (better for serverless)
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

    private async downloadJson(url: string): Promise<any | null> {
        return new Promise((resolve, reject) => {
            logger.info(`[FETCH] Requesting: ${url}`);
            const startTime = Date.now();

            const options = {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                rejectUnauthorized: false
            };

            const req = https.get(url, options, (res) => {
                let data = '';

                if (res.statusCode === 404) {
                    logger.warn(`API not found (404): ${url}`);
                    resolve(null);
                    return;
                }

                if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
                    logger.error(`HTTP ${res.statusCode} when downloading JSON`);
                    reject(new Error(`HTTP ${res.statusCode}`));
                    return;
                }

                res.on('data', (chunk) => data += chunk);

                res.on('end', () => {
                    const fetchTime = Date.now() - startTime;
                    logger.info(`[FETCH] Response received in ${fetchTime}ms, status: ${res.statusCode}`);

                    try {
                        const json = JSON.parse(data);
                        resolve(json);
                    } catch (e: any) {
                        logger.error(`Failed to parse JSON: ${e.message}`);
                        reject(e);
                    }
                });
            });

            req.on('error', (e) => {
                logger.error(`Download error: ${e.message}`);
                reject(e);
            });
        });
    }

    private parseJsonData(jsonData: any, date: string, courtFilter: string): CauseListEntry[] {
        const entries: CauseListEntry[] = [];

        const dataArray = Array.isArray(jsonData) ? jsonData : Object.values(jsonData);

        // Relaxed filtering to match suffix (e.g. 'COURT NO. 01' matches 'COURT NO. 01 a')
        const filteredData = dataArray.filter((item: any) =>
            item.courtno === courtFilter || item.courtno.startsWith(courtFilter + ' ') || item.courtno.startsWith(courtFilter)
        );

        if (filteredData.length === 0 && dataArray.length > 0) {
            const availableCourts = [...new Set(dataArray.map((i: any) => i.courtno))];
        }

        logger.info(`Filtered ${filteredData.length} entries for ${courtFilter}`);

        filteredData.forEach((item: any) => {
            const caseNumber = `${item.mcasetype} ${item.mcaseno}/${item.mcaseyr}`.trim();

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
