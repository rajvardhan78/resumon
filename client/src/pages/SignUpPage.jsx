import { useState, useEffect } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AuthAlert, AuthCard, AuthField, AuthSubmit, PasswordField } from '../components/AuthCard';
import { api } from '../lib/api';

const PASSWORD_HINT = 'At least 8 characters, with an uppercase letter, a lowercase letter and a number.';
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

export default function SignUpPage() {
  const { isSignedIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(1); // 1 = Details, 2 = OTP
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (step === 2 && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [step, countdown]);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [turnstileToken, setTurnstileToken] = useState(null);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const redirectTo = location.state?.from ?? '/';

  // Bind the global Turnstile callback to our state
  useEffect(() => {
    window.onTurnstileSuccess = (token) => {
      setTurnstileToken(token);
    };

    const renderWidget = () => {
      if (window.turnstile && SITE_KEY) {
        window.turnstile.render('#turnstile-widget', {
          sitekey: SITE_KEY,
          callback: 'onTurnstileSuccess',
        });
      }
    };

    window.onTurnstileLoad = renderWidget;

    if (SITE_KEY) {
      if (window.turnstile) {
        renderWidget();
      } else if (!document.getElementById('turnstile-script')) {
        const script = document.createElement('script');
        script.id = 'turnstile-script';
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    }

    return () => {
      delete window.onTurnstileSuccess;
      delete window.onTurnstileLoad;
    };
  }, []);

  if (isSignedIn) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleRequestOtp = async (event) => {
    if (event && event.preventDefault) {
      event.preventDefault();
    }

    if (password !== confirmPassword) {
      setError(null);
      setFieldErrors({ confirmPassword: 'Both passwords must match.' });
      return;
    }

    if (SITE_KEY && !turnstileToken) {
      setError('Please complete the bot verification.');
      return;
    }

    setPending(true);
    setError(null);
    setFieldErrors({});

    try {
      await api.sendOtp(email, turnstileToken);
      setStep(2);
      setCountdown(15);
    } catch (failure) {
      const fields = failure.fieldErrors;
      setFieldErrors(fields ?? {});
      setError(fields?.general ?? (fields ? null : failure.message));
      
      // Reset turnstile if it failed
      if (window.turnstile) {
         window.turnstile.reset();
      }
      setTurnstileToken(null);
    } finally {
      setPending(false);
    }
  };

  const handleSignUp = async (event) => {
    event.preventDefault();

    setPending(true);
    setError(null);
    setFieldErrors({});

    try {
      await signUp({ fullName, email, password, otp });
      navigate(redirectTo, { replace: true });
    } catch (failure) {
      const fields = failure.fieldErrors;
      setFieldErrors(fields ?? {});
      setError(fields?.general ?? (fields ? null : failure.message));
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthCard title="Create Account" subtitle={step === 1 ? 'Sign up to start analyzing your resumes' : 'Check your email for the verification code'}>
      {step === 1 ? (
        <form onSubmit={handleRequestOtp} noValidate>
          <AuthAlert>{error}</AuthAlert>

          <AuthField
            id="fullName"
            label="Full name"
            value={fullName}
            onChange={setFullName}
            error={fieldErrors.fullName}
            placeholder="Ada Lovelace"
            autoComplete="name"
            autoFocus
            required
          />

          <AuthField
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            error={fieldErrors.email}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />

          <PasswordField
            id="password"
            label="Password"
            value={password}
            onChange={setPassword}
            error={fieldErrors.password}
            hint={PASSWORD_HINT}
            placeholder="Create a password"
            autoComplete="new-password"
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

          {SITE_KEY && (
            <div className="mb-4">
              <div id="turnstile-widget"></div>
            </div>
          )}

          <AuthSubmit pending={pending} pendingLabel="Sending verification code…" disabled={SITE_KEY && !turnstileToken}>
            Continue
          </AuthSubmit>
        </form>
      ) : (
        <form onSubmit={handleSignUp} noValidate>
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
              type="button"
              onClick={(e) => handleRequestOtp(e)}
              disabled={countdown > 0 || pending}
              className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 py-2.5 rounded-xl bg-success hover:bg-success/90 text-primary text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {pending ? 'Creating…' : 'Create Account'}
            </button>
          </div>
        </form>
      )}

      {step === 1 && (
        <p className="mt-6 text-center text-sm text-text/60">
          Already have an account?{' '}
          <Link to="/sign-in" className="text-success hover:text-success/80 font-medium">
            Sign in
          </Link>
        </p>
      )}
    </AuthCard>
  );
}
