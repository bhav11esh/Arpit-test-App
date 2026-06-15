const fs = require('fs');

const crmData = JSON.parse(fs.readFileSync('kia_crm_final.json', 'utf8'));
const sheetData = JSON.parse(fs.readFileSync('kia_epitome_raw.json', 'utf8'));

const userMap = {};
crmData.users.forEach(u => userMap[u.id] = u.name);

const parseDate = (dStr) => {
  if (!dStr) return null;
  const trimmed = typeof dStr === 'string' ? dStr.trim() : String(dStr);
  
  let result = null;
  if (trimmed.includes('T') && trimmed.includes('Z')) {
    try {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        const localDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
        result = localDate.toISOString().split('T')[0];
      }
    } catch (e) {}
  }

  if (!result) {
    const normalizedTrimmed = trimmed.replace(/[\u2013\u2014]/g, '-');
    const m = normalizedTrimmed.match(/^(\d{1,2})[\s\-\.\/](\d{1,2})[\s\-\.\/](\d{2,4})/);
    if (m) {
      let [_, d, mon, y] = m;
      if (y.length === 2) y = '20' + y;
      result = `${y}-${mon.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }

  if (!result) {
    try {
      const nativeDate = new Date(trimmed);
      if (!isNaN(nativeDate.getTime())) {
        result = nativeDate.toISOString().split('T')[0];
      }
    } catch (e) {}
  }
  return result;
};

const cleanL = (l) => (l || '').split('?')[0].trim().toLowerCase();

console.log(`\n--- AUDIT: Kia Epitome ---`);
const headers = sheetData[0];
const dataRows = sheetData.slice(1);
const crm = crmData.kia;

console.log(`Sheet Data Rows: ${dataRows.length}, CRM Records: ${crm.length}`);

let matchCount = 0;
const matchedCrmIds = new Set();
const duplicateSheetRows = [];

dataRows.forEach((r, i) => {
  const rowObj = {};
  headers.forEach((h, j) => rowObj[h.trim()] = r[j]);

  const sD = parseDate(rowObj['Date'] || rowObj['date']);
  const sF = cleanL(rowObj['Footage Link'] || rowObj['Footage link']);
  const sR = cleanL(rowObj['Reel Link'] || rowObj['Reel link']);
  const sP = (rowObj['Photographer'] || '').trim().toLowerCase();

  const matchingCrm = crm.filter(c => {
    const dMatch = c.date === sD;
    const fMatch = sF ? cleanL(c.footage_link) === sF : true;
    const rMatch = sR ? cleanL(c.reel_link) === sR : true;
    
    if (sF || sR) {
      return dMatch && (fMatch || rMatch);
    } else {
      const cP = (userMap[c.assigned_user_id] || '').trim().toLowerCase();
      return dMatch && (sP ? cP.includes(sP) || sP.includes(cP) : true);
    }
  });

  if (matchingCrm.length > 0) {
    matchCount++;
    matchingCrm.forEach(c => matchedCrmIds.add(JSON.stringify(c)));
  } else {
    console.log(`[Row ${i+2}] MISSING in CRM: Date=${sD}, Photographer=${sP}, Links=${sF || sR ? 'YES' : 'NO'}`);
  }
});

console.log(`\nUnique CRM Records Matched: ${matchedCrmIds.size}`);
console.log(`Total Sheet Rows Matched: ${matchCount}/${dataRows.length}`);

if (matchedCrmIds.size === dataRows.length && dataRows.length === crm.length) {
  console.log(`✅ Kia Epitome: 100% PARITY!`);
} else {
  console.log(`⚠️ Kia Epitome: Discrepancy found.`);
  if (dataRows.length > crm.length) {
    console.log(`Note: Sheet has ${dataRows.length} rows but CRM has ${crm.length}. Check for duplicates in sheet.`);
  }
}
