import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateAudit() {
  // 1. Fetch Users (Photographers) for name mapping
  const { data: users, error: uError } = await supabase
    .from('users')
    .select('id, name');

  if (uError) {
    console.error('Error fetching users:', uError);
    return;
  }

  const photogMap = {};
  users.forEach(u => photogMap[u.id] = u.name);

  // 2. Read Akshaya Data
  const rawData = JSON.parse(fs.readFileSync('akshaya_data.json', 'utf8'));

  // 3. Create Audit Log
  const auditLog = rawData.map(d => {
    // Extract index from "Delivery_YYYY-MM-DD_INDEX"
    const match = d.delivery_name.match(/_(\d+)$/);
    const rowIdx = match ? parseInt(match[1]) + 2 : '???';

    return {
      "Sheet Row": rowIdx,
      "Date": d.date,
      "Photographer": photogMap[d.assigned_user_id] || 'UNASSIGNED',
      "Footage Link": d.footage_link || 'MISSING',
      "Reel Link": d.reel_link || 'MISSING',
      "CRM ID": d.id,
      "Delivery Name": d.delivery_name
    };
  }).sort((a, b) => {
    if (a["Sheet Row"] !== '???' && b["Sheet Row"] !== '???') {
      return a["Sheet Row"] - b["Sheet Row"];
    }
    return a.Date.localeCompare(b.Date);
  });

  fs.writeFileSync('akshaya_audit_log.json', JSON.stringify(auditLog, null, 2));
  
  // Create a structured text audit for the user
  let txt = "AKSHAYA MERCEDES - 100% COMPLETE DATA AUDIT REPORT\n";
  txt += "Generated on: " + new Date().toLocaleString() + "\n";
  txt += "Total Rows Audited: " + auditLog.length + "\n";
  txt += "====================================================\n\n";

  auditLog.forEach(row => {
    txt += `[SHEET ROW ${row["Sheet Row"]}]\n`;
    txt += `  Date:         ${row.Date}\n`;
    txt += `  Photog:       ${row.Photographer}\n`;
    txt += `  Footage Link: ${row["Footage Link"]}\n`;
    txt += `  Reel Link:    ${row["Reel Link"]}\n`;
    txt += `  CRM Record:   ${row["Delivery Name"]} (${row["CRM ID"]})\n`;
    txt += "----------------------------------------------------\n";
  });
  
  fs.writeFileSync('akshaya_full_audit_report.txt', txt);
  console.log('Audit reports generated: akshaya_audit_log.json, akshaya_full_audit_report.txt');
}

generateAudit();
