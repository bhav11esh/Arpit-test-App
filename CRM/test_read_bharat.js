const fetch = require('node-fetch');

async function testRead() {
    const SYNC_URL = 'https://script.google.com/macros/s/AKfycbxLz2bGzUNYXD2E6y156QvFuytaBgew6lv0phXx93u-BNAUqvhQWrJkfJ2i5yMCQ78/exec';
    const sheetId = '1HR08Grc6dsb7DQtoGiCkxOBJ7ehiQyEzl1W8lr1CuVc';

    console.log('Fetching from Apps Script...');
    try {
        const response = await fetch(SYNC_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'read',
                sheetId: sheetId
            })
        });
        const result = await response.json();
        if (result.status === 'success') {
            const data = result.data;
            console.log('Headers:', data[0]);
            console.log('Row 2 (index 1):', data[1]);
            console.log('Row 3 (index 2):', data[2]);
            
            // Look for "Sliver Glanza" or any link
            data.forEach((row, i) => {
                const footage = row[2]; // Column C
                if (footage && footage.length > 5) {
                    console.log(`Row ${i} Col C: "${footage}"`);
                }
            });
        } else {
            console.log('Error from Apps Script:', result.m || result.message);
        }
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

testRead();
