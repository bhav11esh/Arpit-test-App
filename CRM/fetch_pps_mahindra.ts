import fs from 'fs';
import path from 'path';

async function fetchPPSMahindraData() {
  const SYNC_URL = 'https://script.google.com/macros/s/AKfycbwUeW2SjRCo_ovUOxIcmver4dFUoFwWlneiNr4H06nDUAV7oO2vQibPPfU_EDvT3mgj7g/exec';
  const sheetId = '1E7owgzt8Mdo6nXo5KK62-UNB1-f4IRYEhr-v3GPnm7c';

  console.log('Fetching PPS Mahindra data...');
  console.log('URL:', SYNC_URL);

  try {
    const response = await fetch(SYNC_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'read',
        sheetId: sheetId
      })
    });

    const text = await response.text();
    fs.writeFileSync('pps_mahindra_raw.json', text);

    try {
      const json = JSON.parse(text);
      if (json.status === 'success') {
        console.log(`Success! Fetched ${json.data.length} rows.`);
      } else {
        console.log('API Error:', json.message);
      }
    } catch (e) {
      console.log('Response is not valid JSON. First 500 chars:');
      console.log(text.substring(0, 500));
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

fetchPPSMahindraData();
