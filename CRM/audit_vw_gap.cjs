const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const SHEET_URL = 'https://script.google.com/macros/s/AKfycbxLz2bGzUNYXD2E6y156QvFuytaBgew6lv0phXx93u-BNAUqvhQWrJkfJ2i5yMCQ78/exec';
const SHEET_ID = '15W2h5GAgVeMPGCscmX_7izo0wB73l5IHTEeLqENMZlA';
const SHOWROOM_CODE = 'APPLE_AUTO_VOLKSWAGEN';

async function runAudit() {
  console.log('--- Starting Apple Auto VW Deep Audit (351 Rows) ---');

  // 1. Fetch CRM Data
  const { data: crmData } = await supabase
    .from('deliveries')
    .select('delivery_name, date, footage_link')
    .eq('showroom_code', SHOWROOM_CODE);
  console.log(`Found ${crmData.length} records in CRM.`);

  // 2. Fetch Google Sheet Data
  const response = await axios.post(SHEET_URL, {
    action: 'read',
    sheetId: SHEET_ID
  }, {
    headers: { 'Content-Type': 'text/plain' }
  });
  
  let rawRows = response.data.data;
  const headers = rawRows[0];
  let dataRows = rawRows.slice(1);

  console.log(`Raw Data Rows (excluding header): ${dataRows.length}`);

  const parseDate = (dStr) => {
    if (!dStr) return null;
    const trimmed = typeof dStr === 'string' ? dStr.trim() : dStr;
    let result = null;
    
    if (typeof trimmed === 'string' && trimmed.includes('T') && trimmed.includes('Z')) {
        try {
            const date = new Date(trimmed);
            if (!isNaN(date.getTime())) {
                const localDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
                result = localDate.toISOString().split('T')[0];
            }
        } catch (e) {}
    }
    if (!result) {
        const dmyMatch = String(trimmed).match(/^(\d{1,2})\s*[\s\-\.\/]\s*(\d{1,2})\s*[\s\-\.\/]\s*(\d{2,4})/);
        if (dmyMatch) {
            let [_, d, m, y] = dmyMatch;
            if (y.length === 2) y = '20' + y;
            result = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
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
    if (result) {
        const yearNum = parseInt(result.split('-')[0]);
        if (yearNum < 2020 || yearNum > 2100) return null;
    }
    return result;
  };

  const processedRows = [];
  const skippedRows = [];

  dataRows.forEach((rawRow, index) => {
    const rowObj = {};
    headers.forEach((h, i) => { if (h) rowObj[h.trim()] = rawRow[i]; });

    const rawDate = rowObj["Date"] || "";
    const parsedDate = parseDate(rawDate);
    
    if (!parsedDate || parsedDate.toLowerCase().includes('date')) {
        skippedRows.push({ sheetRow: index + 2, reason: 'Invalid/Empty Date', raw: rawRow });
        return;
    }

    const hasData = Object.keys(rowObj).some(key => {
        if (key.toLowerCase() === 'date') return false;
        const val = rowObj[key];
        return val !== undefined && val !== null && val !== "";
    });

    if (!hasData) {
        skippedRows.push({ sheetRow: index + 2, reason: 'No Content Data', raw: rawRow });
        return;
    }

    rowObj._parsedDate = parsedDate;
    rowObj._sheetRow = index + 2;
    rowObj._index = index;
    processedRows.push(rowObj);
  });

  console.log(`Skipped Rows Count: ${skippedRows.length}`);
  skippedRows.forEach(s => {
    console.log(`SKIPPED: Row ${s.sheetRow} | ${s.reason} | Raw: ${JSON.stringify(s.raw)}`);
  });

  console.log(`Importable Rows Count: ${processedRows.length}`);

  // Find Gap
  processedRows.forEach((p) => {
    const match = crmData.find(c => {
        const dateMatch = c.date === p._parsedDate;
        // Match by Customer Name OR Chassis Number OR Delivery Index
        const customer = (p["Customer Name"] || "").trim().toLowerCase();
        const chassis = (p["Chassis Number"] || "").trim().toLowerCase();
        const crmName = c.delivery_name.toLowerCase();
        
        const nameMatch = customer && crmName.includes(customer);
        const chassisMatch = chassis && crmName.includes(chassis);
        const indexMatch = crmName.includes(`_${p._index}`);
        
        return dateMatch && (nameMatch || chassisMatch || indexMatch);
    });

    if (!match) {
        console.log(`GAP: Sheet Row ${p._sheetRow} not found in CRM. Date: ${p._parsedDate}, Customer: ${p["Customer Name"]}, Chassis: ${p["Chassis Number"]}`);
    }
  });
}

runAudit();
