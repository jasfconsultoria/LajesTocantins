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
import ProductList from '@/pages/ProductList';
import ProductEditorPage from '@/pages/ProductEditorPage';
import BudgetList from '@/pages/BudgetList';
import BudgetEditorPage from '@/pages/BudgetEditorPage';
import NotImplementedPage from '@/pages/NotImplementedPage';
import CFOPList from '@/pages/CFOPList';
import CFOPEditorPage from '@/pages/CFOPEditorPage';
import IcmsAliquotaList from '@/pages/IcmsAliquotaList';
import IcmsAliquotaEditorPage from '@/pages/IcmsAliquotaEditorPage';
import CstCsosnList from '@/pages/CstCsosnList';
import CstCsosnEditorPage from '@/pages/CstCsosnEditorPage';
import PublicBudgetSignaturePage from '@/pages/PublicBudgetSignaturePage'; // New import

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
    path: "/public/budgets/:id/sign", // Public route for signature
    element: <PublicBudgetSignaturePage />,
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
          { path: "products", element: <ProductList /> },
          { path: "products/new", element: <ProductEditorPage /> },
          { path: "products/:id/edit", element: <ProductEditorPage /> },
          { path: "people", element: <PeopleList /> }, 
          { path: "people/new", element: <PersonEditorPage /> }, 
          { path: "people/:id/edit", element: <PersonEditorPage /> }, 
          { path: "budgets", element: <BudgetList /> },
          { path: "budgets/new", element: <BudgetEditorPage /> },
          { path: "budgets/:id/edit", element: <BudgetEditorPage /> },
          
          // New Financeiro Routes
          { path: "financeiro/creditos", element: <NotImplementedPage title="Créditos" /> },
          { path: "financeiro/debitos", element: <NotImplementedPage title="Débitos" /> },

          // New Estoque Routes
          { path: "estoque/entradas", element: <NotImplementedPage title="Entradas de Estoque" /> },
          { path: "estoque/saidas", element: <NotImplementedPage title="Saídas de Estoque" /> },

          // New Notas Routes
          { path: "notas/nfe", element: <NotImplementedPage title="NF-e" /> },
          { path: "notas/nfce", element: <NotImplementedPage title="NFC-e" /> },
          { path: "notas/cfop", element: <CFOPList /> },
          { path: "notas/cfop/new", element: <CFOPEditorPage /> },
          { path: "notas/cfop/:cfop/edit", element: <CFOPEditorPage /> },
          { path: "notas/icms-aliquotas", element: <IcmsAliquotaList /> },
          { path: "notas/icms-aliquotas/new", element: <IcmsAliquotaEditorPage /> },
          { path: "notas/icms-aliquotas/:id/edit", element: <IcmsAliquotaEditorPage /> },
          { path: "notas/cst", element: <CstCsosnList /> },
          { path: "notas/cst/new", element: <CstCsosnEditorPage /> },
          { path: "notas/cst/:id/edit", element: <CstCsosnEditorPage /> },

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