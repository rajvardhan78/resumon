// api/history.js — GET /api/history?userId=<id>&limit=<n>
// Returns the most recent scans for a user from MongoDB.

import { getRecentScans } from './db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')     return res.status(405).json({ error: 'Method not allowed' });

  const { userId, limit } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    const scans = await getRecentScans(userId, limit ? parseInt(limit) : 20);
    return res.status(200).json({ success: true, scans });
  } catch (err) {
    console.error('Error in /api/history:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

