
import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: true });
    // Try separate context to handle potential cookies/headers
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    try {
        // "netbd.php" seemed to be the "Text Causelist" from previous grep
        const url = 'https://bombayhighcourt.nic.in/netbd.php';
        console.log(`Navigating to ${url}...`);

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        console.log('Page loaded:', await page.title());

        // Check for "Invalid inputs" error again
        const content = await page.content();
        if (content.includes('Invalid inputs')) {
            console.log('Still getting "Invalid inputs". Trying to find a referring page...');
            // Maybe we need to come from the homepage?
            await page.goto('https://bombayhighcourt.nic.in/', { waitUntil: 'domcontentloaded' });
            console.log('On Homepage');
            // Try to click the "Cause List" link if exists
            const link = page.locator('a', { hasText: 'Cause List' }).first();
            if (await link.count() > 0) {
                console.log('Clicking "Cause List" link...');
                await link.click();
                await page.waitForLoadState('domcontentloaded');
                console.log('Navigated to:', page.url());
            }
        }

        // Look for form inputs again
        const inputs = await page.locator('input, select').all();
        console.log(`Found ${inputs.length} inputs.`);
        for (const input of inputs) {
            console.log(`Input: ${await input.getAttribute('name')} (${await input.getAttribute('type')})`);
        }

        // Take a screenshot to visualize
        await page.screenshot({ path: 'mumbai_page.png' });

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
})();
