// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// ── Mini circular score ring ──────────────────────────────────────────────────
function ScoreRing({ score, color, size = 80, stroke = 7 }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const center = size / 2;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="-rotate-90 absolute inset-0" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={center} cy={center} r={r} fill="none" stroke="currentColor" className="text-white/10" strokeWidth={stroke} />
        <circle
          cx={center} cy={center} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-1000"
        />
      </svg>
      <span className="text-lg font-bold relative">{score}</span>
    </div>
  );
}

// ── Horizontal bar for a dimension ───────────────────────────────────────────
function DimensionBar({ label, score, color, icon, delay = 0 }) {
  return (
    <motion.div
      className="flex items-center gap-3"
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
    >
      <span className="text-lg w-6 text-center">{icon}</span>
      <span className="text-sm text-text/70 w-32 shrink-0">{label}</span>
      <div className="flex-1 h-2.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, delay: delay + 0.2, ease: 'easeOut' }}
        />
      </div>
      <span className="text-sm font-semibold w-10 text-right" style={{ color }}>{score}</span>
    </motion.div>
  );
}

// ── Highlight chip ────────────────────────────────────────────────────────────
function Chip({ text, color }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border"
      style={{ color, borderColor: `${color}40`, backgroundColor: `${color}12` }}
    >
      {text}
    </span>
  );
}

// ── Score label helper ────────────────────────────────────────────────────────
function scoreLabel(score) {
  if (score >= 80) return { label: 'Excellent', color: '#22c55e' };
  if (score >= 65) return { label: 'Good', color: '#3b82f6' };
  if (score >= 45) return { label: 'Average', color: '#f59e0b' };
  return { label: 'Needs Work', color: '#ef4444' };
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onGoHome }) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
        <svg className="w-12 h-12 text-text/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold mb-2">No scan yet</h2>
      <p className="text-text/50 max-w-sm mb-8">
        Your most recent resume analysis will appear here automatically after your first scan.
      </p>
      <motion.button
        onClick={onGoHome}
        className="px-6 py-3 bg-success hover:bg-success/90 text-primary font-semibold rounded-xl shadow-lg shadow-success/20 transition-all"
        whileHover={{ scale: 1.04, y: -2 }}
        whileTap={{ scale: 0.96 }}
      >
        Scan your resume →
      </motion.button>
    </motion.div>
  );
}

// ── Main Analytics Page ────────────────────────────────────────────────────────
const DIMENSIONS = [
  { key: 'keywords',      label: 'Keywords',        icon: '🏷️', color: '#a855f7' },
  { key: 'experience',    label: 'Experience',       icon: '⚡', color: '#3b82f6' },
  { key: 'knowledgeDepth',label: 'Knowledge Depth',  icon: '💡', color: '#f59e0b' },
  { key: 'creativity',    label: 'Creativity',       icon: '⭐', color: '#22c55e' },
];

