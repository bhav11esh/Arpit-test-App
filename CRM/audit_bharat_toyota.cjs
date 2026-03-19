const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const SHEET_URL = 'https://script.google.com/macros/s/AKfycbwd40aJFsJRJfUYHn-lik5UjGjfkz8L3TYD8gjRUOhhm1jn-2x_NnVDO017Fb55X4-8/exec';
const SHEET_ID = '19YjaFl_boZkBmdFUibETFxoCgrQktNKlnUozdDsa0sU';
const SHOWROOM_CODE = 'BHARAT_TOYOTA';

async function runAudit() {
  console.log('--- Starting Bharat Toyota Audit (153 Rows) ---');

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
    console.error('Apps Script Error Response:', typeof response.data === 'string' ? response.data.substring(0, 500) : JSON.stringify(response.data, null, 2));
    return;
  }

  let sheetRows = response.data.data;
  console.log('Raw data type:', typeof sheetRows, 'IsArray:', Array.isArray(sheetRows));

  if (!sheetRows) {
    console.error('Error: sheetRows is null or undefined');
    return;
  }

  // Convert Array of Arrays to Array of Objects if needed
  if (Array.isArray(sheetRows) && sheetRows.length > 0 && Array.isArray(sheetRows[0])) {
    const headers = sheetRows[0];
    sheetRows = sheetRows.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => { if (h) obj[h.trim()] = row[i]; });
      return obj;
    });
  } else if (Array.isArray(sheetRows)) {
    // Normalize headers if it's already objects
    sheetRows = sheetRows.map(r => {
        if (!r) return {};
        const normalized = {};
        Object.keys(r).forEach(k => normalized[k.trim()] = r[k]);
        return normalized;
    });
  } else {
    console.error('Error: sheetRows is not an array');
    return;
  }
  
  console.log(`Found ${sheetRows.length} data rows in Google Sheet.`);

  // 3. Comparison Logic
  const report = [];
  const mismatches = [];

  sheetRows.forEach((sRow, index) => {
    const sheetDate = parseDate(sRow["Date"]);
    const sheetCustomer = (sRow["Customer Name"] || sRow["Customer"] || "").trim();
    const sheetPhotographer = (sRow["Photographer"] || "").trim();
    const sheetFootage = (sRow["Footage Link"] || "").trim();
    const sheetReel = (sRow["Reel Link"] || "").trim();

    // Find matching CRM record
    // We match by date and customer name (or index-based delivery name if customer is missing)
    const match = crmData.find(c => {
        const cDate = c.date;
        const cName = (c.delivery_name || "").trim();
        const dateMatch = (cDate === sheetDate);
        const nameMatch = cName.includes(sheetCustomer) || sheetCustomer.includes(cName) || cName.includes(`_${index}`);
        return dateMatch && nameMatch;
    });

    if (!match) {
        mismatches.push(`[Row ${index+2}] No match found in CRM for Date: ${sheetDate}, Customer: ${sheetCustomer}`);
        return;
    }

    // Detail check
    const details = {
        date: match.date === sheetDate,
        customer: (match.delivery_name || "").includes(sheetCustomer) || sheetCustomer.includes(match.delivery_name || ""),
        photographer: (match.users?.name || "").toLowerCase().includes(sheetPhotographer.toLowerCase()) || sheetPhotographer.toLowerCase().includes((match.users?.name || "").toLowerCase()),
        footage: cleanLink(match.footage_link) === cleanLink(sheetFootage),
        reel: cleanLink(match.reel_link) === cleanLink(sheetReel)
    };

    if (!Object.values(details).every(v => v)) {
        mismatches.push(`[Row ${index+2}] Detail mismatch: ${JSON.stringify(details)} | Sheet: [${sheetDate}, ${sheetCustomer}, ${sheetPhotographer}] | CRM: [${match.date}, ${match.delivery_name}, ${match.users?.name}]`);
    }
  });

  console.log('\n--- AUDIT REPORT ---');
  if (mismatches.length === 0 && sheetRows.length === crmData.length) {
    console.log('✅ 100% PARITY! All 153 rows and all details match perfectly.');
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
    const trimmed = String(dStr).trim();
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
