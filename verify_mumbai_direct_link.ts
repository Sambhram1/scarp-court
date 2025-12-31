import axios from 'axios';
import pdf from 'pdf-parse';

async function verifyDirectLink() {
    const url = "https://bombayhighcourt.nic.in/viewentirecauselist.php?bhcpar=cGF0aD0uL3dyaXRlcmVhZGRhdGEvYm9hcmRuZXQvcGRmY2F1c2VsaXN0LyZmbmFtZT0yMjEyMjAyNV81ODIyXzEwMDEucGRmJnNwYXNzcGhyYXNlPTMxMTIyNTE2MjY0Ng==";

    console.log(`Downloading PDF from: ${url}`);

    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        console.log(`Status: ${response.status}`);
        console.log(`Content-Type: ${response.headers['content-type']}`);
        console.log(`Size: ${response.data.length} bytes`);

        if (response.headers['content-type'].includes('text/html') && response.data.length < 5000) {
            console.log("WARNING: Response looks like HTML (possible error page).");
            console.log(response.data.toString());
            return;
        }

        console.log("Parsing PDF...");
        const data = await pdf(response.data);
        const text = data.text;

        console.log(`Parsed Text Length: ${text.length}`);
        console.log("First 500 chars:");
        console.log(text.substring(0, 500));

        // Try to extract some case numbers to verify parsing logic
        const caseNoRegex = /([A-Z]+)\/(\d+)\/(\d{4})/;
        const lines = text.split('\n');
        let count = 0;
        console.log("\nSample Cases:");
        for (const line of lines) {
            const match = line.match(caseNoRegex);
            if (match) {
                console.log(`Found Case: ${match[0]}`);
                count++;
                if (count >= 5) break;
            }
        }
        if (count === 0) console.log("No standard case numbers found in sample.");

    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

verifyDirectLink();
