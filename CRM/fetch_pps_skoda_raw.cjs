const fs = require('fs');

async function fetchSkodaRaw() {
  const url = 'https://script.google.com/macros/s/AKfycbyqiwNwDYDPQT8Evhps6_gsPUHBNYjMhLpF-ltr72XKEIm7mH46AwDdd8lpXbCgPqcTBQ/exec';
  // Use the same pattern as fetch_pps_mahindra.ts
  const sheetId = '1TJ-zQIGYhw3MaJqzoUerTnc8SoQPvdf9c697067jbOs'; 

  const fullUrl = `${url}?sheetId=${sheetId}`;
  console.log(`Fetching from ${fullUrl}...`);

  try {
    const response = await fetch(fullUrl);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const data = await response.json();
    fs.writeFileSync('pps_skoda_raw.json', JSON.stringify(data, null, 2));
    console.log(`Successfully fetched ${data.data.length} rows for PPS Skoda.`);
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

fetchSkodaRaw();
