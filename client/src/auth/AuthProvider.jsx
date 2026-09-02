import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './AuthContext';
import {
  api,
  clearTokens,
  hasStoredSession,
  onSessionExpired,
  refreshSession,
  setTokens,
} from '../lib/api';
import { clearLatestScan } from '../lib/latestScan';

/**
 * Owns the signed-in user. This is what replaced Clerk's <ClerkProvider>: sign-in and sign-up now
 * hit the ASP.NET Core Identity endpoints, and a reload restores the session from the stored
 * refresh token instead of a third-party cookie.
 */
export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // With nothing stored there is nothing to wait for, so the app can render immediately.
  const [isLoaded, setIsLoaded] = useState(!hasStoredSession());

  // A refresh token the API rejects (expired, revoked, or replayed) means the session is over.
  // Dropping the user here is what makes ProtectedRoute bounce to /sign-in.
  useEffect(() => {
    onSessionExpired(() => setUser(null));

    return () => onSessionExpired(null);
  }, []);

  // Boot: trade the stored refresh token for an access token. The response carries the profile,
  // so this rehydrates the session in a single round trip.
  useEffect(() => {
    if (!hasStoredSession()) return;

    let active = true;

    refreshSession()
      .then((auth) => {
        if (active) setUser(auth?.user ?? null);
      })
      .catch(() => {
        // Offline or the API is down. Stay signed out but keep the token: the next call retries.
      })
      .finally(() => {
        if (active) setIsLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);
  const signIn = useCallback(async (email, password) => {
    const auth = await api.login({ email, password });

    setTokens(auth.tokens);
    setUser(auth.user);

    return auth.user;
  }, []);

  /** Registration signs the new account straight in, so sign-up is one round trip. */
  const signUp = useCallback(async ({ fullName, email, password }) => {
    const auth = await api.register({ fullName, email, password });

    setTokens(auth.tokens);
    setUser(auth.user);

    return auth.user;
  }, []);

  const signOut = useCallback(async () => {
    try {
      // Best effort: retiring the refresh token server-side stops a stolen copy being useful.
      await api.logout();
    } catch {
      // A network problem must not leave the user stuck in a session they asked to end.
    } finally {
      clearTokens();
      // The cached scan is per-browser, not per-account: drop it so the next person to sign in
      // on this machine cannot read the previous user's resume feedback.
      clearLatestScan();
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ isLoaded, isSignedIn: user !== null, user, signIn, signUp, signOut }),
    [isLoaded, user, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
