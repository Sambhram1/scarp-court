
import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    try {
        console.log('Navigating to https://bombayhighcourt.nic.in/netbd.php ...');
        await page.goto('https://bombayhighcourt.nic.in/netbd.php', { waitUntil: 'domcontentloaded' });

        console.log('Page Title:', await page.title());

        const content = await page.content();
        if (content.includes('Invalid inputs')) {
            console.log('Detected "Invalid inputs" error on direct load.');
            // Try navigating from homepage or index?
            // But first let's see if there are any visible inputs despite the error
        }

        const inputs = await page.locator('input, select').all();
        console.log(`Found ${inputs.length} inputs/selects.`);

        for (const input of inputs) {
            const name = await input.getAttribute('name');
            const type = await input.getAttribute('type');
            const tagName = await input.evaluate(el => el.tagName);
            console.log(`  ${tagName}: name=${name} type=${type}`);
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
})();
