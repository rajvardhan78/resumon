import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Results from './pages/Results';
import Analytics from './pages/Analytics';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-primary text-text">
        {/* Sidebar - appears on all pages except sign-in/sign-up */}
        <Routes>
          <Route path="/sign-in" element={null} />
          <Route path="/sign-up" element={null} />
          <Route path="*" element={<Sidebar />} />
        </Routes>

        {/* Main Content Area */}
        <main className="lg:ml-16 transition-all duration-300">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/sign-in" element={<SignInPage />} />
            <Route path="/sign-up" element={<SignUpPage />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/results"
              element={
                <ProtectedRoute>
                  <Results />
                </ProtectedRoute>
              }
            />
            <Route path="/analytics" element={<Analytics />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
