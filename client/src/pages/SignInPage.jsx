import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AuthAlert, AuthCard, AuthField, AuthSubmit, PasswordField } from '../components/AuthCard';

function SignInPage() {
  const { isSignedIn, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // ProtectedRoute records the page that bounced them here, so sign-in can hand it back.
  const redirectTo = location.state?.from ?? '/';

  if (isSignedIn) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    setPending(true);
    setError(null);
    setFieldErrors({});

    try {
      await signIn(email, password);
      navigate(redirectTo, { replace: true });
    } catch (failure) {
      const fields = failure.fieldErrors;

      setFieldErrors(fields ?? {});
      // With per-field messages on screen, the banner would just repeat them.
      setError(fields?.general ?? (fields ? null : failure.message));
    } finally {
      setPending(false);
    }
  };
  return (
    <AuthCard title="Welcome Back" subtitle="Sign in to continue to Resumon">
      <form onSubmit={handleSubmit} noValidate>
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

        <PasswordField
          id="password"
          label="Password"
          value={password}
          onChange={setPassword}
          error={fieldErrors.password}
          placeholder="Your password"
          autoComplete="current-password"
          required
        />
        
        <div className="flex justify-end mt-2 mb-6">
          <Link to="/forgot-password" className="text-sm text-text/50 hover:text-success transition-colors">
            Forgot password?
          </Link>
        </div>

        <AuthSubmit pending={pending} pendingLabel="Signing in…">
          Sign In
        </AuthSubmit>
      </form>

      <p className="mt-6 text-center text-sm text-text/60">
        New here?{' '}
        <Link to="/sign-up" className="text-success hover:text-success/80 font-medium">
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}

export default SignInPage;
