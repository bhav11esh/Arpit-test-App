import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // 1. Enable CORS for CRM dev server
    res.setHeader('Access-Control-Allow-Origin', '*'); // For development, allow all. Could be http://localhost:5173
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { path, method, body } = req.body;

    if (!path || !method) {
        return res.status(400).json({ error: 'Missing path or method' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
        console.error('[AdminAuthAPI] ERROR: Missing Supabase environment variables');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        console.log(`[AdminAuthAPI] Proxying ${method} to ${path}`);

        const response = await fetch(`${supabaseUrl}/auth/v1/admin${path}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${serviceKey}`
            },
            body: body ? JSON.stringify(body) : undefined
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            console.warn(`[AdminAuthAPI] Admin API Error (${response.status}):`, data);
            return res.status(response.status).json(data);
        }

        return res.status(200).json(data);
    } catch (error) {
        console.error('[AdminAuthAPI] Proxy Fatal Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
