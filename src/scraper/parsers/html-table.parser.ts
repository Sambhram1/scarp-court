import * as cheerio from 'cheerio';
import { CauseListEntry } from '../../types';
import { CaseNumberParser } from './case-number.parser';
import logger from '../../utils/logger';

/**
 * Parses HTML tables to extract cause list entries.
 * Focuses on tables containing case numbers and party information.
 */
export class HtmlTableParser {
    static parse(html: string, dateStr: string): CauseListEntry[] {
        const $ = cheerio.load(html);
        const entries: CauseListEntry[] = [];

        $('table').each((_, table) => {
            const rows = $(table).find('tr');

            rows.each((__, tr) => {
                const tds = $(tr).find('td');
                const rowText = $(tr).text().replace(/\s+/g, ' ').trim();

                // Skip empty rows
                if (!rowText) return;

                // Check if row contains a case number
                const caseNumber = CaseNumberParser.extract(rowText);
                if (!caseNumber) return;

                // Extract party information
                const { petitioner, respondent } = this.extractParties(tds, $);

                // Try to extract judge and court hall from nearby cells
                const judge_name = this.extractJudge(tds, $);
                const court_hall = this.extractCourtHall(tds, $);

                entries.push({
                    case_number: caseNumber,
                    case_type: this.extractCaseType(caseNumber),
                    petitioner,
                    respondent,
                    advocates: { petitioner_counsel: '', respondent_counsel: '' },
                    bench_type: 'Unknown',
                    judge_name,
                    court_hall,
                    cause_list_date: dateStr,
                    source_type: 'HTML',
                });
            });
        });

        logger.info(`HTML parser extracted ${entries.length} entries`);
        return entries;
    }

    private static extractParties(
        tds: cheerio.Cheerio<cheerio.Element>,
        $: cheerio.CheerioAPI
    ): { petitioner: string; respondent: string } {
        let petitioner = 'Unknown';
        let respondent = 'Unknown';

        if (tds.length >= 3) {
            const c1 = $(tds[1]).text().replace(/\s+/g, ' ').trim();
            const c2 = $(tds[2]).text().replace(/\s+/g, ' ').trim();

            // Look for "vs" or "v." pattern
            const partyText = `${c1} ${c2}`;
            const vsSplit = partyText.split(/\b(vs\.?|v\.?|versus)\b/i);

            if (vsSplit.length >= 3) {
                petitioner = vsSplit[0].trim();
                respondent = vsSplit.slice(2).join(' ').trim();
            } else {
                petitioner = c1 || petitioner;
                respondent = c2 || respondent;
            }
        }

        return { petitioner, respondent };
    }

    private static extractJudge(
        tds: cheerio.Cheerio<cheerio.Element>,
        $: cheerio.CheerioAPI
    ): string {
        // Look for cells containing "Justice" or "Hon'ble"
        for (let i = 0; i < tds.length; i++) {
            const text = $(tds[i]).text();
            if (/justice|hon'?ble/i.test(text)) {
                return text.replace(/\s+/g, ' ').trim();
            }
        }
        return '';
    }

    private static extractCourtHall(
        tds: cheerio.Cheerio<cheerio.Element>,
        $: cheerio.CheerioAPI
    ): string {
        // Look for cells containing "Hall" or numeric court identifiers
        for (let i = 0; i < tds.length; i++) {
            const text = $(tds[i]).text().trim();
            if (/hall|court\s*\d+/i.test(text)) {
                return text.replace(/\s+/g, ' ').trim();
            }
        }
        return '';
    }

    private static extractCaseType(caseNumber: string): string {
        const match = caseNumber.match(/^([A-Z\s.()]+)/);
        return match ? match[1].trim() : 'Unknown';
    }
}
