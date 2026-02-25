import { useState, useRef } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

const DropZone = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!isSignedIn) {
      navigate('/sign-in');
      return;
    }

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (!isSignedIn) {
      navigate('/sign-in');
      return;
    }

    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file) => {
    if (file.type === 'application/pdf') {
      setSelectedFile(file);
      if (onFileSelect) {
        onFileSelect(file);
      }
    } else {
      alert('Please upload a PDF file');
    }
  };

  const handleClick = () => {
    if (!isSignedIn) {
      navigate('/sign-in');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
    if (onFileSelect) {
      onFileSelect(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <motion.div
      className={`relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300 cursor-pointer ${
        isDragging
          ? 'border-success bg-success/10 scale-105'
          : selectedFile
          ? 'border-success/50 bg-success/5'
          : 'border-text/20 hover:border-text/40 hover:bg-white/5'
      }`}
      onClick={handleClick}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileInput}
        className="hidden"
      />

      <div className="flex flex-col items-center gap-4">
        {selectedFile ? (
          <>
            {/* File Selected State */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center"
            >
              <svg
                className="w-8 h-8 text-success"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </motion.div>
            <div className="text-center">
              <p className="text-text font-medium mb-1">{selectedFile.name}</p>
              <p className="text-text/50 text-sm">
                {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
            </div>
            <motion.button
              onClick={handleRemove}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Remove File
            </motion.button>
          </>
        ) : (
          <>
            {/* Upload State */}
            <motion.div
              animate={isDragging ? { scale: 1.2, rotate: 5 } : { scale: 1, rotate: 0 }}
              className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center"
            >
              <svg
                className="w-8 h-8 text-text/60"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </motion.div>
            <div className="text-center">
              <p className="text-text font-medium mb-1">
                {isDragging ? 'Drop your resume here' : 'Drag & drop your resume'}
              </p>
              <p className="text-text/50 text-sm">or click to browse files</p>
              <p className="text-text/30 text-xs mt-2">Supports PDF only</p>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default DropZone;

