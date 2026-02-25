import { motion } from 'framer-motion';

const ScanButton = ({ disabled, onScan, isScanning }) => {
  return (
    <div className="relative">
      <motion.button
        onClick={onScan}
        disabled={disabled || isScanning}
        className={`relative px-8 py-4 rounded-xl font-medium text-base transition-all duration-300 overflow-hidden ${
          disabled || isScanning
            ? 'bg-white/5 text-text/30 cursor-not-allowed'
            : 'bg-success hover:bg-success/90 text-primary shadow-lg shadow-success/20 hover:shadow-success/40'
        }`}
        whileHover={!disabled && !isScanning ? { scale: 1.05, y: -2 } : {}}
        whileTap={!disabled && !isScanning ? { scale: 0.95 } : {}}
      >
        {/* Shimmer effect when enabled */}
        {!disabled && !isScanning && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{
              repeat: Infinity,
              duration: 2,
              ease: 'linear',
            }}
          />
        )}

        <span className="relative flex items-center gap-2">
          {isScanning ? (
            <>
              <motion.div
                className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              Scanning...
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              Start Scan
            </>
          )}
        </span>
      </motion.button>
    </div>
  );
};

export default ScanButton;


