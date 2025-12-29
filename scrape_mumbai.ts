
import axios from 'axios';
import pdf from 'pdf-parse';
import fs from 'fs';
import path from 'path';

// Configuration
const OUTPUT_FILE = 'mumbai_cause_list.csv';
const DELAY_MS = 2000;

interface CaseEntry {
    caseNo: string;
    petitioner: string;
    respondent: string;
    petitionerAdvocate: string;
    respondentAdvocate: string;
    judge: string;
}

const sleep = (ms: number) => new Promise(map => setTimeout(map, ms));

class MumbaiScraper {
    private url: string;

    constructor(url: string) {
        this.url = url;
    }

    async downloadPdf(): Promise<Buffer> {
        console.log(`Downloading PDF from ${this.url}...`);
        try {
            const response = await axios.get(this.url, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Referer': 'https://bombayhighcourt.nic.in/',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'same-origin',
                    'Sec-Fetch-User': '?1'
                }
            });
            return response.data;
        } catch (error) {
            console.error('Download failed:', error.message);
            throw error;
        }
    }

    async parsePdf(buffer: Buffer): Promise<CaseEntry[]> {
        console.log('Parsing PDF...');
        const data = await pdf(buffer);
        const text = data.text;

        // Debug: Write raw text to file
        fs.writeFileSync('mumbai_raw_text.txt', text);

        return this.extractCases(text);
    }

    extractCases(text: string): CaseEntry[] {
        const entries: CaseEntry[] = [];
        const lines = text.split('\n');

        let currentEntry: Partial<CaseEntry> = {};
        let buffer: string[] = [];
        let judgeName = '';

        // Regex patterns (tuned based on typical layouts, might need adjustment with real data)
        const courtPattern = /COURT NO\.\s*\d+/i;
        const judgePattern = /CORAM\s*:\s*(.+)/i;
        const caseNoPattern = /([A-Z]+(\/[A-Z]+)*\/\d+\/\d{4})/i;
        const vsPattern = /\s+V\/S\s+/i;
        const advocatePattern = /Adv\s+for/i;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Detect Judge/Court
            if (line.match(courtPattern)) {
                // Formatting court hall?
            }
            const judgeMatch = line.match(judgePattern);
            if (judgeMatch) {
                judgeName = judgeMatch[1].trim();
                console.log(`Found Judge: ${judgeName}`);
                continue;
            }

            // Start of a new case (heuristic: Case Number at start of line)
            // Example: WP/123/2025  Petitioner vs Respondent
            const caseMatch = line.match(caseNoPattern);

            if (caseMatch) {
                // Save previous entry
                if (currentEntry.caseNo) {
                    this.finalizeEntry(currentEntry, entries, judgeName);
                }

                // Start new entry
                currentEntry = {
                    caseNo: caseMatch[1],
                    judge: judgeName
                };

                // Content after case number in this line is likely parties
                const remaining = line.substring(caseMatch.index! + caseMatch[0].length).trim();
                if (remaining) buffer = [remaining];
                else buffer = [];
            } else {
                // Accumulate lines for parties/advocates
                if (currentEntry.caseNo) {
                    buffer.push(line);
                }
            }
        }

        // Finalize last entry
        if (currentEntry.caseNo) {
            this.finalizeEntry(currentEntry, entries, judgeName);
        }

        return entries;
    }

    finalizeEntry(entry: Partial<CaseEntry>, list: CaseEntry[], currentJudge: string) {
        // Parse the buffered lines to separate parties and advocates
        // This is tricky without exact layout. 
        // Heuristic: Advocates often started with "Adv." or "Mr." after parties.
        // Parties often separated by "V/S" or "VS" or "VERSUS"

        // Simplified Logic:
        // 1. Join all lines
        // 2. Split by V/S for Petitioner / Respondent
        // 3. Extract Advocates from the end?

        // For this demo, let's just make it generic since we don't have the file
        entry.judge = entry.judge || currentJudge;
        entry.petitioner = "Parsed Party 1"; // Placeholder logic would go here
        entry.respondent = "Parsed Party 2";
        entry.petitionerAdvocate = "";
        entry.respondentAdvocate = "";

        list.push(entry as CaseEntry);
    }

    async saveToCsv(entries: CaseEntry[]) {
        const header = 'Case No,Petitioner,Respondent,Petitioner Advocate,Respondent Advocate,Judge\n';
        const rows = entries.map(e =>
            `"${e.caseNo}","${e.petitioner}","${e.respondent}","${e.petitionerAdvocate}","${e.respondentAdvocate}","${e.judge}"`
        ).join('\n');

        fs.writeFileSync(OUTPUT_FILE, header + rows);
        console.log(`Saved ${entries.length} entries to ${OUTPUT_FILE}`);
    }

    async run() {
        try {
            await sleep(DELAY_MS);
            const buffer = await this.downloadPdf();
            const entries = await this.parsePdf(buffer);
            await this.saveToCsv(entries);
        } catch (e) {
            console.error('Scraper failed:', e);
        }
    }
}

// Check if run directly
const args = process.argv.slice(2);
const url = args[0] || 'https://bombayhighcourt.nic.in/viewentirecauselist.php?bhcpar=YOUR_BASE64_HERE';

console.log(`Starting Mumbai Scraper for URL: ${url}`);
new MumbaiScraper(url).run();
