import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { ErrorBoundary } from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import ToastContainer from './components/ToastContainer';
import Home from './pages/Home';
import ElectionDetail from './pages/ElectionDetail';
import CreateElection from './pages/CreateElection';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import VerifyVote from './pages/VerifyVote';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <div className="win-desktop">
              <Navbar />
              <ToastContainer />
              <div className="app-container">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/election/:id" element={<ElectionDetail />} />
                  <Route path="/create" element={<CreateElection />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/verify" element={<VerifyVote />} />
                </Routes>
              </div>
            </div>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
