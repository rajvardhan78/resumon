import { useEffect, useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { useUser } from '@clerk/clerk-react';

function Profile() {
  const { user } = useUser();
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const joinedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Unknown';

  const name  = user?.fullName || user?.firstName || 'User';
  const email = user?.emailAddresses?.[0]?.emailAddress || '';

  // Fetch real stats from the DB via /api/stats
  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/stats?userId=${user.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setStats(data.stats);
        setLoadingStats(false);
      })
      .catch(() => setLoadingStats(false));
  }, [user?.id]);

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
    </div>
  );
}

export default Profile;

