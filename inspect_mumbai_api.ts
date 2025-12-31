import axios from 'axios';
import * as cheerio from 'cheerio';
import qs from 'querystring';

async function probeMumbai() {
    console.log('Probing Mumbai High Court API (Retrying with Cookies)...');

    const url = "https://hcservices.ecourts.gov.in/ecourtindiaHC/cases/highcourt_causelist_qry.php";
    const date = "20-12-2024";

    // Configs to test
    const configs = [
        { name: "Correct Params?", params: { 'action_code': 'pulishedCauselist', 'state_code': '1', 'dist_code': '1', 'court_code': '1', 'causelist_dt': date } },
        { name: "State=1, DistCode=1", params: { 'action_code': 'pulishedCauselist', 'state_code': '1', 'dist_code': '1', 'causelist_dt': date } },
    ];

    try {
        // Step 1: Get Cookies
        const initialRes = await axios.get("https://hcservices.ecourts.gov.in/ecourtindiaHC/");
        const cookies = initialRes.headers['set-cookie'];
        console.log("Got Cookies:", cookies);
        const cookieHeader = cookies ? cookies.join('; ') : '';

        for (const config of configs) {
            console.log(`\nTesting Config: ${config.name}`);
            try {
                const data = qs.stringify(config.params);
                const response = await axios.post(url, data, {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Origin': 'https://hcservices.ecourts.gov.in',
                        'Referer': 'https://hcservices.ecourts.gov.in/ecourtindiaHC/',
                        'Cookie': cookieHeader
                    }
                });

                console.log(`Status: ${response.status}`);
                const html = response.data;
                if (html.includes("Invalid Input")) {
                    console.log("Result: Invalid Input");
                } else if (html.includes("INVALID CAPTCHA")) {
                    console.log("Result: INVALID CAPTCHA");
                } else {
                    console.log("Result: Potential Success (Length: " + html.length + ")");

                    // Check for table content
                    const $ = cheerio.load(html);
                    const tables = $('table');
                    console.log(`Found ${tables.length} tables`);

                    if (html.includes("Record Not Found")) {
                        console.log("Result: Record Not Found (Valid request, just no data)");
                    }

                    if (tables.length > 0) {
                        const fs = require('fs');
                        const filename = `mumbai_success_${config.name.replace(/[^a-z0-9]/gi, '_')}.html`;
                        fs.writeFileSync(filename, html);
                        console.log(`Saved to ${filename}`);

                        // Print first row header
                        const rows = $(tables[0]).find('tr');
                        if (rows.length > 0) {
                            console.log('Header:', $(rows[0]).text().replace(/\s+/g, ' ').trim());
                        }
                    }
                }
            } catch (e: any) {
                console.log(`Error: ${e.message}`);
            }
        }

    } catch (e: any) {
        console.error("Failed to initialize/get cookies:", e.message);
    }
}

probeMumbai();
