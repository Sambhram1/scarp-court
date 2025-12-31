import axios from 'axios';
import * as cheerio from 'cheerio';
import qs from 'querystring';

async function probeMumbai() {
    const url = "https://hcservices.ecourts.gov.in/ecourtindiaHC/cases/highcourt_causelist_qry.php";
    const date = "20-12-2024";

    try {
        const initialRes = await axios.get("https://hcservices.ecourts.gov.in/ecourtindiaHC/");
        const cookies = initialRes.headers['set-cookie'];
        const cookieHeader = cookies ? cookies.join('; ') : '';

        const params = { 'action_code': 'pulishedCauselist', 'state_code': '1', 'dist_code': '1', 'court_code': '1', 'causelist_dt': date };
        const data = qs.stringify(params);

        const response = await axios.post(url, data, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Origin': 'https://hcservices.ecourts.gov.in',
                'Referer': 'https://hcservices.ecourts.gov.in/ecourtindiaHC/',
                'Cookie': cookieHeader
            }
        });

        if (typeof response.data === 'string') {
            const parts = response.data.split("^#");
            if (parts.length > 1) {
                const firstPart = parts[1];
                const fields = firstPart.split("~");
                if (fields.length >= 5) {
                    const filename = fields[4];
                    const pdfUrl = `https://hcservices.ecourts.gov.in/ecourtindiaHC/cases/display_pdf.php?filename=${encodeURIComponent(filename)}&state_code=1&cCode=1&dist_code=1&appFlag=`;
                    console.log(`FULL_PDF_URL: ${pdfUrl}`);
                    const fs = require('fs');
                    fs.writeFileSync('mumbai_pdf_url.txt', pdfUrl);
                }
            }
        }
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

probeMumbai();
