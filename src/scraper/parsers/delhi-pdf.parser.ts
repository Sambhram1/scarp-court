import { CauseListEntry } from '../../types';
import logger from '../../utils/logger';

/**
 * PDF parser specifically for Delhi High Court cause lists.
 */
export class DelhiPdfParser {

    // Regex patterns for Delhi High Court PDF structure
    // Adjust these based on actual PDF content analysis
    private static readonly CASE_PATTERN = /(\w+\/\d+\/\d+)/; // Placeholder for case number pattern

    // Delhi HC PDFs often have a specific format. 
    // Since we don't have the full visual layout, we'll start with a text-based extraction
    // similar to the generic PDF parser but ready for customization.

    static parse(pdfText: string, dateStr: string): CauseListEntry[] {
        const entries: CauseListEntry[] = [];
        const lines = pdfText.split('\n').map((l) => l.trim()).filter((l) => l);

        let currentEntry: Partial<CauseListEntry> | null = null;
        let currentJudge = 'Unknown Judge';
        let currentCourt = 'Delhi High Court';
        let state: 'NONE' | 'PETITIONER' | 'RESPONDENT' = 'NONE';

        // Helper to finalize entry
        const pushEntry = () => {
            if (currentEntry && currentEntry.case_number) {
                // Clean up fields
                if (currentEntry.petitioner) currentEntry.petitioner = currentEntry.petitioner.trim();
                if (currentEntry.respondent) currentEntry.respondent = currentEntry.respondent.trim();

                // Attempt to separate counsel from petitioner/respondent if large spaces exist
                // Logic: "PetitionerName     CounselName"
                if (currentEntry.petitioner && currentEntry.petitioner.match(/\s{2,}/)) {
                    const parts = currentEntry.petitioner.split(/\s{2,}/);
                    currentEntry.petitioner = parts[0].trim();
                    if (parts.length > 1) {
                        // Ensure advocates object exists and is typed correctly (initially empty from create)
                        // currentEntry.advocates is initialized below, but we access it here in pushEntry
                        const existing = currentEntry.advocates || { petitioner_counsel: '', respondent_counsel: '' };
                        currentEntry.advocates = {
                            petitioner_counsel: parts.slice(1).join(', ').trim(),
                            respondent_counsel: existing.respondent_counsel || ''
                        };
                    }
                }
                if (currentEntry.respondent && currentEntry.respondent.match(/\s{2,}/)) {
                    const parts = currentEntry.respondent.split(/\s{2,}/);
                    currentEntry.respondent = parts[0].trim();
                    if (parts.length > 1) {
                        const existing = currentEntry.advocates || { petitioner_counsel: '', respondent_counsel: '' };
                        currentEntry.advocates = {
                            petitioner_counsel: existing.petitioner_counsel || '',
                            respondent_counsel: parts.slice(1).join(', ').trim()
                        };
                    }
                }

                entries.push(currentEntry as CauseListEntry);
            }
            currentEntry = null;
            state = 'NONE';
        };

        for (const line of lines) {
            // 1. Detect Headers (Court/Judge)
            if (line.match(/COURT NO.\s*\d+/i) || line.includes("HON'BLE MR. JUSTICE") || line.includes("HON'BLE MS. JUSTICE")) {
                if (line.includes('COURT NO.')) currentCourt = line;
                if (line.includes('JUSTICE')) currentJudge = line;
                continue;
            }

            // 2. Detect Case Start
            // Pattern: "1. W.P.(C) 123/2025" or just "W.P.(C) 123/2025"
            // We look for Case Type patterns AND a Year pattern like "1234/20" or "123/2025"
            const caseMatch = line.match(/(\d+\.)?\s*([A-Z\.]+\(?[A-Za-z]*\)?)\s+(\d+\/\d{4})/);
            // Broad pattern: starts with optional number, then some letters/dots/parens, then number/year.
            // Improve checking to avoid false positives in text?
            // Supported types: W.P.(C), CS(COMM), RFA, FAO, LPA, CONT.CAS(C), etc.
            // Let's use a simpler heuristic: contains formatting "NUMBER/YEAR" and some preceding text.

            const isCaseLine = /\d+\/\d{4}/.test(line) && (
                line.includes('W.P.') || line.includes('CS(') || line.includes('RFA') || line.includes('FAO') ||
                line.includes('LPA') || line.includes('CONT.') || line.includes('CRL.') || line.includes('MAT.APP')
            );

            if (isCaseLine) {
                pushEntry(); // Save previous

                // Extract case number
                // Try to clean up "1. " prefix if present
                const cleanLine = line.replace(/^\d+\.\s*/, '');
                // The case number is roughly the first part? Or the whole line?
                // Usually "W.P.(C) 69/2025" is the case number.

                currentEntry = {
                    case_number: cleanLine.split(/\s{2,}/)[0], // Take first chunk before valid gap? Or just line
                    case_type: 'Unknown', // Could parse from string
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

            // 3. Detect 'Vs.'
            if (state === 'PETITIONER' && (line.trim().toLowerCase() === 'vs.' || line.includes('VERSUS'))) {
                state = 'RESPONDENT';
                continue;
            }

            // 4. Capture Data
            if (state === 'PETITIONER') {
                currentEntry!.petitioner = (currentEntry!.petitioner + ' ' + line).trim();
            } else if (state === 'RESPONDENT') {
                currentEntry!.respondent = (currentEntry!.respondent + ' ' + line).trim();
            }
        }

        pushEntry(); // Save last

        return entries;
    }
}
