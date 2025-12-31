import axios from 'axios';
import pdf from 'pdf-parse';

async function inspectPdf() {
    const url = "https://bombayhighcourt.nic.in/viewentirecauselist.php?bhcpar=cGF0aD0uL3dyaXRlcmVhZGRhdGEvYm9hcmRuZXQvcGRmY2F1c2VsaXN0LyZmbmFtZT0yMjEyMjAyNV81ODIyXzEwMDEucGRmJnNwYXNzcGhyYXNlPTMxMTIyNTE2MjY0Ng==";

    console.log(`Downloading PDF...`);
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const data = await pdf(response.data);
        const fs = require('fs');
        fs.writeFileSync('mumbai_raw.txt', data.text);
        console.log("Written raw text to mumbai_raw.txt");

    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

inspectPdf();
