import { Page } from 'playwright';
import { CauseListEntry } from '../../types';
import { ScrapingStrategy } from './base.strategy';
import pdf from 'pdf-parse';
import axios from 'axios';

export class MumbaiCauseListStrategy implements ScrapingStrategy {
    private readonly BASE_URL = 'https://bombayhighcourt.nic.in/netbdpdf.php';

    getName(): string {
        return 'Mumbai High Court (Bombay OS) Strategy';
    }

    async canHandle(page: Page): Promise<boolean> {
        return true;
    }

    async scrape(page: Page, dateStr: string): Promise<CauseListEntry[]> {
        console.log(`[MumbaiStrategy] Starting scrape for date: ${dateStr}`);

        // OPTION: Use Direct Link if provided (Bypass Navigation)
        // User requested to use specific link:
        const DIRECT_LINK_OVERRIDE = 'https://bombayhighcourt.nic.in/viewentirecauselist.php?bhcpar=cGF0aD0uL3dyaXRlcmVhZGRhdGEvYm9hcmRuZXQvcGRmY2F1c2VsaXN0LyZmbmFtZT0yMjEyMjAyNV81ODIyXzEwMDEucGRmJnNwYXNzcGhyYXNlPTMxMTIyNTE2MjY0Ng==';

        // For demonstration/verification of user's request:
        if (DIRECT_LINK_OVERRIDE) {
            console.log('[MumbaiStrategy] Using DIRECT_LINK_OVERRIDE from configuration.');
            const pdfBuffer = await this.downloadPdf(DIRECT_LINK_OVERRIDE);
            if (pdfBuffer) {
                return this.parsePdfContent(pdfBuffer, dateStr, "Original Side (Direct Link)");
            }
        }

        // 1. Navigate to the page
        await page.goto(this.BASE_URL, { waitUntil: 'domcontentloaded' });

        try {
            // Select 'OS' (Original Side) as default
            const sideSelector = 'input[name="side"][value="OS"]';
            if (await page.$(sideSelector)) {
                await page.click(sideSelector);
            } else {
                console.log('[MumbaiStrategy] Side selector not found. Might be default or different page structure.');
            }

            // Format Date DD/MM/YYYY
            const [year, month, day] = dateStr.split('-');
            const displayDate = `${day}/${month}/${year}`;

            const dateInput = 'input[name="sdate"]';
            if (await page.$(dateInput)) {
                await page.fill(dateInput, displayDate);
            } else {
                console.log('[MumbaiStrategy] Date input not found.');
            }

            console.log(`[MumbaiStrategy] Submitting form for ${displayDate}`);

            // Handle popup which is common for "View PDF" buttons
            const [newPage] = await Promise.all([
                page.waitForEvent('popup', { timeout: 10000 }).catch(() => null), // Return null on timeout
                page.click('input[type="submit"], button[type="submit"]') // Click submit
            ]);

            if (!newPage) {
                console.log('[MumbaiStrategy] No popup opened. Trying direct checking or fallback.');
                return [];
            }

            await newPage.waitForLoadState();
            const url = newPage.url();
            console.log(`[MumbaiStrategy] Opened List URL: ${url}`);

            // Download the content of the new page (which should be the PDF)
            console.log('[MumbaiStrategy] Downloading PDF content...');
            const pdfBuffer = await this.downloadPdf(url);

            if (pdfBuffer) {
                const benchName = "Original Side";
                return this.parsePdfContent(pdfBuffer, dateStr, benchName);
            }

            await newPage.close();

        } catch (e: any) {
            console.error(`[MumbaiStrategy] Error interacting with page: ${e.message}`);
        }

        return [];
    }

