const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const parseDate = (dStr) => {
  if (!dStr) return null;
  const trimmed = typeof dStr === 'string' ? dStr.trim() : String(dStr);
  let res = null;
  if (trimmed.includes('T') && trimmed.includes('Z')) {
    try {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        const local = new Date(d.getTime() + 5.5 * 3600000);
        res = local.toISOString().split('T')[0];
      }
    } catch (e) {}
  }
  const normalizedTrimmed = trimmed.replace(/[\u2013\u2014]/g, '-');
  if (!res) {
    const m = normalizedTrimmed.match(/^(\d{1,2})\s*[\s\-\.\/]\s*(\d{1,2})\s*[\s\-\.\/]\s*(\d{2,4})/);
    if (m) {
      let [_, d, mon, y] = m;
      if (y.length === 2) y = '20' + y;
      res = `${y}-${mon.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  if (!res) {
    try {
      const d = new Date(normalizedTrimmed);
      if (!isNaN(d.getTime())) res = d.toISOString().split('T')[0];
    } catch (e) {}
  }
  return res;
};

const cleanLink = (link) => {
  if (!link) return "";
  return link.split('?')[0].split('&')[0].trim().toLowerCase();
};

async function auditShowroom(name, code, rawFile) {
  console.log(`\n--- AUDIT: ${name} (${code}) ---`);
  const rawData = JSON.parse(fs.readFileSync(rawFile, 'utf8'));
  const headers = rawData[0];
  const sheetRows = rawData.slice(1).map((row, i) => {
    const obj = {};
    headers.forEach((h, j) => { if (h) obj[h.trim()] = row[j]; });
    obj._sheetRow = i + 2;
    obj._rawIndex = i;
    return obj;
  });

  const { data: crmData } = await supabase
    .from('deliveries')
    .select('*, users(name)')
    .eq('showroom_code', code);

  console.log(`Sheet Rows: ${sheetRows.length}, CRM Records: ${crmData.length}`);

  const mismatches = [];
  sheetRows.forEach((sRow) => {
    const sDate = parseDate(sRow['Date'] || sRow['date']);
    const sFootage = cleanLink(sRow['Footage Link'] || sRow['Footage link']);
    const sReel = cleanLink(sRow['Reel Link'] || sRow['Reel link']);
    const sPhotog = (sRow['Photographer'] || sRow['Photographer name'] || "").trim().toLowerCase();

    // In these Kataria sheets, there is no chassis/customer name. 
    // We must match primarily by DATE and index (as they are imported as Delivery_YYYY-MM-DD_Index)
    // OR we match by links.
    const match = crmData.find(c => {
      const dMatch = c.date === sDate;
      const fMatch = cleanLink(c.footage_link) === sFootage;
      const rMatch = cleanLink(c.reel_link) === sReel;
      return dMatch && (fMatch || rMatch);
    });

    if (!match) {
      mismatches.push(`[Sheet Row ${sRow._sheetRow}] NO MATCH in CRM (Date: ${sDate}, Photographer: ${sPhotog})`);
      return;
    }

    const cPhotog = (match.users?.name || "").toLowerCase();
    const pMatch = !sPhotog || cPhotog.includes(sPhotog) || sPhotog.includes(cPhotog);
    
    if (!pMatch) {
      mismatches.push(`[Sheet Row ${sRow._sheetRow}] Photog Mismatch: Sheet="${sPhotog}", CRM="${cPhotog}"`);
    }
    // Links already matched in find
  });

  if (mismatches.length === 0 && sheetRows.length === crmData.length) {
    console.log(`✅ ${name}: 100% PARITY!`);
  } else {
    console.log(`⚠️ ${name}: ISSUES FOUND`);
    mismatches.forEach(m => console.log(m));
  }
}

async function run() {
  await auditShowroom('Kataria Arena', 'KATARIA_ARENA_BENGALURU', 'kataria_arena_raw.json');
  await auditShowroom('Kataria Nexa', 'KATARIA_NEXA_BENGALURU', 'kataria_nexa_raw.json');
}

run().then(() => process.exit());
