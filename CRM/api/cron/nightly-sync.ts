import { createClient } from '@supabase/supabase-js';

/**
 * 🚀 VERCEL SERVERLESS CRON: /api/cron/nightly-sync
 * 
 * Scheduled to run daily between 12:00 AM and 4:00 AM IST (configured at 2:00 AM IST / 20:30 UTC).
 * High-Scale Architecture: Uses Chunked Parallel Processing (Pool size = 15) to process
 * 300+ active dealerships in ~20 seconds without hitting serverless HTTP timeouts.
 */

function getShowroomCode(dealershipName: string): string {
  if (!dealershipName) return 'UNKNOWN';
  const matches = dealershipName.match(/\(([^)]+)\)/);
  if (matches && matches[1]) return matches[1].toUpperCase();
  return dealershipName.toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function formatDateForSheet(dateStr: string): string {
  if (!dateStr || !dateStr.includes('-')) return dateStr;
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function getDeliverySignature(delivery: any, photographerName: string = ''): string {
  const parts = [
    formatDateForSheet(delivery.date || '').trim(),
    String(delivery.footage_link || '').trim(),
    String(delivery.reel_link || '').trim(),
    String(photographerName).trim(),
    String(delivery.received_amount || '').trim(),
    String(delivery.customer_phone || '').trim(),
    String(delivery.rapido_charge || '').trim()
  ];
  return parts.join('|').toLowerCase();
}

async function processSingleDealership(
  dealer: any,
  supabase: any,
  fallbackSyncUrl: string | undefined,
  userMap: Map<string, string>
) {
  const sheetId = dealer.google_sheet_id || dealer.googleSheetId;
  const syncUrl = dealer.google_sync_url || dealer.googleSyncUrl || fallbackSyncUrl;

  if (!syncUrl) {
    return {
      dealership: dealer.name,
      status: 'skipped',
      reason: 'No Google Sync URL configured'
    };
  }

  const targetCode = getShowroomCode(dealer.name);

  // Query DONE deliveries for this dealership
  const { data: rawDeliveries, error: delErr } = await supabase
    .from('deliveries')
    .select('*')
    .eq('showroom_code', targetCode)
    .eq('status', 'DONE')
    .is('deleted_at', null);

  if (delErr) {
    console.error(`[NightlyCronSync] Error fetching deliveries for ${dealer.name}:`, delErr.message);
    return {
      dealership: dealer.name,
      status: 'error',
      error: delErr.message
    };
  }

  if (!rawDeliveries || rawDeliveries.length === 0) {
    return {
      dealership: dealer.name,
      status: 'success',
      deliveriesCount: 0,
      message: 'No deliveries to sync'
    };
  }

  // Format deliveries payload
  const formattedDeliveries = rawDeliveries.map((d: any) => {
    const photographerName = d.assigned_user_id ? (userMap.get(d.assigned_user_id) || '') : '';
    const signature = getDeliverySignature(d, photographerName);

    return {
      id: d.id,
      date: d.date,
      showroom_code: d.showroom_code,
      cluster_code: d.cluster_code,
      delivery_name: d.delivery_name,
      footage_link: d.footage_link || '',
      reel_link: d.reel_link || '',
      photographer_name: photographerName,
      received_amount: d.received_amount != null ? d.received_amount : '',
      customer_phone: d.customer_phone || '',
      rapido_charge: d.rapido_charge != null ? d.rapido_charge : '',
      creation_index: d.creation_index || 1,
      signature: signature,
      updated_at: d.updated_at || new Date().toISOString()
    };
  });

  console.log(`[NightlyCronSync] Syncing ${dealer.name} (${formattedDeliveries.length} rows)`);

  const payload = {
    action: 'sync_bulk',
    sheetId: sheetId,
    deliveries: formattedDeliveries
  };

  try {
    const response = await fetch(syncUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const resData = await response.json().catch(() => ({}));

    return {
      dealership: dealer.name,
      status: response.ok ? 'success' : 'failed',
      statusCode: response.status,
      deliveriesCount: formattedDeliveries.length,
      result: resData
    };
  } catch (postErr: any) {
    console.error(`[NightlyCronSync] Network error syncing ${dealer.name}:`, postErr.message);
    return {
      dealership: dealer.name,
      status: 'error',
      error: postErr.message
    };
  }
}

export default async function handler(req: any, res: any) {
  console.log(`[NightlyCronSync] ${req.method} ${req.url}`);

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && req.query?.secret !== cronSecret) {
    console.warn('[NightlyCronSync] Unauthorized cron invocation attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const fallbackSyncUrl = process.env.VITE_GOOGLE_SYNC_URL;

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Supabase credentials missing in environment variables');
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Fetch active dealerships
    const { data: rawDealerships, error: dealerErr } = await supabase
      .from('dealerships')
      .select('*');

    if (dealerErr) throw dealerErr;

    const activeDealerships = (rawDealerships || []).filter((d: any) => {
      const isActive = d.active !== false;
      const sheetId = d.google_sheet_id || d.googleSheetId;
      return isActive && sheetId;
    });

    console.log(`[NightlyCronSync] Found ${activeDealerships.length} active dealerships`);

    // 2. Fetch users lookup map
    const { data: usersData } = await supabase.from('users').select('id, name');
    const userMap = new Map<string, string>();
    (usersData || []).forEach((u: any) => userMap.set(u.id, u.name));

    const syncResults: any[] = [];

    // 3. High-Scale Chunked Parallel Processing (Pool Size = 15)
    // 300 dealerships / 15 parallel requests per pool = 20 total pools (~20 seconds total execution)
    const CHUNK_SIZE = 15;
    for (let i = 0; i < activeDealerships.length; i += CHUNK_SIZE) {
      const chunk = activeDealerships.slice(i, i + CHUNK_SIZE);
      const chunkResults = await Promise.all(
        chunk.map(dealer => processSingleDealership(dealer, supabase, fallbackSyncUrl, userMap))
      );
      syncResults.push(...chunkResults);
    }

    return res.status(200).json({
      status: 'success',
      timestamp: new Date().toISOString(),
      activeDealershipsCount: activeDealerships.length,
      results: syncResults
    });

  } catch (err: any) {
    console.error('[NightlyCronSync] Fatal Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
