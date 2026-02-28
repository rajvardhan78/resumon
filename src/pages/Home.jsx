import { useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import DropZone from '../components/DropZone';
import ScanButton from '../components/ScanButton';
import ScannerOverlay from '../components/ScannerOverlay';

function Home() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();

  const handleFileSelect = (file) => {
    if (!isSignedIn) {
      navigate('/sign-in');
      return;
    }
    setSelectedFile(file);
  };

  const handleScan = () => {
    if (!isSignedIn) {
      navigate('/sign-in');
      return;
    }

    if (!selectedFile) return;

    setIsScanning(true);

    // Simulate scanning process
    setTimeout(() => {
      setIsScanning(false);
      console.log('Scan complete!', selectedFile);
      // TODO: Send file to backend for analysis
    }, 4000);
  };

  return (
    <>
      {/* Scanner Overlay */}
      <ScannerOverlay isScanning={isScanning} />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-12 lg:py-10">
        {/* Header Section */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.h1
            className="text-5xl font-bold mb-4 bg-gradient-to-r from-text via-success to-text bg-clip-text text-transparent"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            AI Resume Analyzer
          </motion.h1>
          <motion.p
            className="text-text/60 text-lg max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Upload your resume and get instant AI-powered feedback on keywords, experience,
            knowledge depth, and creativity.
          </motion.p>
        </motion.div>

        {/* Instructions */}
        <motion.div
          className="mb-12 p-6 bg-white/5 backdrop-blur-md rounded-xl border border-white/10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-success/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-success font-bold font-mono">1</span>
              </div>
              <div>
                <p className="font-medium mb-1">Upload Resume</p>
                <p className="text-text/50">Drop your PDF resume in the zone below</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-success/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-success font-bold font-mono">2</span>
              </div>
              <div>
                <p className="font-medium mb-1">AI Analysis</p>
                <p className="text-text/50">Our AI evaluates 4 key dimensions</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-success/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-success font-bold font-mono">3</span>
              </div>
              <div>
                <p className="font-medium mb-1">Get Insights</p>
                <p className="text-text/50">Receive detailed scores and feedback</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Drop Zone */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <DropZone onFileSelect={handleFileSelect} />
        </motion.div>

        {/* Scan Button */}
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <ScanButton
            disabled={!selectedFile}
            onScan={handleScan}
            isScanning={isScanning}
          />
        </motion.div>

        {/* Features Grid */}
        <motion.div
          className="mt-12 grid md:grid-cols-2 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <div className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Keyword Matching</h3>
            <p className="text-text/60 text-sm">Identifies industry-standard tech stacks and hard skills</p>
          </div>

          <div className="p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl border border-blue-500/20">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Experience Analysis</h3>
            <p className="text-text/60 text-sm">Evaluates impact statements over basic task descriptions</p>
          </div>

          <div className="p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/20">
            <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Knowledge Depth</h3>
            <p className="text-text/60 text-sm">Assesses complexity and technical sophistication</p>
          </div>

          <div className="p-6 bg-gradient-to-br from-success/10 to-emerald-500/10 rounded-xl border border-success/20">
            <div className="w-12 h-12 bg-success/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Creativity Score</h3>
            <p className="text-text/60 text-sm">Measures unique framing and lexical diversity</p>
          </div>
        </motion.div>
      </div>
    </>
  );
}

export default Home;

