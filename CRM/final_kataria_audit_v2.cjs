const fs = require('fs');

const data = JSON.parse(fs.readFileSync('kataria_crm_final.json', 'utf8'));
const userMap = {};
data.users.forEach(u => userMap[u.id] = u.name);

const parseDate = (dStr) => {
  if (!dStr) return null;
  const trimmed = typeof dStr === 'string' ? dStr.trim() : String(dStr);
  
  let result = null;
  if (trimmed.includes('T') && trimmed.includes('Z')) {
    try {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        // MATCH CRM LOGIC: Add 5.5 hours for IST
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

function audit(label, file, crm) {
  console.log(`\n--- AUDIT: ${label} ---`);
  const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
  const headers = rows[0];
  const dataRows = rows.slice(1);
  console.log(`Sheet: ${dataRows.length}, CRM: ${crm.length}`);

  let matchCount = 0;
  dataRows.forEach((r, i) => {
    const rowObj = {};
    headers.forEach((h, j) => rowObj[h.trim()] = r[j]);

    const sD = parseDate(rowObj['Date'] || rowObj['date']);
    const sF = cleanL(rowObj['Footage link'] || rowObj['Footage Link'] || rowObj['Footage link']);
    const sR = cleanL(rowObj['Reel link'] || rowObj['Reel Link'] || rowObj['Reel link']);
    const sP = (rowObj['Photographer name'] || rowObj['Photographer'] || '').trim().toLowerCase();

    const match = crm.find(c => {
      const dMatch = c.date === sD;
      const fMatch = sF ? cleanL(c.footage_link) === sF : true;
      const rMatch = sR ? cleanL(c.reel_link) === sR : true;
      return dMatch && (fMatch || rMatch);
    });

    if (match) {
      matchCount++;
      const cP = (userMap[match.assigned_user_id] || '').trim().toLowerCase();
      if (sP && !cP.includes(sP) && !sP.includes(cP)) {
        console.log(`[Row ${i+2}] Photog mismatch: Sheet="${sP}", CRM="${cP}" (Date=${sD})`);
      }
    } else {
      console.log(`[Row ${i+2}] MISSING in CRM: Date=${sD}, Footage=${sF}`);
    }
  });

  if (matchCount === dataRows.length && dataRows.length === crm.length) {
    console.log(`✅ ${label}: 100% PARITY!`);
  } else {
    console.log(`⚠️ ${label}: Issues found. Matches=${matchCount}/${dataRows.length}, CRM=${crm.length}`);
  }
}

audit('Kataria Arena', 'kataria_arena_raw.json', data.arena);
audit('Kataria Nexa', 'kataria_nexa_raw.json', data.nexa);
