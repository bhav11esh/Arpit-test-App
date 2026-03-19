import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function fetchRERaw() {
  const url = 'https://script.google.com/macros/s/AKfycbxgA4GP2k3PLEWliE6Lj_M5xMOF-YmM6XMcBj99VtIspb86Qn3m526wuet3_UPY0avK/exec'; 
  const sheetId = '1wYdG7t6nzh-QuPBqX27NX72HIKJoQY91vp4q76Avs04'; 

  console.log('Fetching raw data via POST for Royal Enfield...');
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
      fs.writeFileSync('re_raw.json', JSON.stringify(data, null, 2));
      console.log(`Successfully fetched ${data.data.length} rows.`);
    } else {
      console.error('API Error:', data.message);
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

fetchRERaw();
