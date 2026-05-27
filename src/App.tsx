import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { Layout } from '@/components/layout/Layout';
import { ListingsPage } from '@/pages/ListingsPage';
import { PropertyDetailPage } from '@/pages/PropertyDetailPage';
import { SubmitPropertyPage } from '@/pages/SubmitPropertyPage';
import { AboutPage } from '@/pages/AboutPage';
import { AuthCallbackPage } from '@/pages/AuthCallbackPage';
import { DashboardLayout } from '@/pages/dashboard/DashboardLayout';
import { AnalyticsPage } from '@/pages/dashboard/AnalyticsPage';
import { PropertiesPage } from '@/pages/dashboard/PropertiesPage';
import { CrmPage } from '@/pages/dashboard/CrmPage';
import { StaffPage } from '@/pages/dashboard/StaffPage';
import { SettingsPage } from '@/pages/dashboard/SettingsPage';

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<ListingsPage />} />
              <Route path="/listings" element={<Navigate to="/" replace />} />
              <Route path="/property/:code" element={<PropertyDetailPage />} />
              <Route path="/submit" element={<SubmitPropertyPage />} />
              <Route path="/about" element={<AboutPage />} />
            </Route>
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<AnalyticsPage />} />
              <Route path="properties" element={<PropertiesPage />} />
              <Route path="crm" element={<CrmPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="staff" element={<StaffPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
