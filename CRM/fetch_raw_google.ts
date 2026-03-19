import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function fetchRawGoogleData() {
  const SYNC_URL = process.env.VITE_GOOGLE_SYNC_URL;
  const sheetId = '1HR08Grc6dsb7DQtoGiCkxOBJ7ehiQyEzl1W8lr1CuVc';

  if (!SYNC_URL) {
      console.error('VITE_GOOGLE_SYNC_URL missing');
      return;
  }

  console.log('Fetching from:', SYNC_URL);
  console.log('Sheet ID:', sheetId);

  try {
      const response = await fetch(SYNC_URL, {
          method: 'POST',
          body: JSON.stringify({
              action: 'read',
              sheetId: sheetId
          })
      });
      
      const text = await response.text();
      fs.writeFileSync('raw_fetch_result.json', text);
      
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

fetchRawGoogleData();
