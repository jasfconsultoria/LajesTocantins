import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Outlet, useNavigate } from 'react-router-dom';
import { 
  Bell, Home, Building, Package, Users, ClipboardList, BarChart3, Database, 
  HelpCircle, History, UserCheck, Menu, X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useApp } from '@/contexts/AppContext';
import CompanySwitcher from '@/components/CompanySwitcher';
import Sidebar from '@/components/Sidebar';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Inicia a sidebar fechada por padrão
  const { toast } = useToast();
  const { user, signOut, role, activeCompany } = useAuth();
  const { appVersion } = useApp();
  const navigate = useNavigate();

  const expandedSidebarWidth = 256; // w-64 em Tailwind é 256px
  const toggleButtonOffset = 16; // Espaçamento do canto superior/esquerdo

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
    { to: '/app/budgets', label: 'Orçamentos', icon: ClipboardList },
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

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 text-sm">
      <Helmet>
        <title>{activeCompany ? activeCompany.razao_social : 'App'} | Lajes Tocantins</title>
        <meta name="description" content="Painel de controle para o sistema de gerenciamento Lajes Tocantins." />
      </Helmet>

      {/* Sidebar container animado */}
      <motion.aside
        initial={{ width: 0 }} // Começa com largura 0 (completamente escondida)
        animate={{ width: sidebarOpen ? expandedSidebarWidth : 0 }} // Anima a largura
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`sidebar flex-shrink-0 h-screen overflow-hidden glass-effect border-r border-white/20`}
      >
        {sidebarOpen && ( // Renderiza o conteúdo da sidebar apenas se estiver aberta
          <Sidebar 
            closeSidebar={closeSidebar}
            sidebarItems={sidebarItems}
            handleSignOut={handleSignOut}
            appVersion={appVersion}
            user={user}
            role={role}
          />
        )}
      </motion.aside>

      {/* Botão de Toggle Flutuante */}
      <motion.div
        initial={{ left: toggleButtonOffset }} // Posição inicial quando a sidebar está fechada
        animate={{ left: sidebarOpen ? expandedSidebarWidth + toggleButtonOffset : toggleButtonOffset }} // Ajusta a posição quando a sidebar abre/fecha
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="fixed top-4 z-40"
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="text-slate-700 hover:bg-slate-200 bg-white/80 backdrop-blur-sm rounded-full shadow-md"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{sidebarOpen ? "Fechar Sidebar" : "Abrir Sidebar"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </motion.div>

      {/* Área de conteúdo principal - ocupa o restante da largura disponível */}
      <div className="flex-1 flex flex-col">
        <header className="glass-effect border-b border-white/20 sticky top-0 z-40">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center space-x-4">
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

        <main className="flex-1 p-4 lg:p-6">
          <Outlet context={{ handleNotImplemented, activeCompanyId: activeCompany?.id }} />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;