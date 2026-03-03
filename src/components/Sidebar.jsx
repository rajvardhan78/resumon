import { useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { useAuth, useUser, SignOutButton } from '@clerk/clerk-react';

const Sidebar = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const getTargetPath = (path) => (isSignedIn ? path : '/sign-in');

  const menuItems = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      label: 'Home',
      path: '/',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      label: 'Analytics',
      path: '/analytics',
    },
  ];

  const sidebarVariants = {
    collapsed: {
      width: '64px',
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      },
    },
    expanded: {
      width: '240px',
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      },
    },
  };

  const mobileMenuVariants = {
    closed: {
      x: '-100%',
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      },
    },
    open: {
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      },
    },
  };

  const labelVariants = {
    collapsed: {
      opacity: 0,
      x: -10,
      transition: {
        duration: 0.2,
      },
    },
    expanded: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.3,
        delay: 0.1,
      },
    },
  };

  return (
    <>
      {/* Hamburger Button - Mobile/Tablet Only */}
      <motion.button
        className="fixed top-4 left-4 z-50 lg:hidden w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg flex items-center justify-center text-text"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {isMobileOpen ? (
            <motion.svg
              key="close"
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </motion.svg>
          ) : (
            <motion.svg
              key="menu"
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            className="fixed inset-0 bg-primary/80 backdrop-blur-sm z-40 lg:hidden rounded-r-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Desktop Sidebar (lg and up) */}
      <motion.aside
        className="hidden lg:flex fixed left-0 top-0 h-screen bg-white/5 backdrop-blur-md border-r border-white/10 z-50 flex-col py-6 rounded-r-2xl"
        variants={sidebarVariants}
        initial="collapsed"
        animate={isHovered ? 'expanded' : 'collapsed'}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Logo Section */}
        <div className="mb-8 flex items-center min-h-[32px] mx-2">
          <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-success to-emerald-400 rounded-lg flex items-center justify-center">
              <span className="text-primary font-bold text-lg">R</span>
            </div>
          </div>
          <motion.span
            variants={labelVariants}
            className="text-text font-semibold text-lg whitespace-nowrap overflow-hidden"
          >
            Resumon
          </motion.span>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 flex flex-col gap-2">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              to={getTargetPath(item.path)}
              className="block"
            >
              <motion.div
                className={`flex items-center rounded-lg mx-2 ${
                  location.pathname === item.path
                    ? 'bg-success/20 text-success'
                    : 'text-text/60 hover:bg-white/5 hover:text-text'
                }`}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">{item.icon}</div>
                <motion.span
                  variants={labelVariants}
                  className="whitespace-nowrap overflow-hidden text-sm font-medium pr-4"
                >
                  {item.label}
                </motion.span>
              </motion.div>
            </Link>
          ))}
        </nav>

        {/* User Section */}
        <div className="mt-auto mx-2 space-y-1">
          {isSignedIn ? (
            <>
              <Link to="/profile">
                <motion.div
                  className={`flex items-center rounded-lg w-full ${
                    location.pathname === '/profile'
                      ? 'bg-success/20 text-success'
                      : 'text-text/60 hover:bg-white/5 hover:text-text'
                  }`}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                      {user?.firstName?.charAt(0) || user?.emailAddresses?.[0]?.emailAddress?.charAt(0) || 'U'}
                    </div>
                  </div>
                  <motion.span
                    variants={labelVariants}
                    className="whitespace-nowrap overflow-hidden text-sm font-medium pr-4"
                  >
                    Profile
                  </motion.span>
                </motion.div>
              </Link>
              <SignOutButton redirectUrl="/sign-in">
                <motion.button
                  type="button"
                  className="flex items-center rounded-lg w-full text-text/60 hover:bg-red-500/10 hover:text-red-400"
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <motion.span
                    variants={labelVariants}
                    className="whitespace-nowrap overflow-hidden text-sm font-medium pr-4"
                  >
                    Logout
                  </motion.span>
                </motion.button>
              </SignOutButton>
            </>
          ) : (
            <Link to="/sign-in">
              <motion.div
                className="flex items-center rounded-lg w-full text-text/60 hover:bg-white/5 hover:text-text"
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                </div>
                <motion.span
                  variants={labelVariants}
                  className="whitespace-nowrap overflow-hidden text-sm font-medium pr-4"
                >
                  Login / Signup
                </motion.span>
              </motion.div>
            </Link>
          )}
        </div>
      </motion.aside>

      {/* Mobile/Tablet Sidebar */}
      <motion.aside
        className="lg:hidden fixed left-0 top-0 h-screen w-64 bg-white/5 backdrop-blur-md border-r border-white/10 z-50 flex flex-col py-6 rounded-r-2xl"
        variants={mobileMenuVariants}
        initial="closed"
        animate={isMobileOpen ? 'open' : 'closed'}
      >
        {/* Logo Section */}
        <div className="px-4 mb-8 flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-success to-emerald-400 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-bold text-lg">R</span>
          </div>
          <span className="text-text font-semibold text-lg whitespace-nowrap">
            Resumon
          </span>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 flex flex-col gap-2 px-3">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              to={getTargetPath(item.path)}
              onClick={() => setIsMobileOpen(false)}
            >
              <motion.div
                className={`flex items-center gap-3 px-3 py-3 rounded-lg ${
                  location.pathname === item.path
                    ? 'bg-success/20 text-success'
                    : 'text-text/60 hover:bg-white/5 hover:text-text'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                <div className="flex-shrink-0">{item.icon}</div>
                <span className="whitespace-nowrap text-sm font-medium">
                  {item.label}
                </span>
              </motion.div>
            </Link>
          ))}
        </nav>

        {/* User Section */}
        <div className="px-3 mt-auto space-y-1">
          {isSignedIn ? (
            <>
              <Link
                to="/profile"
                onClick={() => setIsMobileOpen(false)}
              >
                <motion.div
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg w-full ${
                    location.pathname === '/profile'
                      ? 'bg-success/20 text-success'
                      : 'text-text/60 hover:bg-white/5 hover:text-text'
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold">
                    {user?.firstName?.charAt(0) || user?.emailAddresses?.[0]?.emailAddress?.charAt(0) || 'U'}
                  </div>
                  <span className="whitespace-nowrap text-sm font-medium">
                    Profile
                  </span>
                </motion.div>
              </Link>
              <SignOutButton redirectUrl="/sign-in">
                <motion.button
                  type="button"
                  className="flex items-center gap-3 px-3 py-3 rounded-lg w-full text-text/60 hover:bg-red-500/10 hover:text-red-400"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsMobileOpen(false)}
                >
                  <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="whitespace-nowrap text-sm font-medium">Logout</span>
                </motion.button>
              </SignOutButton>
            </>
          ) : (
            <Link
              to="/sign-in"
              onClick={() => setIsMobileOpen(false)}
            >
              <motion.div
                className="flex items-center gap-3 px-3 py-3 rounded-lg w-full text-text/60 hover:bg-white/5 hover:text-text"
                whileTap={{ scale: 0.95 }}
              >
                <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span className="whitespace-nowrap text-sm font-medium">
                  Login / Signup
                </span>
              </motion.div>
            </Link>
          )}
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;

