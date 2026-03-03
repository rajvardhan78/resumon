// api/stats.js — GET /api/stats?userId=<clerk_user_id>
// Returns aggregated scan stats for the given user.

import { getUserStats } from './db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')     return res.status(405).json({ error: 'Method not allowed' });

  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const stats = await getUserStats(userId);
    return res.status(200).json({ success: true, stats });
  } catch (err) {
    console.error('Error in /api/stats:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

