// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';

function ScoreRing({ score, color }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="currentColor" className="text-white/10" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-1000"
        />
      </svg>
      <span className="text-xl font-bold">{score}</span>
    </div>
  );
}

function ScoreCard({ title, score, feedback, highlights, color, icon }) {
  return (
    <motion.div
      className="p-6 bg-white/5 backdrop-blur-md rounded-xl border border-white/10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-4 mb-4">
        <ScoreRing score={score} color={color} />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{icon}</span>
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>
          <p className="text-text/60 text-sm">{feedback}</p>
        </div>
      </div>
      {highlights && highlights.length > 0 && (
        <ul className="space-y-1 mt-3">
          {highlights.map((h, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-text/70">
              <span style={{ color }} className="mt-0.5">✓</span>
              <span>{h}</span>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const analysis = location.state?.analysis;

  if (!analysis) {
    navigate('/');
    return null;
  }

  const { overallScore, scores, summary, topStrengths, improvements, _source } = analysis;
  const usedFallback = _source === 'local';

  const cards = [
    {
      key: 'keywords',
      title: 'Keyword Matching',
      icon: '🏷️',
      color: '#a855f7',
    },
    {
      key: 'experience',
      title: 'Experience',
      icon: '⚡',
      color: '#3b82f6',
    },
    {
      key: 'knowledgeDepth',
      title: 'Knowledge Depth',
      icon: '💡',
      color: '#f59e0b',
    },
    {
      key: 'creativity',
      title: 'Creativity',
      icon: '⭐',
      color: '#22c55e',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-12">
      {/* Header */}
      <motion.div
        className="text-center mb-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-text via-success to-text bg-clip-text text-transparent">
          Resume Analysis
        </h1>
        <p className="text-text/60">Here's what our AI found</p>
        {usedFallback && (
          <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-medium">
            <span>⚙️</span> Analyzed with local engine — Gemini quota exceeded
          </div>
        )}
        {!usedFallback && (
          <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-success/10 border border-success/25 text-success text-xs font-medium">
            <span>✨</span> Powered by Gemini AI
          </div>
        )}
      </motion.div>

      {/* Overall Score */}
      <motion.div
        className="mb-8 p-8 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <p className="text-text/60 mb-2 uppercase tracking-widest text-sm">Overall Score</p>
        <div className="flex items-center justify-center gap-4">
          <span className="text-7xl font-bold text-success">{overallScore}</span>
          <span className="text-3xl text-text/40">/100</span>
        </div>
        <p className="text-text/70 mt-4 max-w-xl mx-auto text-sm leading-relaxed">{summary}</p>
      </motion.div>

      {/* Score Cards Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {cards.map((card, i) => (
          <motion.div key={card.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.1 }}>
            <ScoreCard
              title={card.title}
              icon={card.icon}
              color={card.color}
              score={scores[card.key]?.score ?? 0}
              feedback={scores[card.key]?.feedback ?? ''}
              highlights={scores[card.key]?.highlights ?? []}
            />
          </motion.div>
        ))}
      </div>

      {/* Strengths & Improvements */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <motion.div
          className="p-6 bg-success/10 rounded-xl border border-success/20"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="text-lg font-semibold text-success mb-4">✅ Top Strengths</h3>
          <ul className="space-y-2">
            {topStrengths?.map((s, i) => (
              <li key={i} className="text-sm text-text/80 flex items-start gap-2">
                <span className="text-success mt-0.5">•</span>{s}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          className="p-6 bg-amber-500/10 rounded-xl border border-amber-500/20"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="text-lg font-semibold text-amber-400 mb-4">🔧 Improvements</h3>
          <ul className="space-y-2">
            {improvements?.map((s, i) => (
              <li key={i} className="text-sm text-text/80 flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span>{s}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>

      {/* Back Button */}
      <motion.div
        className="flex justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-medium transition-all duration-200"
        >
          ← Analyze Another Resume
        </button>
      </motion.div>
    </div>
  );
}

export default Results;

