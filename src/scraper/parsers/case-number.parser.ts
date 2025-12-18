/**
 * Hardened regex patterns for Indian court case numbers.
 * Supports formats like:
 * - WP/12345/2023
 * - Crl.O.P No. 123 of 2025
 * - SA 456/2024
 * - CMA (SR) 789/2023
 */
export class CaseNumberParser {
    // Main pattern: captures case type, number, year
    private static readonly CASE_NUMBER_REGEX =
        /(?:(?:Crl\.?)?(?:O\.?P\.?|A\.?|W\.?P\.?|S\.?A\.?|C\.?M\.?A\.?|W\.?A\.?|[A-Z]{1,5})(?:\s*\([^)]+\))?)\s*(?:No\.?)?\s*(\d+)\s*(?:of|\/)\s*(\d{2,4})/i;

    // Alternative simpler pattern
    private static readonly SIMPLE_PATTERN = /([A-Z]+)\/(\d+)\/(\d{2,4})/i;

    static extract(text: string): string | null {
        const match = text.match(this.CASE_NUMBER_REGEX) || text.match(this.SIMPLE_PATTERN);
        if (!match) return null;

        // Normalize the case number
        const caseType = match[0].split(/\s*(?:No\.?\s*|\/)?\d/)[0].trim();
        const caseNum = match[1] || match[2];
        const year = match[2] || match[3];

        return `${caseType} ${caseNum}/${year}`.replace(/\s+/g, ' ').trim();
    }

    static isValid(text: string): boolean {
        return this.CASE_NUMBER_REGEX.test(text) || this.SIMPLE_PATTERN.test(text);
    }

    static extractAll(text: string): string[] {
        const results: string[] = [];
        const lines = text.split('\n');

        for (const line of lines) {
            const extracted = this.extract(line);
            if (extracted) {
                results.push(extracted);
            }
        }

        return results;
    }
}
