import { CauseListEntry } from '../../types';
import logger from '../../utils/logger';

export class CalcuttaPdfParser {
    static parse(pdfText: string, dateStr: string): CauseListEntry[] {
        const entries: CauseListEntry[] = [];
        const lines = pdfText.split('\n').map((l) => l.trim()).filter((l) => l);

        let currentEntry: Partial<CauseListEntry> | null = null;
        let currentJudge = 'Unknown Judge';
        let currentCourt = 'Calcutta High Court';
        let state: 'NONE' | 'PETITIONER' | 'RESPONDENT' = 'NONE';

        const pushEntry = () => {
            if (currentEntry && currentEntry.case_number) {
                // Clean up
                if (currentEntry.petitioner) currentEntry.petitioner = currentEntry.petitioner.trim();
                if (currentEntry.respondent) currentEntry.respondent = currentEntry.respondent.trim();
                entries.push(currentEntry as CauseListEntry);
            }
            currentEntry = null;
            state = 'NONE';
        };

        for (const line of lines) {
            // Headers
            if (line.match(/COURT NO.\s*\d+/i) || line.includes("HON'BLE JUSTICE")) {
                if (line.includes('COURT')) currentCourt = line;
                if (line.includes('JUSTICE')) currentJudge = line;
                continue;
            }

            // Case Number Detection
            // Examples: "WPA/1234/2025", "CO/123/2025", "CRR/12/2025"
            // Heuristic: specific case types + number/year
            const isCaseLine = /\d+\/\d{4}/.test(line) && (
                line.includes('WPA') || line.includes('CO') || line.includes('CRR') ||
                line.includes('CRA') || line.includes('MAT') || line.includes('FMAT') ||
                line.includes('RVW') || line.includes('W.P.') ||
                // Original Side Types
                line.includes('CS') || line.includes('TS') || line.includes('PLA') ||
                line.includes('ALP') || line.includes('AP') || line.includes('WPO') ||
                line.includes('EC') || line.includes('CC') || line.includes('EOS') ||
                line.includes('G.A.') || line.includes('ATA') || line.includes('BIFR')
            );

            if (isCaseLine) {
                pushEntry();

                // Clean serial number "1. "
                const cleanLine = line.replace(/^\d+\.\s*/, '');

                currentEntry = {
                    case_number: cleanLine.split(/\s{2,}/)[0],
                    case_type: 'Unknown',
                    court_hall: currentCourt,
                    judge_name: currentJudge,
                    cause_list_date: dateStr,
                    source_type: 'PDF',
                    petitioner: '',
                    respondent: '',
                    advocates: { petitioner_counsel: '', respondent_counsel: '' },
                    bench_type: 'Unknown'
                };
                state = 'PETITIONER';
                continue;
            }

            // VS/Versus separator
            if (state === 'PETITIONER' && (line.match(/\s+VS\s+/i) || line.trim().toUpperCase() === 'VS' || line.includes('VERSUS'))) {
                state = 'RESPONDENT';
                continue;
            }

            // Capture Data
            if (state === 'PETITIONER') {
                // Start capturing petitioner
                currentEntry!.petitioner = (currentEntry!.petitioner + ' ' + line).trim();
            } else if (state === 'RESPONDENT') {
                currentEntry!.respondent = (currentEntry!.respondent + ' ' + line).trim();
            }
        }
        pushEntry();

        logger.info(`[CalcuttaPdfParser] Parsed ${entries.length} entries from PDF for date ${dateStr}`);

        return entries;
    }
}
