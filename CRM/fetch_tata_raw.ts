import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function fetchTataRaw() {
  const url = process.env.VITE_GOOGLE_SYNC_URL; 
  const sheetId = '1w7Tsdt4fEIQN5Nn4Uu1NF8thTa60UB76Vcb8wP92ad8';

  console.log('Fetching raw data via POST for Tata Kropex...');
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
      fs.writeFileSync('tata_raw.json', JSON.stringify(data, null, 2));
      console.log(`Successfully fetched ${data.data.length} rows.`);
    } else {
      console.error('API Error:', data.message);
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

fetchTataRaw();