export default function Analytics() {
  const navigate = useNavigate();

  // Load latest scan from localStorage
  const raw = localStorage.getItem('resumon_latest_scan');
  const latest = raw ? JSON.parse(raw) : null;

  if (!latest) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-12">
        <EmptyState onGoHome={() => navigate('/')} />
      </div>
    );
  }

  const { analysis, fileName, scannedAt } = latest;
  const { overallScore, scores, summary, topStrengths, improvements, _source } = analysis;
  const usedFallback = _source === 'local';
  const { label: overallLabel, color: overallColor } = scoreLabel(overallScore);

  const scannedDate = new Date(scannedAt);
  const dateStr = scannedDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = scannedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

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
            Analytics
          </h1>
          <p className="text-text/50 text-sm mt-1">Latest resume scan breakdown</p>
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

      {/* ── Scan meta banner ── */}
      <motion.div
        className="flex flex-wrap items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl text-sm text-text/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
      >
        <span className="flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-text/80 font-medium">{fileName}</span>
        </span>
        <span className="text-text/30">·</span>
        <span>{dateStr} at {timeStr}</span>
        <span className="text-text/30">·</span>
        {usedFallback ? (
          <span className="flex items-center gap-1 text-amber-400">⚙️ Local engine</span>
        ) : (
          <span className="flex items-center gap-1 text-success">✨ Gemini AI</span>
        )}
      </motion.div>

      {/* ── Top row: Overall score + dimension bars ── */}
      <div className="grid md:grid-cols-5 gap-6">

        {/* Overall score card */}
        <motion.div
          className="md:col-span-2 p-6 bg-white/5 border border-white/10 rounded-xl flex flex-col items-center justify-center text-center gap-3"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-xs uppercase tracking-widest text-text/40">Overall Score</p>
          <ScoreRing score={overallScore} color={overallColor} size={100} stroke={8} />
          <span className="text-sm font-semibold px-3 py-1 rounded-full border"
            style={{ color: overallColor, borderColor: `${overallColor}40`, backgroundColor: `${overallColor}15` }}>
            {overallLabel}
          </span>
          <p className="text-text/55 text-xs leading-relaxed">{summary}</p>
        </motion.div>

        {/* Dimension bars */}
        <motion.div
          className="md:col-span-3 p-6 bg-white/5 border border-white/10 rounded-xl flex flex-col justify-center gap-4"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
        >
          <p className="text-xs uppercase tracking-widest text-text/40 mb-1">Score Breakdown</p>
          {DIMENSIONS.map((d, i) => (
            <DimensionBar
              key={d.key}
              label={d.label}
              score={scores[d.key]?.score ?? 0}
              color={d.color}
              icon={d.icon}
              delay={0.2 + i * 0.08}
            />
          ))}
        </motion.div>
      </div>

      {/* ── Dimension detail cards ── */}
      <div className="grid sm:grid-cols-2 gap-5">
        {DIMENSIONS.map((d, i) => {
          const dim = scores[d.key] ?? {};
          const { label: dimLabel } = scoreLabel(dim.score ?? 0);
          return (
            <motion.div
              key={d.key}
              className="p-5 bg-white/5 border border-white/10 rounded-xl space-y-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.08 }}
            >
              {/* Card header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{d.icon}</span>
                  <span className="font-semibold text-sm">{d.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text/40">{dimLabel}</span>
                  <span className="text-lg font-bold" style={{ color: d.color }}>{dim.score ?? 0}</span>
                </div>
              </div>

              {/* Feedback */}
              <p className="text-xs text-text/60 leading-relaxed">{dim.feedback}</p>

              {/* Highlights as chips */}
              {dim.highlights && dim.highlights.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {dim.highlights.map((h, j) => (
                    <Chip key={j} text={h} color={d.color} />
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* ── Strengths & Improvements ── */}
      <div className="grid sm:grid-cols-2 gap-5">
        <motion.div
          className="p-5 bg-success/10 border border-success/20 rounded-xl"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="text-success font-semibold mb-3 flex items-center gap-2">
            <span>✅</span> Top Strengths
          </h3>
          <ul className="space-y-2">
            {topStrengths?.map((s, i) => (
              <li key={i} className="text-sm text-text/75 flex items-start gap-2">
                <span className="text-success mt-0.5 shrink-0">•</span>{s}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-xl"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="text-amber-400 font-semibold mb-3 flex items-center gap-2">
            <span>🔧</span> Improvements
          </h3>
          <ul className="space-y-2">
            {improvements?.map((s, i) => (
              <li key={i} className="text-sm text-text/75 flex items-start gap-2">
                <span className="text-amber-400 mt-0.5 shrink-0">•</span>{s}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>

      {/* ── View full results button ── */}
      <motion.div
        className="flex justify-center pt-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <button
          onClick={() => navigate('/results', { state: { analysis } })}
          className="px-6 py-3 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl text-sm font-medium transition-all duration-200"
        >
          View Full Results Page →
        </button>
      </motion.div>

    </div>
  );
}

