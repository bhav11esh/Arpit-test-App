import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function fetchRoasteaRaw() {
  const url = 'https://script.google.com/macros/s/AKfycbwgZf-mpgue0iNN3ucJZvSGyYyM0fAbJb_ekzJ0hXXFBuDUjbMEeW27OoY3uPP7CsLI/exec'; // Roastea's URL
  const sheetId = '1niFHH89sQhrbqLQc49c2ZInvnMAZ4OC6dbKXCNvIyEI'; // From user screenshot

  console.log('Fetching raw data via POST for Roastea...');
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

fetchRoasteaRaw();
