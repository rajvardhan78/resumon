// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score) {
  if (score >= 80) return '#22c55e';
  if (score >= 65) return '#3b82f6';
  if (score >= 45) return '#f59e0b';
  return '#ef4444';
}

function scoreLabel(score) {
  if (score >= 80) return 'Excellent';
  if (score >= 65) return 'Good';
  if (score >= 45) return 'Average';
  return 'Needs Work';
}

function formatDate(dateVal) {
  const d = new Date(dateVal);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(dateVal) {
  const d = new Date(dateVal);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}


// ── Mini bar ──────────────────────────────────────────────────────────────────
function MiniBar({ score, color }) {
  return (
    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  );
}

// ── Single history card ───────────────────────────────────────────────────────
function HistoryCard({ scan, index }) {
  const color   = scoreColor(scan.overall);
  const label   = scoreLabel(scan.overall);

  const dims = [
    { key: 'keywords',   label: 'KW',   score: scan.keywords,   color: '#a855f7' },
    { key: 'experience', label: 'EXP',  score: scan.experience, color: '#3b82f6' },
    { key: 'knowledge',  label: 'DEP',  score: scan.knowledge,  color: '#f59e0b' },
    { key: 'creativity', label: 'CRE',  score: scan.creativity, color: '#22c55e' },
  ];

  return (
    <motion.div
      className="w-full p-5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/8 hover:border-white/20 transition-all duration-200 group"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">

        {/* ── Overall score ring ── */}
        <div className="flex items-center gap-4 shrink-0">
          {/* Score circle */}
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 border-2 font-bold text-lg"
            style={{ borderColor: color, color, backgroundColor: `${color}15` }}
          >
            {scan.overall}
          </div>

          {/* File + date */}
          <div className="min-w-0">
            <p className="font-semibold text-sm text-text truncate max-w-[180px]">
              {scan.fileName}
            </p>
            <p className="text-xs text-text/40 mt-0.5">
              {formatDate(scan.scannedAt)} · {formatTime(scan.scannedAt)}
            </p>
            <span
              className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border"
              style={{ color, borderColor: `${color}40`, backgroundColor: `${color}12` }}
            >
              {label}
            </span>
          </div>
        </div>

        {/* ── Dimension mini-bars ── */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
          {dims.map((d) => (
            <div key={d.key} className="flex items-center gap-2">
              <span className="text-[10px] text-text/40 w-7 shrink-0">{d.label}</span>
              <MiniBar score={d.score} color={d.color} />
              <span className="text-[11px] font-semibold w-6 text-right" style={{ color: d.color }}>
                {d.score}
              </span>
            </div>
          ))}
        </div>

        {/* ── Source badge ── */}
        <div className="shrink-0 flex sm:flex-col items-center sm:items-end gap-2">
          {scan.source === 'gemini' ? (
            <span className="text-[10px] text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-full">
              ✨ Gemini
            </span>
          ) : (
            <span className="text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
              ⚙️ Local
            </span>
          )}
        </div>

      </div>
    </motion.div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onGoHome }) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-[55vh] text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-5">
        <svg className="w-10 h-10 text-text/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold mb-2">No scans yet</h2>
      <p className="text-text/50 text-sm max-w-xs mb-6">
        Your scan history will appear here after your first resume analysis.
      </p>
      <motion.button
        onClick={onGoHome}
        className="px-5 py-2.5 bg-success hover:bg-success/90 text-primary font-semibold rounded-xl shadow-lg shadow-success/20 text-sm"
        whileHover={{ scale: 1.04, y: -2 }}
        whileTap={{ scale: 0.96 }}
      >
        Scan your first resume →
      </motion.button>
    </motion.div>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="w-full p-5 bg-white/5 border border-white/10 rounded-xl animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-white/10 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-white/10 rounded w-40" />
          <div className="h-2.5 bg-white/10 rounded w-24" />
        </div>
        <div className="hidden sm:flex flex-1 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="flex-1 h-1.5 bg-white/10 rounded-full" />)}
        </div>
      </div>
    </div>
  );
}

// ── Main History Page ─────────────────────────────────────────────────────────
export default function History() {
  const { user } = useUser();
  const navigate  = useNavigate();
  const [scans, setScans]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/history?userId=${user.id}&limit=30`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setScans(data.scans);
        else setError(data.error || 'Failed to load history');
        setLoading(false);
      })
      .catch(() => {
        setError('Could not connect to server');
        setLoading(false);
      });
  }, [user?.id]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-12 space-y-6">

      {/* ── Header ── */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-3xl font-bold bg-linear-to-r from-text via-success to-text bg-clip-text text-transparent">
            Scan History
          </h1>
          <p className="text-text/50 text-sm mt-1">
            {loading ? 'Loading...' : `${scans.length} scan${scans.length !== 1 ? 's' : ''} on record`}
          </p>
        </div>
        <motion.button
          onClick={() => navigate('/')}
          className="self-start sm:self-auto px-4 py-2 bg-success hover:bg-success/90 text-primary text-sm font-semibold rounded-xl shadow-lg shadow-success/20 transition-all"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          + New Scan
        </motion.button>
      </motion.div>

      {/* ── Legend ── */}
      {!loading && scans.length > 0 && (
        <motion.div
          className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-text/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <span><span className="font-semibold text-[#a855f7]">KW</span> = Keywords</span>
          <span><span className="font-semibold text-[#3b82f6]">EXP</span> = Experience</span>
          <span><span className="font-semibold text-[#f59e0b]">DEP</span> = Knowledge Depth</span>
          <span><span className="font-semibold text-[#22c55e]">CRE</span> = Creativity</span>
        </motion.div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <motion.div
          className="p-5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          ⚠️ {error}
        </motion.div>
      ) : scans.length === 0 ? (
        <EmptyState onGoHome={() => navigate('/')} />
      ) : (
        <AnimatePresence>
          <div className="space-y-3">
            {scans.map((scan, i) => (
              <HistoryCard key={scan.id} scan={scan} index={i} />
            ))}
          </div>
        </AnimatePresence>
      )}

    </div>
  );
}

