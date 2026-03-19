const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const SHEET_URL = 'https://script.google.com/macros/s/AKfycbxLz2bGzUNYXD2E6y156QvFuytaBgew6lv0phXx93u-BNAUqvhQWrJkfJ2i5yMCQ78/exec';
const SHEET_ID = '15W2h5GAgVeMPGCscmX_7izo0wB73l5IHTEeLqENMZlA';
const SHOWROOM_CODE = 'APPLE_AUTO_VOLKSWAGEN';

async function runAudit() {
  console.log('--- Starting Apple Auto VW Full Detail Audit (351 Rows) ---');

  // 1. Fetch CRM Data
  console.log('Fetching CRM deliveries...');
  const { data: crmData, error: crmError } = await supabase
    .from('deliveries')
    .select('*, users!assigned_user_id(name)')
    .eq('showroom_code', SHOWROOM_CODE)
    .order('date', { ascending: true });

  if (crmError) {
    console.error('CRM Fetch Error:', crmError);
    return;
  }
  console.log(`Found ${crmData.length} records in CRM.`);

  // 2. Fetch Google Sheet Data
  console.log('Fetching Google Sheet data...');
  const response = await axios.post(SHEET_URL, {
    action: 'read',
    sheetId: SHEET_ID
  }, {
    headers: { 'Content-Type': 'text/plain' }
  });
  
  if (!response.data || response.data.status !== 'success') {
    console.error('Apps Script Error Response:', response.data);
    return;
  }

  const rawRows = response.data.data;
  const headers = rawRows[0];
  const sheetRows = rawRows.slice(1).map((row, i) => {
    const obj = {};
    headers.forEach((h, j) => { if (h) obj[h.trim()] = row[j]; });
    obj._sheetRow = i + 2;
    obj._rawIndex = i;
    return obj;
  });

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

  const filteredSheetRows = sheetRows.filter(row => {
    const pd = parseDate(row['Date']);
    if (!pd || pd.toLowerCase().includes('date')) return false;
    const hasData = Object.keys(row).some(k => k.toLowerCase() !== 'date' && !k.startsWith('_') && !!row[k]);
    row._pd = pd;
    return hasData;
  });

  console.log(`Filtered Sheet Rows count: ${filteredSheetRows.length}`);

  // 3. Comparison
  const mismatches = [];

  filteredSheetRows.forEach((sRow) => {
    const sheetChassis = (sRow["Chassis Number"] || "").trim().toLowerCase();
    const sheetCustomer = (sRow["Customer Name"] || "").trim().toLowerCase();
    const sheetPhotographer = (sRow["Photographer"] || "").trim().toLowerCase();
    const sheetFootage = cleanLink(sRow["Footage Link"]);
    const sheetReel = cleanLink(sRow["Reel Link"]);

    // Find CRM match
    const matches = crmData.filter(c => c.date === sRow._pd);
    let match = matches.find(c => {
        const crmName = c.delivery_name.toLowerCase();
        const chassisFound = sheetChassis && crmName.includes(sheetChassis);
        const customerFound = sheetCustomer && crmName.includes(sheetCustomer);
        const indexFound = crmName.includes(`_${sRow._rawIndex}`);
        return chassisFound || customerFound || indexFound;
    });

    if (!match) {
        mismatches.push(`[Row ${sRow._sheetRow}] NO MATCH in CRM: Date=${sRow._pd}, Chassis=${sRow["Chassis Number"]}, Customer=${sRow["Customer Name"]}`);
        return;
    }

    // Detail check
    const crmFootage = cleanLink(match.footage_link);
    const crmReel = cleanLink(match.reel_link);
    const crmPhotogRaw = (match.users?.name || "").toLowerCase();
    
    const photographerMatch = !sheetPhotographer || crmPhotogRaw.includes(sheetPhotographer) || sheetPhotographer.includes(crmPhotogRaw);
    const footageMatch = !sheetFootage || crmFootage === sheetFootage;
    const reelMatch = !sheetReel || crmReel === sheetReel;

    if (!photographerMatch || !footageMatch || !reelMatch) {
        mismatches.push(`[Row ${sRow._sheetRow}] DETAIL MISMATCH: Photog:${photographerMatch}, Footage:${footageMatch}, Reel:${reelMatch} | CRM: ${match.delivery_name}`);
    }
  });

  console.log('\n--- VW AUDIT REPORT ---');
  if (mismatches.length === 0 && filteredSheetRows.length === crmData.length) {
    console.log('✅ 100% PARITY! All 351 rows match exactly.');
  } else {
    console.log(`⚠️ ISSUES FOUND: ${mismatches.length}`);
    console.log(`Counts: Sheet=${filteredSheetRows.length}, CRM=${crmData.length}`);
    mismatches.slice(0, 20).forEach(m => console.log(m));
    if (mismatches.length > 20) console.log(`... and ${mismatches.length - 20} more issues.`);
  }
}

runAudit();
