import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function fetchSkodaRaw() {
  const url = 'https://script.google.com/macros/s/AKfycbxXZnQvkpnNwWwHZL69BzFOTEbxR1t-F5MOZ9c0uXJCg1f9qB3q9RtS0rEWXj1M1ti6/exec'; 
  const sheetId = '1uU-YZhZ0OK_CI3KOJvs1fHD3EBROBUpbRlceBKA17ws'; 

  console.log('Fetching raw data via POST for Skoda Karr...');
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
      fs.writeFileSync('skoda_raw.json', JSON.stringify(data, null, 2));
      console.log(`Successfully fetched ${data.data.length} rows.`);
    } else {
      console.error('API Error:', data.message);
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

fetchSkodaRaw();
