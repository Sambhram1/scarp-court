
import { Page } from 'playwright';
import { ScrapingStrategy } from './base.strategy';
import { CauseListEntry } from '../../types';
import logger from '../../utils/logger';
import axios from 'axios';
import pdf from 'pdf-parse';

export class MumbaiCauseListStrategy implements ScrapingStrategy {
    getName(): string {
        return 'Mumbai PDF Strategy';
    }

    async canHandle(page: Page): Promise<boolean> {
        // Can handle if we are tasked with Mumbai. 
        // In the orchestrator, we explicitly call this strategy for 'mumbai' courtId.
        return true;
    }

    async scrape(page: Page, dateStr: string): Promise<CauseListEntry[]> {
        logger.info(`[Mumbai Strategy] Starting scrape for date: ${dateStr}`);

        try {
            // CHALLENGE: The URL requires a Base64 'bhcpar' parameter which we cannot generate easily.
            // For now, we will try to find the link on the 'netbd.php' page using Playwright first, 
            // and if found, use that URL. If not, we might have to fail gracefully.

            // Step 1: Navigate to Daily List Page to find the PDF link
            // We use the page object passed from orchestrator to navigate.
            const listUrl = 'https://bombayhighcourt.nic.in/netbd.php';
            logger.info(`[Mumbai Strategy] Navigating to ${listUrl} to find PDF link...`);

            // Set headers/cookies likely needed
            await page.setExtraHTTPHeaders({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            });

            try {
                await page.goto(listUrl, { timeout: 30000, waitUntil: 'domcontentloaded' });
            } catch (navError) {
                const errorMessage = navError instanceof Error ? navError.message : 'Unknown error';
                logger.warn(`[Mumbai Strategy] Navigation to list page timed out/failed: ${errorMessage}`);
                // Proceeding to investigate if we can download a hardcoded/sample for testing if user requested?
                // For production, we just return empty if site is down.
                return [];
            }

            // Step 2: Try to interact with the form to get the list
            // This part is speculative as the site was timing out during investigation.
            // We'll look for any "PDF" link or "Cause List" link.

            // Heuristic: Look for an anchor tag containing "PDF" or "View"
            // If the user provided a specific URL in the request (not capable in this architecture yet), we'd use it.
            // Implementation: We will try to download a PLACEHOLDER or the 'netbd.php' response if it was a PDF.

            // Let's rely on the standalone script's logic: assume we have a URL or can get one.
            // Since we can't reliably get the URL dynamically yet, we will log this limitation.
            logger.warn('[Mumbai Strategy] Automatic URL generation is experimental. Site access is unstable.');

            // MOCK/TESTING: If the page content actually contains the list text, we could parse that.
            // But per requirement, we use AXIOS + PDF-PARSE.
            // We'll attempt to download a "latest" list if there's a predictable link, aka 'netbdpdf.php'

            const pdfUrl = 'https://bombayhighcourt.nic.in/netbdpdf.php'; // Found in inspection
            logger.info(`[Mumbai Strategy] Attempting to download PDF from potential endpoint: ${pdfUrl}`);

            const buffer = await this.downloadPdf(pdfUrl);
            if (!buffer) return [];

            const entries = await this.parsePdf(buffer, dateStr);
            logger.info(`[Mumbai Strategy] Parsed ${entries.length} entries.`);

            return entries;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`[Mumbai Strategy] Error: ${errorMessage}`);
            return [];
        }
    }

    private async downloadPdf(url: string): Promise<Buffer | null> {
        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Referer': 'https://bombayhighcourt.nic.in/'
                },
                validateStatus: () => true
            });

            if (response.status !== 200) {
                logger.warn(`[Mumbai Strategy] Failed to download PDF. Status: ${response.status}`);
                return null;
            }

            // Verify content type
            const contentType = response.headers['content-type'] || '';
            if (!contentType.toLowerCase().includes('pdf') && !contentType.toLowerCase().includes('application/octet-stream')) {
                // Sometimes they send HTML saying "No list found"
                logger.warn(`[Mumbai Strategy] Downloaded content is not PDF. Content-Type: ${contentType}`);
                return null;
            }

            return response.data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`[Mumbai Strategy] Download error: ${errorMessage}`);
            return null;
        }
    }

    private async parsePdf(buffer: Buffer, dateStr: string): Promise<CauseListEntry[]> {
        const data = await pdf(buffer);
        const text = data.text;

        return this.extractCases(text, dateStr);
    }

    private extractCases(text: string, dateStr: string): CauseListEntry[] {
        const entries: CauseListEntry[] = [];
        const lines = text.split('\n');

        let currentEntry: Partial<CauseListEntry> = {};
        let judgeName = '';

        // Patterns
        const caseNoPattern = /([A-Z]+(\/[A-Z]+)*\/\d+\/\d{4})/i;
        const judgePattern = /CORAM\s*:\s*(.+)/i;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            const judgeMatch = trimmed.match(judgePattern);
            if (judgeMatch) {
                judgeName = judgeMatch[1].trim();
                continue;
            }

            const caseMatch = trimmed.match(caseNoPattern);
            if (caseMatch) {
                // Save previous
                if (currentEntry.case_number) {
                    entries.push(this.finalizeEntry(currentEntry, judgeName, dateStr));
                }

                // Start new
                currentEntry = {
                    case_number: caseMatch[1],
                    petitioner: 'Refer to Source', // Placeholder as parsing parties safely is hard without structure
                    respondent: '',
                    advocates: { petitioner_counsel: '', respondent_counsel: '' }
                };
            }
        }

        // Finalize last
        if (currentEntry.case_number) {
            entries.push(this.finalizeEntry(currentEntry, judgeName, dateStr));
        }

        return entries;
    }

    private finalizeEntry(entry: Partial<CauseListEntry>, judgeName: string, dateStr: string): CauseListEntry {
        return {
            case_number: entry.case_number || 'Unknown',
            case_type: entry.case_type || 'Unknown',
            petitioner: entry.petitioner || 'Unknown',
            respondent: entry.respondent || 'Unknown',
            advocates: entry.advocates || { petitioner_counsel: '', respondent_counsel: '' },
            bench_type: entry.bench_type || 'Unknown',
            judge_name: judgeName || entry.judge_name || 'Unknown Judge',
            court_hall: 'Mumbai High Court', // Default
            cause_list_date: dateStr,
            source_type: 'PDF'
        };
    }
}
