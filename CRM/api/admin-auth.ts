import { createClient } from '@supabase/supabase-js';

/**
 * 🔒 VERCEL SERVERLESS FUNCTION: /api/admin-auth
 * 
 * This function acts as a secure proxy for Supabase Admin Auth operations
 * in production. It replaces the Vite dev proxy and handles requests 
 * requiring the Service Role key.
 */
export default async function handler(req: any, res: any) {
  console.log(`[AdminAuth] ${req.method} ${req.url}`);

  // 1. Health check / Ping
  if (req.method === 'GET' && req.url.includes('/ping')) {
    return res.status(200).json({ 
      status: 'alive', 
      time: new Date().toISOString(),
      info: 'Vercel Admin Auth Proxy (Production)'
    });
  }

  // 2. Pre-flight CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // 3. Only allow POST for actual admin actions
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Vercel handles env variables via process.env
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Supabase configuration missing in environment variables');
    }

    // 4. Extract command from request body
    const { path: authPath, method: authMethod, body: authBody } = req.body;
    
    if (!authPath) throw new Error('Missing "path" in request body');

    console.log(`[AdminAuth] ACTION: Forwarding to Supabase Admin -> ${authMethod} ${authPath}`);

    // 5. Forward to Supabase Admin API
    const response = await fetch(`${supabaseUrl}/auth/v1/admin${authPath}`, {
      method: authMethod || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey || '',
        'Authorization': `Bearer ${serviceKey}`
      },
      body: authBody ? JSON.stringify(authBody) : undefined
    });

    const resData = await response.json().catch(() => ({}));
    
    // 6. Return response to frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(response.status).json(resData);

  } catch (err: any) {
    console.error('[AdminAuth] FATAL ERROR:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
