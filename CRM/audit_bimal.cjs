const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const SHEET_URL = 'https://script.google.com/macros/s/AKfycbz-D007jknhmLPVNHlZWB0US34a2WGNG0xTti9m3fo0SVp8GKaGuMO9U65Hc3mXDcA8Sg/exec';
const SHEET_ID = '1i-NFzqjMMwu42taRUhDVfS-XUryKP9p4ej-I4IKq_yU';
const SHOWROOM_CODE = 'BIMAL_NEXA';
const MAPPING_IDS = ['d41ba006-fed3-45c8-b922-efd3bcca954b', '7b2e7ece-ac79-4fe1-b27a-aabe2815d2e5'];


async function runAudit() {
  console.log('--- Starting Bimal Nexa Audit (13 Rows) ---');

  // 1. Fetch CRM Data
  console.log('Fetching CRM deliveries...');
  const { data: crmData, error: crmError } = await supabase
    .from('deliveries')
    .select('*, users!assigned_user_id(name)')
    .or(`showroom_code.eq.${SHOWROOM_CODE},showroom_code.in.(${MAPPING_IDS.join(',')})`)
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
    console.error('Apps Script Error Response:', typeof response.data === 'string' ? response.data.substring(0, 500) : JSON.stringify(response.data, null, 2));
    return;
  }

  let sheetRows = response.data.data;
  if (Array.isArray(sheetRows) && sheetRows.length > 0 && Array.isArray(sheetRows[0])) {
    const headers = sheetRows[0];
    console.log('Sheet Headers:', headers);
    sheetRows = sheetRows.slice(1).map(row => {

      const obj = {};
      headers.forEach((h, i) => { if (h) obj[h.trim()] = row[i]; });
      return obj;
    });
  } else if (Array.isArray(sheetRows)) {
    sheetRows = sheetRows.map(r => {
        if (!r) return {};
        const normalized = {};
        Object.keys(r).forEach(k => normalized[k.trim()] = r[k]);
        return normalized;
    });
  }
  
  console.log(`Found ${sheetRows.length} data rows in Google Sheet.`);

  // 3. Comparison Logic
  const mismatches = [];

  sheetRows.forEach((sRow, index) => {
    const sheetDate = parseDate(sRow["Date"]);
    const sheetPhotographer = (sRow["Photographer"] || "").trim();
    const sheetFootage = (sRow["Footage Link"] || "").trim();
    const sheetReel = (sRow["Reel Link"] || "").trim();

    // Find matching CRM record by date (+ index if multiple)
    const match = crmData.find(c => {
        const cDate = c.date;
        return cDate === sheetDate; // Simplified match for small dataset
    });

    if (!match) {
        mismatches.push(`[Row ${index+2}] No match found in CRM for Date: ${sheetDate}`);
        return;
    }

    // Detail check
    const details = {
        date: match.date === sheetDate,
        photographer: (match.users?.name || "").toLowerCase().includes(sheetPhotographer.toLowerCase()) || sheetPhotographer.toLowerCase().includes((match.users?.name || "").toLowerCase()),
        footage: cleanLink(match.footage_link) === cleanLink(sheetFootage),
        reel: cleanLink(match.reel_link) === cleanLink(sheetReel)
    };

    if (!Object.values(details).every(v => v)) {
        mismatches.push(`[Row ${index+2}] Detail mismatch: ${JSON.stringify(details)} | Sheet: [${sheetDate}, ${sheetPhotographer}] | CRM: [${match.date}, ${match.users?.name}]`);
    }
  });

  console.log('\n--- AUDIT REPORT ---');
  if (mismatches.length === 0 && sheetRows.length === crmData.length) {
    console.log('✅ 100% PARITY! All 13 rows and all details match perfectly.');
  } else {
    console.log(`⚠️ FOUND ${mismatches.length} ISSUES.`);
    console.log(`Row Counts: Sheet=${sheetRows.length}, CRM=${crmData.length}`);
    mismatches.forEach(m => console.log(m));
  }
}

function parseDate(dStr) {
    if (!dStr) return null;
    if (typeof dStr === 'number') {
        const date = new Date(Math.round((dStr - 25569) * 86400 * 1000));
        return date.toISOString().split('T')[0];
    }
    const trimmed = String(dStr).trim().replace(/\)$/, ''); // Handle "1-12-2025)"
    const dmyMatch = trimmed.match(/^(\d{1,2})\s*[\s\-\.\/]\s*(\d{1,2})\s*[\s\-\.\/]\s*(\d{2,4})/);
    if (dmyMatch) {
        let [_, d, m, y] = dmyMatch;
        if (y.length === 2) y = '20' + y;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    try {
        const d = new Date(trimmed);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    } catch(e) {}
    return trimmed;
}

function cleanLink(link) {
    if (!link) return "";
    return link.split('?')[0].split('&')[0].trim();
}

runAudit();
