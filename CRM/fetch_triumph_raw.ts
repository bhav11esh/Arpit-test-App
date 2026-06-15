import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function fetchTriumphRaw() {
  const url = 'https://script.google.com/macros/s/AKfycbw0zg5p8UVjpI69bWvKZHiSStuLdcnlUSPoLKzEK9bIQQC4PQmVAwxx-1aiwNT3CIBOmA/exec'; 
  const sheetId = '1c8ESv_2C59WC_xY_HFQSGbCG__nlZVoK_12vqfyiL60';

  console.log('Fetching raw data via POST for Triumph Popular...');
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        action: 'read',
        sheetId: sheetId
      })
    });

    const data = await response.json();
    if (data.status === 'success') {
      fs.writeFileSync('triumph_raw.json', JSON.stringify(data, null, 2));
      console.log(`Successfully fetched ${data.data.length} rows.`);
    } else {
      console.error('API Error:', data.message);
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

fetchTriumphRaw();
