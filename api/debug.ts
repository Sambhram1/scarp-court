import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as https from 'https';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const dateStr = (req.query.date as string) || '19-12-2025'; // Default to known working date format DD-MM-YYYY
    // Note: scraper uses YYYY-MM-DD input but converts to DDMMYYYY.
    // Let's test the EXACT url construction scraper uses.

    // Scraper logic:
    // const [year, month, day] = dateStr.split('-'); (If input is YYYY-MM-DD)
    // const ddmmyyyy = `${day}${month}${year}`;

    // Let's manually construct for 19th Dec 2025
    const fileDate = '19122025';
    const url = `https://www.mhc.tn.gov.in/judis/clists/clists-madras/api/result.php?file=cause_${fileDate}.xml`;

    console.log(`[DEBUG] Testing connectivity to: ${url}`);

    try {
        const agent = new https.Agent({
            rejectUnauthorized: false,
            keepAlive: true,
            minVersion: 'TLSv1', // Allow old TLS
            ciphers: 'DEFAULT@SECLEVEL=1' // Allow weak ciphers
        });

        const result = await new Promise((resolve, reject) => {
            const options = {
                agent,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Connection': 'keep-alive'
                }
            };

            const req = https.get(url, options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        bodyLength: data.length,
                        bodySnippet: data.substring(0, 500)
                    });
                });
            });

            req.on('error', (e) => reject(e));
        });

        res.json({
            success: true,
            targetUrl: url,
            result
        });

    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
