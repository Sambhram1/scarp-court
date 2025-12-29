
import fs from 'fs';
import https from 'https';
import pdf from 'pdf-parse';

const url = 'https://www.delhihighcourt.nic.in/files/2025-12/cause-list/combined_cause_list_22.12.2025.pdf';
const file = fs.createWriteStream("delhi_cause_list.pdf");

console.log(`Downloading ${url}...`);

// https.get(url, function (response) {
//     response.pipe(file);

//     file.on('finish', async function () {
//         file.close();
//         console.log("Download completed.");

(async () => {
    try {
        console.log("Reading local file...");
        const dataBuffer = fs.readFileSync("delhi_cause_list.pdf");
        const data = await pdf(dataBuffer);

        const lines = data.text.split('\n');
        console.log("Total lines:", lines.length);
        let matchCount = 0;
        for (let i = 0; i < lines.length; i++) {
            // Search for case number OR Vs. OR Petitioner
            if (lines[i].match(/\d+\/\d{4}/) || lines[i].includes('Vs.') || lines[i].includes('VERSUS')) {
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

//     });
// });
