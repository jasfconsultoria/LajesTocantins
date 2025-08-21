import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import LandingPage from '@/pages/LandingPage';
import Auth from '@/components/Auth';
import '@/index.css';
import { AuthProvider, useAuth } from '@/contexts/SupabaseAuthContext';
import { AppProvider } from '@/contexts/AppContext'; 
import { Toaster } from '@/components/ui/toaster';

import Dashboard from '@/components/Dashboard';
import CompanyList from '@/components/CompanyList';
import CompanyEditorPage from '@/pages/CompanyEditorPage';
import SefazSettings from '@/components/settings/SefazSettings';
import TechRespSettings from '@/components/settings/TechRespSettings';
import Reports from '@/components/Reports';
import Logs from '@/components/Logs';
import Help from '@/components/Help';
import Versions from '@/components/Versions';
import UserManagement from '@/components/UserManagement';
import PeopleList from '@/pages/PeopleList'; 
import PersonEditorPage from '@/pages/PersonEditorPage'; 

const ProtectedRoute = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return <div className="w-full h-screen flex items-center justify-center bg-slate-50">Carregando Sessão...</div>;
  }

  if (!session) {
    return <Navigate to="/app/login" replace />;
  }

  return <MainLayout />;
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/app",
    element: <Outlet />,
    children: [
      {
        path: "login",
        element: <Auth />,
      },
      {
        path: "",
        element: <ProtectedRoute />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: "companies", element: <CompanyList /> },
          { path: "companies/new", element: <CompanyEditorPage /> },
          { path: "companies/:id/edit", element: <CompanyEditorPage /> },
          { path: "people", element: <PeopleList /> }, 
          { path: "people/new", element: <PersonEditorPage /> }, 
          { path: "people/:id/edit", element: <PersonEditorPage /> }, 
          { path: "users", element: <UserManagement /> },
          { path: "sefaz", element: <SefazSettings /> },
          { path: "techResp", element: <TechRespSettings /> },
          { path: "reports", element: <Reports /> },
          { path: "logs", element: <Logs /> },
          { path: "help", element: <Help /> },
          { path: "versions", element: <Versions /> },
        ]
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <AppProvider>
      <RouterProvider router={router} />
      <Toaster />
    </AppProvider>
  </AuthProvider>
);