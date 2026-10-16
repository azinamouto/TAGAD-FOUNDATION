import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { AppLayout } from '../../components/layout/AppLayout';
import { ProtectedRoute } from '../../modules/auth/ProtectedRoute';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';

// Public Citizen Portal Views (Sprint 3)
const LandingPage = lazy(() => import('../../pages/public/LandingPage').then(module => ({ default: module.LandingPage })));
const PublicDemographics = lazy(() => import('../../pages/public/PublicDemographics').then(module => ({ default: module.PublicDemographics })));
const PublicPrograms = lazy(() => import('../../pages/public/PublicPrograms').then(module => ({ default: module.PublicPrograms })));
const PublicAccomplishments = lazy(() => import('../../pages/public/PublicAccomplishments').then(module => ({ default: module.PublicAccomplishments })));
const PublicGADPlans = lazy(() => import('../../pages/public/PublicGADPlans').then(module => ({ default: module.PublicGADPlans })));
const PublicFeedback = lazy(() => import('../../pages/public/PublicFeedback').then(module => ({ default: module.PublicFeedback })));

// Authentication Portal
const LoginPage = lazy(() => import('../../pages/auth/LoginPage').then(module => ({ default: module.LoginPage })));

// Authenticated GAD Workspace Pages (Protected)
const Dashboard = lazy(() => import('../../pages/Dashboard'));
const ProgramMonitoring = lazy(() => import('../../pages/ProgramMonitoring'));
const GADPlan = lazy(() => import('../../pages/GADPlan'));
const Accomplishments = lazy(() => import('../../pages/Accomplishments'));
const DataEncoding = lazy(() => import('../../pages/DataEncoding'));
const Reports = lazy(() => import('../../pages/Reports'));
const UserManagement = lazy(() => import('../../pages/UserManagement'));

// Error Pages
const NotFoundPage = lazy(() => import('../../pages/error/NotFoundPage').then(module => ({ default: module.NotFoundPage })));
const UnauthorizedPage = lazy(() => import('../../pages/error/UnauthorizedPage').then(module => ({ default: module.UnauthorizedPage })));

export const AppRouter: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<div role="status" className="p-8 text-muted-foreground">Loading page...</div>}>
        <Routes>
          {/* Public Citizen Portal (Unauthenticated) */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/demographics" element={<PublicDemographics />} />
            <Route path="/public-programs" element={<PublicPrograms />} />
            <Route path="/public-accomplishments" element={<PublicAccomplishments />} />
            <Route path="/public-plans" element={<PublicGADPlans />} />
            <Route path="/feedback" element={<PublicFeedback />} />
          </Route>

          {/* Authentication Portal */}
          <Route path="/login" element={<LoginPage />} />

          {/* Core Authenticated Workspace Routes */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/programs" element={<ProgramMonitoring />} />
            <Route path="/gad-plan" element={<GADPlan />} />
            <Route path="/accomplishments" element={<Accomplishments />} />
            <Route path="/data-encoding" element={<DataEncoding />} />
            <Route path="/beneficiaries" element={<DataEncoding />} />
            <Route path="/reports" element={<Reports />} />
            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />

            {/* Admin Aliases and Explicit /admin/* Routes */}
            <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<Dashboard />} />
            <Route path="/admin/programs" element={<ProgramMonitoring />} />
            <Route path="/admin/gad-plan" element={<GADPlan />} />
            <Route path="/admin/accomplishments" element={<Accomplishments />} />
            <Route path="/admin/data-encoding" element={<DataEncoding />} />
            <Route path="/admin/beneficiaries" element={<DataEncoding />} />
            <Route path="/admin/reports" element={<Reports />} />
            <Route
              path="/admin/users"
              element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Explicit Error Routes */}
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/403" element={<UnauthorizedPage />} />
          <Route path="/404" element={<NotFoundPage />} />

          {/* 404 Catch-All */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
};
