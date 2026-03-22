import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// ── Lazy-load all pages — only downloaded when first visited ──────────
const HomePage        = lazy(() => import('./pages/HomePage'));
const EventDetailPage = lazy(() => import('./pages/EventDetailPage'));
const LoginPage       = lazy(() => import('./pages/LoginPage'));
const RegisterPage    = lazy(() => import('./pages/RegisterPage'));
const AdminDashboard  = lazy(() => import('./pages/AdminDashboard'));
const EventFormPage   = lazy(() => import('./pages/EventFormPage'));
const SubmitEventPage = lazy(() => import('./pages/SubmitEventPage'));

// Page-level loading spinner
function PageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
        className="w-8 h-8 border-[3px] border-gray-900 dark:border-white border-t-transparent rounded-full"
      />
    </div>
  );
}

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
  exit:    { opacity: 0, y: -10, transition: { duration: 0.15 } },
};

function PageWrapper({ children }) {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" style={{ willChange: 'transform, opacity' }}>
      {children}
    </motion.div>
  );
}

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
        className="w-8 h-8 border-[3px] border-gray-900 dark:border-white border-t-transparent rounded-full" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageWrapper><HomePage /></PageWrapper>} />
        <Route path="/events/:id" element={<PageWrapper><EventDetailPage /></PageWrapper>} />
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <PageWrapper><LoginPage /></PageWrapper>} />
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <PageWrapper><RegisterPage /></PageWrapper>} />
        <Route path="/admin" element={<ProtectedRoute adminOnly><PageWrapper><AdminDashboard /></PageWrapper></ProtectedRoute>} />
        <Route path="/admin/events/new" element={<ProtectedRoute adminOnly><PageWrapper><EventFormPage /></PageWrapper></ProtectedRoute>} />
        <Route path="/admin/events/:id/edit" element={<ProtectedRoute adminOnly><PageWrapper><EventFormPage /></PageWrapper></ProtectedRoute>} />
        <Route path="/submit-event" element={<ProtectedRoute><PageWrapper><SubmitEventPage /></PageWrapper></ProtectedRoute>} />
        <Route path="/bookmarks" element={<ProtectedRoute><PageWrapper><BookmarksPage /></PageWrapper></ProtectedRoute>} />
        <Route path="*" element={<PageWrapper><NotFound /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
}

// Simple Bookmarks page
function BookmarksPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <div className="text-6xl mb-4">🔖</div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Bookmarks</h2>
      <p className="text-gray-500 dark:text-gray-400">Save events here by clicking the bookmark button on event detail pages.</p>
      <a href="/" className="btn-primary inline-block mt-6">Browse Events</a>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-7xl mb-4">🌴</div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">404 - Not Found</h1>
        <p className="text-gray-500 mb-6">This page doesn't exist in Kerala's events universe.</p>
        <a href="/" className="btn-primary inline-block">Back to Events</a>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors duration-300 flex flex-col">
            <Navbar />
            <main className="flex-1">
              <Suspense fallback={<PageSpinner />}>
                <AppRoutes />
              </Suspense>
            </main>
            <Footer />
          </div>
          <Toaster
            position="top-right"
            toastOptions={{
              className: '!bg-white dark:!bg-gray-800 !text-gray-900 dark:!text-white !border !border-gray-100 dark:!border-gray-700 !shadow-lg !rounded-xl !text-sm',
              duration: 3000,
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
