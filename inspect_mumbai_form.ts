
import axios from 'axios';
import * as cheerio from 'cheerio';

async function inspectNetbd(url: string) {
    try {
        console.log(`Fetching ${url}...`);
        const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(response.data);

        console.log('Page Content Preview:');
        console.log($('body').text().substring(0, 500).replace(/\s+/g, ' '));

        // Check for forms
        $('form').each((i, el) => {
            console.log(`Form ${i}: action=${$(el).attr('action')} method=${$(el).attr('method')}`);
            $(el).find('input, select').each((j, inp) => {
                console.log(`  Input: name=${$(inp).attr('name')} type=${$(inp).attr('type')}`);
            });
        });

    } catch (e) {
        console.log(`Failed: ${e.message}`);
    }
}

(async () => {
    await inspectNetbd('https://bombayhighcourt.nic.in/netbd.php');
})();
