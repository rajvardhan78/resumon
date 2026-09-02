import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthAlert, AuthCard, AuthField, AuthSubmit, PasswordField } from '../components/AuthCard';
import { api } from '../lib/api';

const PASSWORD_HINT = 'At least 8 characters, with an uppercase letter, a lowercase letter and a number.';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1 = Email, 2 = OTP, 3 = New Password

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // --- Step 1: Request OTP ---
  const handleRequestOtp = async (event) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});

    try {
      await api.forgotPassword(email);
      setStep(2);
    } catch (failure) {
      const fields = failure.fieldErrors;
      setFieldErrors(fields ?? {});
      setError(fields?.general ?? (fields ? null : failure.message));
    } finally {
      setPending(false);
    }
  };

  // --- Step 2: Verify OTP ---
  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});

    try {
      const result = await api.verifyResetOtp(email, otp);
      setResetToken(result.resetToken);
      setStep(3);
    } catch (failure) {
      const fields = failure.fieldErrors;
      setFieldErrors(fields ?? {});
      setError(fields?.general ?? (fields ? null : failure.message));
    } finally {
      setPending(false);
    }
  };

  // --- Step 3: Reset Password ---
  const handleResetPassword = async (event) => {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      setError(null);
      setFieldErrors({ confirmPassword: 'Both passwords must match.' });
      return;
    }

    setPending(true);
    setError(null);
    setFieldErrors({});

    try {
      await api.resetPassword(email, resetToken, newPassword);
      // Navigate to sign-in on success
      navigate('/sign-in', { replace: true });
    } catch (failure) {
      const fields = failure.fieldErrors;
      setFieldErrors(fields ?? {});
      setError(fields?.general ?? (fields ? null : failure.message));
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthCard 
      title="Reset Password" 
      subtitle={
        step === 1 ? 'Enter your email to receive a reset code' :
        step === 2 ? 'Check your email for the verification code' :
        'Create a new password'
      }
    >
      {step === 1 && (
        <form onSubmit={handleRequestOtp} noValidate>
          <AuthAlert>{error}</AuthAlert>

          <AuthField
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            error={fieldErrors.email}
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
            required
          />

          <div className="flex gap-3 mt-6">
            <Link
              to="/sign-in"
              className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-sm font-medium transition-colors text-center inline-flex justify-center items-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 py-2.5 rounded-xl bg-success hover:bg-success/90 text-primary text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {pending ? 'Sending…' : 'Send Code'}
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleVerifyOtp} noValidate>
          <AuthAlert>{error}</AuthAlert>

          <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10 text-center">
            <p className="text-sm text-text/60 mb-2">We sent a 6-digit code to</p>
            <p className="text-text font-semibold">{email}</p>
          </div>

          <AuthField
            id="otp"
            label="Verification code"
            value={otp}
            onChange={setOtp}
            error={fieldErrors.otp}
            placeholder="000000"
            autoComplete="one-time-code"
            autoFocus
            required
          />

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-sm font-medium transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 py-2.5 rounded-xl bg-success hover:bg-success/90 text-primary text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {pending ? 'Verifying…' : 'Verify Code'}
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleResetPassword} noValidate>
          <AuthAlert>{error}</AuthAlert>

          <PasswordField
            id="newPassword"
            label="New Password"
            value={newPassword}
            onChange={setNewPassword}
            error={fieldErrors.newPassword}
            hint={PASSWORD_HINT}
            placeholder="Create a password"
            autoComplete="new-password"
            autoFocus
            required
          />
          <PasswordField
            id="confirmPassword"
            label="Confirm password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            error={fieldErrors.confirmPassword}
            placeholder="Repeat your password"
            autoComplete="new-password"
            required
          />

          <div className="mt-6">
            <AuthSubmit pending={pending} pendingLabel="Resetting…">
              Reset Password
            </AuthSubmit>
          </div>
        </form>
      )}
    </AuthCard>
  );
}