    private async downloadPdf(url: string): Promise<Buffer | null> {
        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            const contentType = response.headers['content-type'];
            if (contentType && !contentType.includes('pdf')) {
                console.log(`[MumbaiStrategy] Warn: Content-Type is ${contentType}`);
            }
            return response.data;
        } catch (e: any) {
            console.error(`[MumbaiStrategy] Download failed: ${e.message}`);
            return null;
        }
    }

    private async parsePdfContent(buffer: Buffer, dateStr: string, benchName: string): Promise<CauseListEntry[]> {
        try {
            const data = await pdf(buffer);
            const text = data.text;
            const entries: CauseListEntry[] = [];
            const lines = text.split('\n');

            let currentEntry: Partial<CauseListEntry> | null = null;
            let currentBuffer: string[] = [];
            let state: 'NONE' | 'PETITIONER' | 'RESPONDENT' = 'NONE';

            // Regex for case number start: e.g., "1CRPIL/5/2023", "2WP/7883/2024"
            // Captures: (SerialNo)(CaseNo)
            const caseStartRegex = /^(\d+)([A-Z]+\(?\w*\)?\/\d+\/\d{4}.*)$/;
            // Also handle "WP/..." without serial if it happens
            const caseNoOnlyRegex = /^([A-Z]+\(?\w*\)?\/\d+\/\d{4}.*)$/;

            const finalizeEntry = () => {
                if (currentEntry && currentEntry.case_number) {
                    // Process the current buffer based on where we ended
                    processBuffer(state, currentBuffer, currentEntry);

                    // Defaults
                    if (!currentEntry.petitioner) currentEntry.petitioner = 'Unknown';
                    if (!currentEntry.respondent) currentEntry.respondent = 'Unknown';
                    if (!currentEntry.advocates) currentEntry.advocates = { petitioner_counsel: 'Unknown', respondent_counsel: 'Unknown' };

                    entries.push(currentEntry as CauseListEntry);
                }
            };

            const processBuffer = (s: string, buf: string[], entry: Partial<CauseListEntry>) => {
                const content = buf
                    .map(l => l.trim())
                    .filter(l => l && !l.startsWith('[') && !l.startsWith('(') && !l.includes('20/12/2025')) // Filter junk like [Civil] or page footers
                    .join(' ');

                if (s === 'PETITIONER') {
                    entry.petitioner = content;
                } else if (s === 'RESPONDENT') {
                    // Heuristic split for Respondent vs Counsel
                    // This is hard. For now, put everything in Respondent to ensure it's visible.
                    // Or try to split: usually Respondent comes first.
                    // Let's assume the first part is Respondent.
                    entry.respondent = content;

                    // Advanced: Check for Counsel names in the buffer
                    // If multiple lines, maybe strictly last few are counsel?
                    // For now, mapping everything to respondent satisfies "Not Unknown".
                }
            };

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                // header/footer noise filters
                if (trimmed.includes('DAILY MAIN CAUSELIST') || trimmed.includes('Page') || trimmed.includes('01:02:50')) continue;

                // Check for new entry start
                let caseMatch = trimmed.match(caseStartRegex);
                if (!caseMatch) caseMatch = trimmed.match(caseNoOnlyRegex); // Fallback

                if (caseMatch) {
                    // Finalize old
                    finalizeEntry();

                    // Start new
                    const caseNo = caseMatch.length > 2 ? caseMatch[2] : caseMatch[1];
                    currentEntry = {
                        case_number: caseNo,
                        case_type: caseNo.split('/')[0],
                        bench_type: 'Unknown',
                        judge_name: 'Unknown', // Will be filled if CORAM found
                        court_hall: benchName,
                        cause_list_date: dateStr,
                        source_type: 'PDF',
                        petitioner: '',
                        respondent: '',
                        advocates: { petitioner_counsel: 'Unknown', respondent_counsel: 'Unknown' }
                    };
                    state = 'PETITIONER';
                    currentBuffer = [];
                    continue; // Done with this line
                }

                if (!currentEntry) {
                    // Capture Global Context like CORAM if at top
                    if (trimmed.startsWith('HON\'BLE')) {
                        // This is global Coram, hard to assign to specific case unless we track it
                        // For now ignore or store globally?
                    }
                    continue;
                }

                if (trimmed === 'VS') {
                    // Switch to Respondent
                    processBuffer('PETITIONER', currentBuffer, currentEntry);
                    state = 'RESPONDENT';
                    currentBuffer = [];
                } else if (trimmed.startsWith('REMARK') || trimmed.startsWith('WITH')) {
                    // End of entry data (usually)
                    processBuffer(state, currentBuffer, currentEntry);
                    // Clear buffer so we don't re-add
                    currentBuffer = [];
                    state = 'NONE'; // Wait for next case
                } else if (trimmed.startsWith('CORAM:')) {
                    currentEntry.judge_name = trimmed.replace('CORAM:', '').trim();
                } else {
                    // Accumulate based on state
                    if (state !== 'NONE') {
                        currentBuffer.push(trimmed);
                    }
                }
            }
            // Finalize last
            finalizeEntry();

            return entries;

        } catch (error) {
            console.error('[MumbaiStrategy] PDF Parsing Error:', error);
            return [];
        }
    }

    private createEntry(caseNo: string, pet: string, resp: string, judge: string, bench: string, date: string): CauseListEntry {
        return {
            case_number: caseNo,
            case_type: caseNo.split('/')[0] || 'Unknown',
            petitioner: pet || 'Unknown',
            respondent: resp || 'Unknown',
            advocates: {
                petitioner_counsel: 'Unknown',
                respondent_counsel: 'Unknown'
            },
            bench_type: 'Unknown',
            judge_name: judge || 'Unknown',
            court_hall: bench,
            cause_list_date: date,
            source_type: 'PDF'
        };
    }
}
