
import axios from 'axios';

async function checkUrl(url: string) {
    try {
        console.log(`Checking ${url}...`);
        const response = await axios.get(url, {
            validateStatus: () => true
        });
        console.log(`Status: ${response.status}`);
        console.log('Headers:', response.headers);
    } catch (e) {
        console.log(`Failed: ${e.message}`);
    }
}

(async () => {
    // Official site often used for cause lists
    await checkUrl('https://bombayhighcourt.nic.in/');
    await checkUrl('https://bombayhighcourt.nic.in/causelist.php');
    await checkUrl('https://bombayhighcourt.nic.in/index.html');
})();
