
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
            if (href) {
                if (text.toLowerCase().includes('cause') || href.toLowerCase().includes('cause') || href.toLowerCase().includes('list')) {
                    console.log(`Found Link: [${text}] -> ${href}`);
                }
            }
        });
    } catch (e) {
        console.log(`Failed: ${e.message}`);
    }
}

(async () => {
    // Attempt specific known pages or subdomains
    await inspectPage('https://bombayhighcourt.nic.in/causelist.php'); // Guess
    await inspectPage('https://bombayhighcourt.nic.in/cjshow.php'); // Guess
})();
