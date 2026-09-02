import { createContext, useContext } from 'react';

/**
 * Session state for the whole app: `isLoaded`, `isSignedIn`, `user`, plus `signIn`, `signUp` and
 * `signOut`. Lives in its own module so the provider file exports nothing but a component, which
 * is what react-refresh needs in order to hot-reload it.
 */
export const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>.');
  }

  return context;
}
