import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import App from '@/App';
import LandingPage from '@/pages/LandingPage';
import Auth from '@/components/Auth';
import '@/index.css';
import { AuthProvider, useAuth } from '@/contexts/SupabaseAuthContext';
import { AppProvider } from '@/contexts/AppContext'; 
import { Toaster } from '@/components/ui/toaster';

const ProtectedRoute = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return <div className="w-full h-screen flex items-center justify-center bg-slate-50">Carregando Sessão...</div>;
  }

  if (!session) {
    return <Navigate to="/app/login" replace />;
  }

  return (
    <AppProvider>
      <App />
    </AppProvider>
  );
};

const AppLayout = () => (
  <AuthProvider>
    <Outlet />
    <Toaster />
  </AuthProvider>
);

const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/app",
    element: <AppLayout />,
    children: [
      {
        path: "login",
        element: <Auth />,
      },
      {
        path: "",
        element: <ProtectedRoute />,
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);