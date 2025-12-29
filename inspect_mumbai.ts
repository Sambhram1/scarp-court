
import axios from 'axios';
import * as cheerio from 'cheerio';

async function inspectPage(url: string) {
    try {
        console.log(`Fetching ${url}...`);
        const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(response.data);

        console.log('Page Title:', $('title').text());

        // Look for links related to Cause List
        $('a').each((i, el) => {
            const text = $(el).text().trim();
            const href = $(el).attr('href');
            if (text.toLowerCase().includes('cause') || (href && href.toLowerCase().includes('cause'))) {
                console.log(`Found Link: [${text}] -> ${href}`);
            }
        });
    } catch (e) {
        console.log(`Failed: ${e.message}`);
    }
}

(async () => {
    await inspectPage('https://bombayhighcourt.nic.in/');
})();
