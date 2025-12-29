
import fs from 'fs';
import pdf from 'pdf-parse';

(async () => {
    try {
        console.log("Reading local file...");
        const dataBuffer = fs.readFileSync("calcutta_cause_list.pdf");
        const data = await pdf(dataBuffer);

        const lines = data.text.split('\n');
        console.log("Total lines:", lines.length);

        // Print first 200 lines to understand structure
        for (let i = 0; i < Math.min(lines.length, 200); i++) {
            if (lines[i].trim().length > 0) {
                console.log(`[Line ${i}] ${lines[i]}`);
            }
        }

        console.log("\n--- SEARCHING FOR CASE PATTERNS ---\n");
        // Look for typical patterns
        let matchCount = 0;
        for (let i = 0; i < lines.length; i++) {
            // Adjust regex for likely Calcutta patterns (e.g. W.P.A., C.O., headers)
            if (lines[i].match(/\d+\/\d{4}/) || lines[i].includes('VS') || lines[i].includes('Versus') || lines[i].includes('v.')) {
                console.log(`[Match ${matchCount} @ Line ${i}] ${lines[i]}`);
                // Context
                if (i > 0) console.log(`  [Pre] ${lines[i - 1]}`);
                if (i < lines.length - 1) console.log(`  [Post] ${lines[i + 1]}`);
                console.log('---');
                matchCount++;
                if (matchCount > 20) break;
            }
        }

    } catch (e) {
        console.error("Error parsing PDF:", e);
    }
})();
