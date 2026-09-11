import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { AppLayout } from '../../components/layout/AppLayout';
import { ProtectedRoute } from '../../modules/auth/ProtectedRoute';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';

// Public Citizen Portal Views (Sprint 3)
import { LandingPage } from '../../pages/public/LandingPage';
import { PublicDemographics } from '../../pages/public/PublicDemographics';
import { PublicPrograms } from '../../pages/public/PublicPrograms';
import { PublicAccomplishments } from '../../pages/public/PublicAccomplishments';
import { PublicGADPlans } from '../../pages/public/PublicGADPlans';
import { PublicFeedback } from '../../pages/public/PublicFeedback';

// Authentication Portal
import { LoginPage } from '../../pages/auth/LoginPage';

// Authenticated GAD Workspace Pages (Protected)
import Dashboard from '../../pages/Dashboard';
import ProgramMonitoring from '../../pages/ProgramMonitoring';
import GADPlan from '../../pages/GADPlan';
import Accomplishments from '../../pages/Accomplishments';
import DataEncoding from '../../pages/DataEncoding';
import Reports from '../../pages/Reports';
import UserManagement from '../../pages/UserManagement';
import StatisticalCatalog from '../../pages/StatisticalCatalog';
import TableBuilderPage from '../../pages/admin/TableBuilderPage';
import StatisticalDataEntryPage from '../../pages/admin/StatisticalDataEntryPage';

// Error Pages
import { NotFoundPage } from '../../pages/error/NotFoundPage';
import { UnauthorizedPage } from '../../pages/error/UnauthorizedPage';

export const AppRouter: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Public Citizen Portal (Unauthenticated) */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/demographics" element={<PublicDemographics />} />
            <Route path="/public-programs" element={<PublicPrograms />} />
            <Route path="/public-accomplishments" element={<PublicAccomplishments />} />
            <Route path="/public-plans" element={<PublicGADPlans />} />
            <Route path="/statistical-catalog" element={<StatisticalCatalog />} />
            <Route path="/statistical-data" element={<StatisticalDataEntryPage />} />
            <Route path="/statistical-data/:tableId" element={<StatisticalDataEntryPage />} />
            <Route path="/table-builder" element={<TableBuilderPage />} />
            <Route path="/table-builder/:id" element={<TableBuilderPage />} />
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
            <Route path="/statistical-catalog" element={<StatisticalCatalog />} />
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
            <Route path="/admin/statistical-catalog" element={<StatisticalCatalog />} />
            <Route path="/admin/statistical-data" element={<StatisticalDataEntryPage />} />
            <Route path="/admin/statistical-data/:tableId" element={<StatisticalDataEntryPage />} />
            <Route path="/admin/table-builder" element={<TableBuilderPage />} />
            <Route path="/admin/table-builder/:id" element={<TableBuilderPage />} />
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
      </BrowserRouter>
    </ErrorBoundary>
  );
};
