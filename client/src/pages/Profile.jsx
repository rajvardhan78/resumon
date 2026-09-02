import { useEffect, useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../auth/AuthContext';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';

// ── Delete confirmation modal ─────────────────────────────────────────────────
function DeleteAccountModal({ onClose, onDeleted }) {
  const [step, setStep] = useState(1); // 1 = warning, 2 = confirm
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  const canProceed = confirmText === 'DELETE';
  const canDelete = password.length > 0;

  const handleDelete = async () => {
    setPending(true);
    setError(null);

    try {
      await api.deleteAccount(password);
      onDeleted();
    } catch (failure) {
      setError(failure.message || 'Failed to delete account.');
    } finally {
      setPending(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <motion.div
        className="relative w-full max-w-md bg-[#1a1a2e] border border-red-500/30 rounded-2xl shadow-2xl p-6 sm:p-8"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-text/40 hover:text-text/80 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {step === 1 ? (
          <>
            {/* Warning step */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-400">Delete Account</h3>
                <p className="text-xs text-text/50">This action cannot be undone</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-sm text-text/70">
                This will <span className="text-red-400 font-semibold">permanently delete</span> your account and all associated data:
              </p>
              <ul className="space-y-1.5 text-sm text-text/60">
                <li className="flex items-center gap-2">
                  <span className="text-red-400">×</span> Your profile and account information
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-400">×</span> All resume scan history and results
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-400">×</span> All analytics and statistics data
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-400">×</span> All active sessions on every device
                </li>
              </ul>
            </div>

            <div className="mb-5">
              <label htmlFor="confirm-delete" className="block text-sm font-medium text-text/70 mb-2">
                Type <span className="text-red-400 font-bold font-mono">DELETE</span> to confirm
              </label>
              <input
                id="confirm-delete"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE here"
                className="w-full py-2.5 px-4 rounded-xl bg-white/10 border border-white/20 text-text placeholder:text-text/30 focus:outline-none focus:ring-2 focus:ring-red-500/60 focus:border-red-500/60"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!canProceed}
                className="flex-1 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Password step */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-400">Verify Your Identity</h3>
                <p className="text-xs text-text/50">Enter your password to confirm</p>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400 flex items-start gap-2"
              >
                <span>⚠</span> {error}
              </motion.div>
            )}

            <div className="mb-5">
              <label htmlFor="delete-password" className="block text-sm font-medium text-text/70 mb-2">
                Password
              </label>
              <input
                id="delete-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="w-full py-2.5 px-4 rounded-xl bg-white/10 border border-white/20 text-text placeholder:text-text/30 focus:outline-none focus:ring-2 focus:ring-red-500/60 focus:border-red-500/60"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setStep(1); setError(null); }}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-sm font-medium transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canDelete || pending}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {pending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Deleting…
                  </>
                ) : (
                  'Delete My Account'
                )}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const joinedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Unknown';

  const name  = user?.fullName || 'User';
  const email = user?.email || '';

  // Fetch real stats from the DB via /api/stats
  useEffect(() => {
    let active = true;

    api.stats()
      .then((data) => {
        if (active) setStats(data.stats);
      })
      .catch(() => {
        // Leave the cards at their zero defaults; the page is still useful without them.
      })
      .finally(() => {
        if (active) setLoadingStats(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const totalScans   = stats?.totalScans   ?? 0;
  const averageScore = stats?.averageScore ?? 0;
  const bestScore    = stats?.bestScore    ?? 0;

  const statCards = [
    {
      label: 'Total Scans',
      value: loadingStats ? '—' : totalScans,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'from-blue-500 to-cyan-500',
    },
    {
      label: 'Average Score',
      value: loadingStats ? '—' : `${averageScore}`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'from-success to-emerald-500',
    },
    {
      label: 'Best Score',
      value: loadingStats ? '—' : `${bestScore}`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
      color: 'from-purple-500 to-pink-500',
    },
    {
      label: 'Member Since',
      value: joinedDate,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: 'from-amber-500 to-orange-500',
    },
  ];

  const handleAccountDeleted = async () => {
    await signOut();
    navigate('/sign-in', { replace: true });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-20 lg:py-16">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-12"
      >
        <h1 className="text-4xl font-bold mb-2 bg-linear-to-r from-text via-success to-text bg-clip-text text-transparent">
          Profile
        </h1>
        <p className="text-text/60">Your account and resume scan statistics</p>
      </motion.div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-8 mb-8"
      >
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-24 h-24 bg-linear-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shrink-0">
            <span className="text-4xl font-bold text-white">{name.charAt(0)}</span>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl font-bold mb-1">{name}</h2>
            <p className="text-text/60">{email}</p>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="grid sm:grid-cols-2 md:grid-cols-4 gap-5 mb-8"
      >
        {statCards.map((stat, index) => (
          <motion.div
            key={index}
            className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6"
            whileHover={{ scale: 1.02, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <div className={`w-12 h-12 bg-linear-to-br ${stat.color} rounded-lg flex items-center justify-center mb-4 opacity-80`}>
              {stat.icon}
            </div>
            <h3 className="text-text/60 text-sm mb-1">{stat.label}</h3>
            <p className="text-2xl font-bold">
              {loadingStats && stat.label !== 'Member Since' ? (
                <span className="inline-block w-10 h-7 bg-white/10 rounded animate-pulse" />
              ) : (
                stat.value
              )}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Danger Zone ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 sm:p-8"
      >
        <h3 className="text-lg font-bold text-red-400 mb-2 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          Danger Zone
        </h3>
        <p className="text-sm text-text/50 mb-5">
          Once you delete your account, there is no going back. All your data, scan history, and analytics will be permanently removed.
        </p>
        <motion.button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="px-5 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-sm font-semibold transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Delete My Account
        </motion.button>
      </motion.div>

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <DeleteAccountModal
            onClose={() => setShowDeleteModal(false)}
            onDeleted={handleAccountDeleted}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default Profile;
