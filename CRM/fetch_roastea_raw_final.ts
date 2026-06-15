import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function fetchRoasteaRawFinal() {
  const url = 'https://script.google.com/macros/s/AKfycbwUeW2SjRCo_ovUOxIcmver4dFUoFwWlneiNr4H06nDUAV7oO2vQibPPfU_EDvT3mgj7g/exec'; // Mahindra's common URL
  const sheetId = '1niFHH89sQhrbqLQc49c2ZInvnMAZ4OC6dbKXCNvIylE'; // Corrected (l)

  console.log('Fetching raw data via POST for Roastea (vIylE)...');
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
      fs.writeFileSync('roastea_raw.json', JSON.stringify(data, null, 2));
      console.log(`Successfully fetched ${data.data.length} rows.`);
    } else {
      console.error('API Error:', data.message);
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

fetchRoasteaRawFinal();
