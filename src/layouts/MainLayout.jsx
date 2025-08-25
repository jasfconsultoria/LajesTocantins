import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  FileText, BarChart3, Shield, Building, Bell, Menu, Home, Database, 
  HelpCircle, Lock, UserCheck, LogOut, History, Users, Package, ClipboardList // Import ClipboardList icon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useApp } from '@/contexts/AppContext';
import CompanySwitcher from '@/components/CompanySwitcher';

function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();
  const { user, signOut, role, activeCompany } = useAuth();
  const { appVersion } = useApp();
  const navigate = useNavigate();

  const handleNotImplemented = (feature) => {
    toast({
      title: "🚧 Funcionalidade não implementada ainda",
      description: `${feature} - mas não se preocupe! Você pode solicitar isso no seu próximo prompt! 🚀`,
      duration: 3000,
    });
  };

  const baseSidebarItems = [
    { to: '/app', label: 'Dashboard', icon: Home },
    { to: '/app/companies', label: 'Empresas', icon: Building },
    { to: '/app/products', label: 'Produtos', icon: Package },
    { to: '/app/people', label: 'Pessoas', icon: Users },
    { to: '/app/budgets', label: 'Orçamentos', icon: ClipboardList }, // New Budgets item
    { to: '/app/reports', label: 'Relatórios', icon: BarChart3 },
    { to: '/app/logs', label: 'Logs', icon: Database },
    { to: '/app/help', label: 'Ajuda', icon: HelpCircle },
    { to: '/app/versions', label: 'Versões', icon: History }
  ];

  const adminOnlyItems = [
    { to: '/app/users', label: 'Usuários', icon: Users },
    { to: '/app/techResp', label: 'Resp. Técnico', icon: UserCheck },
  ];

  const sidebarItems = role === 'admin' 
    ? [...baseSidebarItems.slice(0, 2), ...adminOnlyItems, ...baseSidebarItems.slice(2)]
    : baseSidebarItems;
  
  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 text-sm">
      <Helmet>
        <title>{activeCompany ? activeCompany.razao_social : 'App'} | Lajes Tocantins</title>
        <meta name="description" content="Painel de controle para o sistema de gerenciamento Lajes Tocantins." />
      </Helmet>

      <header className="glass-effect border-b border-white/20 sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden">
              <Menu className="w-5 h-5" />
            </Button>
            <CompanySwitcher />
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => handleNotImplemented('Notificações')}>
              <Bell className="w-5 h-5" />
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">{user?.email ? user.email.charAt(0).toUpperCase() : '?'}</span>
              </div>
              <div className="hidden md:block">
                <span className="text-sm font-medium text-slate-700">{user?.email}</span>
                {role && <span className="block text-xs text-slate-500 capitalize">{role}</span>}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <AnimatePresence>
          {(sidebarOpen || window.innerWidth >= 1024) && (
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ duration: 0.3 }}
              className="fixed lg:relative inset-y-0 left-0 z-30 w-64 glass-effect border-r border-white/20 lg:translate-x-0"
            >
              <div className="flex flex-col h-full">
                <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                  {sidebarItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/app'}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) => `sidebar-item w-full ${isActive ? 'active' : ''}`}
                    >
                      <item.icon className="w-5 h-5 mr-3" />
                      {item.label}
                    </NavLink>
                  ))}
                </div>
                
                <div className="p-4 border-t border-white/20">
                   <button onClick={handleSignOut} className="sidebar-item w-full text-red-600 hover:bg-red-100">
                      <LogOut className="w-5 h-5 mr-3" />
                      Sair
                    </button>
                  <div className="text-xs text-slate-500 text-center mt-4">
                    Lajes Tocantins v{appVersion}<br/>
                    Sistema de Gerenciamento
                  </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        <main className="flex-1 p-4 lg:p-6">
          <Outlet context={{ handleNotImplemented, activeCompanyId: activeCompany?.id }} />
        </main>
      </div>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}

export default MainLayout;