import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SessionProvider } from './context/SessionContext.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { Navbar } from './components/Navbar.jsx';
import { Footer } from './components/Footer.jsx';

import { LandingPage } from './pages/LandingPage.jsx';
import { LabModePage } from './pages/LabModePage.jsx';
import { JoinPage } from './pages/JoinPage.jsx';
import { TransferPage } from './pages/TransferPage.jsx';
import { AdminLoginPage } from './pages/AdminLoginPage.jsx';
import { AdminDashboardPage } from './pages/AdminDashboardPage.jsx';
import { SessionExpiredPage } from './pages/SessionExpiredPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';

export default function App() {
  return (
    <ErrorBoundary>
      <SessionProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col bg-[#0b0f19] text-slate-100 selection:bg-blue-600 selection:text-white">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/lab" element={<LabModePage />} />
                <Route path="/join" element={<JoinPage />} />
                <Route path="/transfer" element={<TransferPage />} />
                <Route path="/admin" element={<AdminLoginPage />} />
                <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                <Route path="/expired" element={<SessionExpiredPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </SessionProvider>
    </ErrorBoundary>
  );
}
