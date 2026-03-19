import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function fetchSkodaRawPost() {
  const url = 'https://script.google.com/macros/s/AKfycbwOiMcJa6Eyhx4r5ybp2iBHRukHIJBM4yAxp0ndNoPscjiI96aMa7Q8ZM2l3-RBb9xe/exec'; // Apple Auto common URL
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

    const text = await response.text();
    if (text.startsWith('<!DOCTYPE')) {
       console.error('Error: Received HTML instead of JSON');
       return;
    }
    const data = JSON.parse(text);
    if (data.status === 'success') {
      fs.writeFileSync('pps_skoda_raw_v3.json', JSON.stringify(data, null, 2));
      console.log(`Successfully fetched ${data.data.length} rows.`);
    } else {
      console.error('API Error:', data.message);
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

fetchSkodaRawPost();
