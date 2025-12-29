
import axios from 'axios';
const pdf = require('pdf-parse');

async function checkOS() {
    const url = 'https://www.calcuttahighcourt.gov.in/downloads/old_cause_lists/OS/cl22122025.pdf';
    console.log(`Downloading ${url}...`);
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer' });
        const data = await pdf(res.data);
        console.log('--- PDF TEXT START ---');
        console.log(data.text.slice(0, 2000));
        console.log('--- PDF TEXT END ---');
    } catch (e) {
        console.error(e.message);
    }
}

checkOS();
