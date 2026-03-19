import fs from 'fs';

async function fetchAppleRaw() {
  const url = 'https://script.google.com/macros/s/AKfycbw0iMcJa6Eyhx4r5ybp2iBHRukHIJBM4yAxp0ndNoPscjiI96aMa7Q8ZM2l3-RBb9xe/exec';
  const sheetId = '1eTlyS7N_17e3_J2FshA0wB73l5IHTEeLqENMZlA';

  const fullUrl = `${url}?sheetId=${sheetId}`;
  console.log(`Fetching from ${fullUrl}...`);

  try {
    const response = await fetch(fullUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    fs.writeFileSync('apple_auto_raw.json', JSON.stringify(data, null, 2));
    console.log(`Successfully fetched ${data.data.length} rows for Apple Auto.`);
  } catch (error) {
    console.error('Error fetching data:', error);
    process.exit(1);
  }
}

fetchAppleRaw();
