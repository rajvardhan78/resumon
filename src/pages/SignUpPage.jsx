import { SignUp } from '@clerk/clerk-react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';

function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-success to-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-primary font-bold text-3xl">R</span>
          </div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-text via-success to-text bg-clip-text text-transparent">
            Create Account
          </h1>
          <p className="text-text/60">Sign up to start analyzing your resumes</p>
        </div>

        <div className="flex justify-center">
          <SignUp
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'bg-white/5 backdrop-blur-md border border-white/10 shadow-xl',
                headerTitle: 'text-text',
                headerSubtitle: 'text-text/60',
                socialButtonsBlockButton: 'bg-white/10 hover:bg-white/20 border-white/20 text-text',
                formButtonPrimary: 'bg-success hover:bg-success/90 text-primary',
                formFieldInput: 'bg-white/10 border-white/20 text-text',
                formFieldLabel: 'text-text/80',
                footerActionLink: 'text-success hover:text-success/80',
                identityPreviewText: 'text-text',
                formFieldInputShowPasswordButton: 'text-text/60',
              },
            }}
            redirectUrl="/"
            signInUrl="/sign-in"
          />
        </div>
      </motion.div>
    </div>
  );
}

export default SignUpPage;
