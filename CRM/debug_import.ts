
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function debug() {
  console.log('--- Debugging Nandi Toyota Import ---');
  
  const SYNC_URL = process.env.VITE_GOOGLE_SYNC_URL;
  if (!SYNC_URL) {
      console.error('VITE_GOOGLE_SYNC_URL missing');
      return;
  }

  // 1. Check Photographers
  const { data: photographers } = await supabase.from('photographers').select('id, name, email');
  console.log('Photographers in CRM:', photographers?.map(p => p.name));
  
  // 2. Check Nandi Toyota Dealership
  const { data: dealers } = await supabase.from('dealerships').select('*');
  console.log('All Dealerships:', dealers?.map(d => ({name: d.name, id: d.google_sheet_id})));
  
  const dealer = dealers?.find(d => d.name.toLowerCase().includes('nandi'));
  if (!dealer) {
      console.error('Nandi Dealership not found');
      return;
  }
  console.log('Dealer found:', dealer.name, 'Sheet ID:', dealer.google_sheet_id);

  const sheetId = dealer.google_sheet_id;
  if (!sheetId) {
      console.error('Google Sheet ID missing for dealer');
      return;
  }

  // 3. Simulation of mapping logic
  const getShowroomCode = (name: string) => {
    const matches = name.match(/\(([^)]+)\)/);
    return matches ? matches[1].toUpperCase() : name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  };
  const showroomCode = getShowroomCode(dealer.name);

  const parseDate = (dStr: any) => {
    if (!dStr || typeof dStr !== 'string') return dStr;
    const trimmed = dStr.trim();
    const dmyMatch = trimmed.match(/^(\d{1,2})[\s\-\/](\d{1,2})[\s\-\/](\d{4})/);
    if (dmyMatch) {
      const [_, d, m, y] = dmyMatch;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return trimmed;
  };

  console.log('\n--- Fetching from Google Script ---');
  try {
      const response = await fetch(SYNC_URL, {
          method: 'POST',
          body: JSON.stringify({
              action: 'read',
              sheetId: sheetId
          })
      });
      console.log('Response Status:', response.status);
      const outputText = await response.text();
      
      const result: any = JSON.parse(outputText);
      if (result.status !== 'success' || !Array.isArray(result.data)) {
          console.error('Fetch failed:', result.message);
          return;
      }
      
      fs.writeFileSync('nandi_sheet_data.json', JSON.stringify(result.data, null, 2));
      const rows = result.data;
      console.log(`Fetched ${rows.length} total rows from API`);
      
      const mapped = rows.map((row: any, index: number) => {
        return {
          row_index: index,
          original_date: row["Date"] || row["date"],
          parsed_date: parseDate(row["Date"] || row["date"]),
        };
      });

      console.log(`Total valid dates: ${mapped.filter(m => m.original_date && m.original_date.toString().toLowerCase() !== 'date').length}`);

      console.log('Last 5 rows from API:');
      console.log(JSON.stringify(rows.slice(-5), null, 2));

  } catch (err) {
      console.error('Fetch error:', err);
  }
}

debug();
