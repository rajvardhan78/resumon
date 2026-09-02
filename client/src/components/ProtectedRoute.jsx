import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isSignedIn, isLoaded } = useAuth();
  const location = useLocation();

  if (!isLoaded) {
    // Show loading state while the stored refresh token is exchanged for a session
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-success border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text/60">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    // Remember where they were headed so sign-in can send them back there
    return <Navigate to="/sign-in" state={{ from: location.pathname }} replace />;
  }

  return children;
};

export default ProtectedRoute;

