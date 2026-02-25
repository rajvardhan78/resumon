import { motion, AnimatePresence } from 'framer-motion';

const ScannerOverlay = ({ isScanning }) => {
  return (
    <AnimatePresence>
      {isScanning && (
        <motion.div
          className="fixed inset-0 z-50 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-primary/80 backdrop-blur-sm" />

          {/* Scanning line */}
          <motion.div
            className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-success to-transparent shadow-lg shadow-success/50"
            initial={{ top: '0%' }}
            animate={{ top: '100%' }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            {/* Glow effect */}
            <div className="absolute inset-0 blur-xl bg-success/50" />
          </motion.div>

          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `linear-gradient(#22C55E 1px, transparent 1px),
                               linear-gradient(90deg, #22C55E 1px, transparent 1px)`,
              backgroundSize: '50px 50px',
            }}
          />

          {/* Scanning text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <motion.div
                className="inline-flex items-center gap-3 px-6 py-3 bg-success/20 rounded-full border border-success/30 backdrop-blur-md"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <motion.div
                  className="w-2 h-2 bg-success rounded-full"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="text-success font-mono text-sm font-medium">
                  Analyzing Resume...
                </span>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ScannerOverlay;

