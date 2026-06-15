
const fs = require('fs');

const syncUrl = 'https://script.google.com/macros/s/AKfycbxLz2bGzUNYXD2E6y156QvFuytaBgew6lv0phXx93u-BNAUqvhQWrJkfJ2i5yMCQ78/exec';
const sheetId = '1HR08Grc6dsb7DQtoGiCkxOBJ77ehiQyEzI1W8Ir1CuVc';

async function fetchSheetData() {
    console.log('Fetching sheet data for comparison...');
    
    try {
        const response = await fetch(syncUrl, {
            method: 'POST',
            body: JSON.stringify({
                action: 'read',
                sheetId: sheetId
            })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            fs.writeFileSync('tmp/nandi_sheet_data.json', JSON.stringify(result.data, null, 2));
            console.log(`Fetched ${result.data.length} records from Google Sheet.`);
        } else {
            console.error('Error fetching sheet data:', result.message);
        }
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

fetchSheetData();
