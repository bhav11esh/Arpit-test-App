const fs = require('fs');

function checkMalliRaw() {
  const files = ['pps_mahindra_raw.json', 'skoda_raw.json', 'pavan_hyundai_raw.json', 'tata_raw.json', 'roastea_crm.json', 'naara_kia_raw.json'];
  
  files.forEach(file => {
    if (!fs.existsSync(file)) {
      console.log(`File ${file} does not exist.`);
      return;
    }
    
    const content = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(content);
    
    // Check structure. If it is a raw dump, it might have data array.
    const rows = data.data || data;
    if (!Array.isArray(rows)) {
      console.log(`File ${file} is not an array.`);
      return;
    }
    
    console.log(`\n--- File: ${file} ---`);
    let malliCount = 0;
    let totalCount = 0;
    
    rows.forEach((row, idx) => {
      // Raw sheet dumps usually have columns: Date, Phone, Footage, Reel, Photographer, etc.
      // Or they can be objects. Let's inspect
      const rowStr = JSON.stringify(row).toLowerCase();
      if (rowStr.includes('2026-05') || rowStr.includes('/05/2026') || rowStr.includes('.05.2026') || rowStr.includes('-05-2026') || rowStr.includes('may')) {
        totalCount++;
        if (rowStr.includes('mallikarjun')) {
          malliCount++;
        }
      }
    });
    
    console.log(`Total May 2026 rows: ${totalCount}`);
    console.log(`Rows containing 'mallikarjun': ${malliCount}`);
  });
}

checkMalliRaw();
