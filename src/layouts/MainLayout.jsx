import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  FileText, BarChart3, Shield, Building, Bell, Menu, Home, Database, 
  HelpCircle, Lock, UserCheck, LogOut, History, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useApp } from '@/contexts/AppContext';

function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();
  const { user, signOut, role } = useAuth();
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
    { to: '/app/certificate', label: 'Certificado', icon: Lock },
    { to: '/app/sefaz', label: 'SEFAZ', icon: Shield },
    { to: '/app/techResp', label: 'Resp. Técnico', icon: UserCheck },
    { to: '/app/reports', label: 'Relatórios', icon: BarChart3 },
    { to: '/app/logs', label: 'Logs', icon: Database },
    { to: '/app/help', label: 'Ajuda', icon: HelpCircle },
    { to: '/app/versions', label: 'Versões', icon: History }
  ];

  const sidebarItems = role === 'admin' 
    ? [...baseSidebarItems.slice(0, 2), { to: '/app/users', label: 'Usuários', icon: Users }, ...baseSidebarItems.slice(2)]
    : baseSidebarItems;
  
  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 text-sm">
      <Helmet>
        <title>App | NFC-e Plus</title>
        <meta name="description" content="Painel de controle para emissão automática de NFC-e." />
      </Helmet>

      <header className="glass-effect border-b border-white/20 sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden">
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/app')}>
              <div className="w-9 h-9 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold gradient-text">NFC-e Plus</h1>
                <p className="text-xs text-slate-600">Painel de Controle</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => handleNotImplemented('Notificações')}>
              <Bell className="w-5 h-5" />
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">{user?.email ? user.email.charAt(0).toUpperCase() : '?'}</span>
              </div>
              <span className="text-sm font-medium text-slate-700 hidden md:block">{user?.email}</span>
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
                    NFC-e Plus v{appVersion}<br/>
                    Desenvolvido para nfceplus.com
                  </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}

export default MainLayout;