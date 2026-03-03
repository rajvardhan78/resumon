// api/db.js — MongoDB client + helpers
// Uses MongoDB Atlas free tier (works perfectly on Vercel serverless).
//
// Required env vars:
//   MONGODB_URI  — e.g. mongodb+srv://user:pass@cluster.mongodb.net/resumon?retryWrites=true&w=majority
//
// For local dev add MONGODB_URI to .env.local
// For production add it in Vercel Dashboard → Settings → Environment Variables

import dns from 'dns';
import { MongoClient, ServerApiVersion } from 'mongodb';

// Local ISPs often block SRV record lookups which mongodb+srv:// needs.
// This forces Node's DNS resolver to use Google DNS — safe in all environments.
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const URI = process.env.MONGODB_URI;

// Singleton client — reused across serverless invocations (warm starts)
let _clientPromise = null;

function getClient() {
  if (_clientPromise) return _clientPromise;
  if (!URI) throw new Error('MONGODB_URI is not set in environment variables');

  const client = new MongoClient(URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    connectTimeoutMS: 30000,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 30000,
  });

  _clientPromise = client.connect().then(() => client);
  return _clientPromise;
}

async function getDb() {
  const client = await getClient();
  return client.db('resumon');
}

// ── insertScan ────────────────────────────────────────────────────────────────
export async function insertScan({ userId, fileName, scannedAt, analysis }) {
  if (!userId) {
    console.warn('insertScan: no userId provided — skipping DB write');
    return;
  }

  const db = await getDb();
  const { overallScore, scores, _source } = analysis;

  const doc = {
    userId,
    fileName,
    scannedAt:  new Date(scannedAt),
    overall:    Number(overallScore)                     || 0,
    keywords:   Number(scores?.keywords?.score)          || 0,
    experience: Number(scores?.experience?.score)        || 0,
    knowledge:  Number(scores?.knowledgeDepth?.score)    || 0,
    creativity: Number(scores?.creativity?.score)        || 0,
    source:     _source ?? 'local',
    createdAt:  new Date(),
  };

  const result = await db.collection('scans').insertOne(doc);
  return result;
}

// ── getUserStats ──────────────────────────────────────────────────────────────
export async function getUserStats(userId) {
  if (!userId) return { totalScans: 0, averageScore: 0, bestScore: 0, lastScannedAt: null };

  const db = await getDb();

  const [agg] = await db.collection('scans').aggregate([
    { $match: { userId } },
    {
      $group: {
        _id:          null,
        totalScans:   { $sum: 1 },
        averageScore: { $avg: '$overall' },
        bestScore:    { $max: '$overall' },
        lastScannedAt:{ $max: '$scannedAt' },
      },
    },
  ]).toArray();

  if (!agg) {
    return { totalScans: 0, averageScore: 0, bestScore: 0, lastScannedAt: null };
  }


  return {
    totalScans:    agg.totalScans,
    averageScore:  Math.round(agg.averageScore),
    bestScore:     agg.bestScore,
    lastScannedAt: agg.lastScannedAt,
  };
}

// ── getRecentScans ────────────────────────────────────────────────────────────
export async function getRecentScans(userId, limit = 10) {
  if (!userId) return [];

  const db = await getDb();

  const docs = await db.collection('scans')
    .find({ userId })
    .sort({ scannedAt: -1 })
    .limit(limit)
    .toArray();

  return docs.map((d) => ({
    id:         d._id.toString(),
    fileName:   d.fileName,
    scannedAt:  d.scannedAt,
    overall:    d.overall,
    keywords:   d.keywords,
    experience: d.experience,
    knowledge:  d.knowledge,
    creativity: d.creativity,
    source:     d.source,
  }));
}
