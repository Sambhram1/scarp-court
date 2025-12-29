import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api/cause-list';

async function checkCourt(courtName: string, courtId: string, date: string, courtRoom = 'ALL COURTS') {
    console.log(`\n--- Checking ${courtName} [${date}] ---`);
    const params = {
        date,
        court: courtRoom,
        courtId
    };

    try {
        console.log(`GET ${BASE_URL}`);
        console.log('Params:', params);

        const response = await axios.get(BASE_URL, { params });

        console.log('------------------------------------------------');
        console.log(`Status: ${response.status} ${response.statusText}`);
        console.log(`Source: ${response.data.source}`);
        console.log(`Count: ${response.data.count}`);

        if (response.data.DEBUG_MODE) {
            console.log(`DEBUG_MODE: ${response.data.DEBUG_MODE}`);
        }

        if (response.data.data && response.data.data.length > 0) {
            console.log(`Found ${response.data.data.length} entries.`);
            console.log('Sample Entry 1:');
            console.dir(response.data.data[0], { depth: null, colors: true });
        } else {
            console.log('No data returned (Empty List).');
        }
        console.log('------------------------------------------------');

    } catch (error: any) {
        console.error('Error calling API:');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error('Data:', error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

async function main() {
    // Checking Madras High Court
    await checkCourt('Madras High Court', 'madras', '2025-12-22');

    // Previous tests
    // await checkCourt('Calcutta High Court', 'calcutta', '2025-12-22');
}

main();
