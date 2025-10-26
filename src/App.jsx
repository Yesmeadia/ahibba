import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './config/firebase';
import { useEffect, useState } from 'react';
import AdminLogin from './pages/AdminLogin';
import Dashboard from './pages/Dashboard';
import UserPage from './pages/UserPage';
import LandingPage from './pages/LandingPage';
import NotFoundPage from './pages/NotFoundPage';
import CertificatePage from './pages/Certificate';
import FeedbackPage from './pages/FeedbackPage';

function ProtectedRoute({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return user ? children : <Navigate to="/admin" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page as the new home */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Registration page */}
        <Route path="/QWZlcm5vb25TZWN0aW9uIERheaAy" element={<UserPage />} />
        {/* Certificate page */}
        <Route path="/certificate" element={<CertificatePage />} />
        {/* Feedback page */}
        <Route path="/feedback" element={<FeedbackPage />} />
        
        {/* Admin routes */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        
        {/* Redirect old user page URL to new register URL */}
        <Route path="/user" element={<Navigate to="/register" replace />} />
        
        {/* 404 page */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;