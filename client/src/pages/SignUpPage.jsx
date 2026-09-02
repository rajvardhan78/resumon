import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AuthAlert, AuthCard, AuthField, AuthSubmit, PasswordField } from '../components/AuthCard';

// Mirrors the Identity options set in Program.cs: 8 characters, mixed case, at least one digit.
const PASSWORD_HINT = 'At least 8 characters, with an uppercase letter, a lowercase letter and a number.';

function SignUpPage() {
  const { isSignedIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const redirectTo = location.state?.from ?? '/';

  if (isSignedIn) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Checked here because the server has no second password to compare against.
    if (password !== confirmPassword) {
      setError(null);
      setFieldErrors({ confirmPassword: 'Both passwords must match.' });

      return;
    }

    setPending(true);
    setError(null);
    setFieldErrors({});

    try {
      await signUp({ fullName, email, password });
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
    <AuthCard title="Create Account" subtitle="Sign up to start analyzing your resumes">
      <form onSubmit={handleSubmit} noValidate>
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

        <AuthSubmit pending={pending} pendingLabel="Creating account…">
          Create Account
        </AuthSubmit>
      </form>

      <p className="mt-6 text-center text-sm text-text/60">
        Already have an account?{' '}
        <Link to="/sign-in" className="text-success hover:text-success/80 font-medium">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}

export default SignUpPage;
