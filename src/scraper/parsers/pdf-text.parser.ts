import { CauseListEntry } from '../../types';
import { CaseNumberParser } from './case-number.parser';
import logger from '../../utils/logger';

/**
 * State-machine based PDF text parser.
 * Extracts structured data from raw PDF text.
 */
export class PdfTextParser {
    private static readonly JUDGE_PATTERN = /(Hon'?ble\s+.*?Justice\s+[A-Z\s.]+)/i;
    private static readonly COURT_HALL_PATTERN = /(Court\s+Hall\s*:?\s*\d+)|(Hall\s*\d+)/i;
    private static readonly VS_PATTERN = /\b(vs\.?|versus)\b/i;

    static parse(pdfText: string, dateStr: string): CauseListEntry[] {
        const entries: CauseListEntry[] = [];
        const lines = pdfText.split('\n').map((l) => l.trim()).filter((l) => l);

        let currentEntry: Partial<CauseListEntry> | null = null;
        let currentJudge = '';
        let currentCourtHall = '';
        let parsingState: 'init' | 'case' | 'parties' = 'init';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Extract judge name
            const judgeMatch = line.match(this.JUDGE_PATTERN);
            if (judgeMatch) {
                currentJudge = judgeMatch[1].trim();
                continue;
            }

            // Extract court hall
            const hallMatch = line.match(this.COURT_HALL_PATTERN);
            if (hallMatch) {
                currentCourtHall = hallMatch[0].trim();
                continue;
            }

            // Check if line contains a case number
            if (CaseNumberParser.isValid(line)) {
                // Save previous entry if exists
                if (currentEntry && currentEntry.case_number) {
                    entries.push(currentEntry as CauseListEntry);
                }

                // Start new entry
                const caseNumber = CaseNumberParser.extract(line);
                currentEntry = {
                    case_number: caseNumber!,
                    case_type: this.extractCaseType(caseNumber!),
                    petitioner: 'Unknown',
                    respondent: 'Unknown',
                    advocates: { petitioner_counsel: '', respondent_counsel: '' },
                    bench_type: 'Unknown',
                    judge_name: currentJudge,
                    court_hall: currentCourtHall,
                    cause_list_date: dateStr,
                    source_type: 'PDF',
                };
                parsingState = 'case';
                continue;
            }

            // Try to extract party information from subsequent lines
            if (currentEntry && parsingState === 'case') {
                const { petitioner, respondent } = this.extractPartiesFromLine(line);
                if (petitioner !== 'Unknown') {
                    currentEntry.petitioner = petitioner;
                    currentEntry.respondent = respondent;
                    parsingState = 'parties';
                }
            }
        }

        // Push last entry
        if (currentEntry && currentEntry.case_number) {
            entries.push(currentEntry as CauseListEntry);
        }

        logger.info(`PDF parser extracted ${entries.length} entries`);
        return entries;
    }

    private static extractPartiesFromLine(line: string): {
        petitioner: string;
        respondent: string;
    } {
        const vsSplit = line.split(this.VS_PATTERN);
        if (vsSplit.length >= 3) {
            return {
                petitioner: vsSplit[0].trim(),
                respondent: vsSplit.slice(2).join(' ').trim(),
            };
        }
        return { petitioner: 'Unknown', respondent: 'Unknown' };
    }

    private static extractCaseType(caseNumber: string): string {
        const match = caseNumber.match(/^([A-Z\s.()]+)/);
        return match ? match[1].trim() : 'Unknown';
    }
}
