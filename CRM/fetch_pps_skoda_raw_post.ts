import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function fetchSkodaRawPost() {
  const url = 'https://script.google.com/macros/s/AKfycbwUeW2SjRCo_ovUOxIcmver4dFUoFwWlneiNr4H06nDUAV7oO2vQibPPfU_EDvT3mgj7g/exec'; // Using Mahindra's common URL
  const sheetId = '1TJ-zQIGYhw3MaJqzoUerTnc8SoQPvdf9c697067jbOs';

  console.log('Fetching raw data via POST for PPS Skoda...');
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
      fs.writeFileSync('pps_skoda_raw.json', JSON.stringify(data, null, 2));
      console.log(`Successfully fetched ${data.data.length} rows.`);
    } else {
      console.error('API Error:', data.message);
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

fetchSkodaRawPost();
