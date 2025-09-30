import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Outlet, useNavigate } from 'react-router-dom';
import { 
  Bell, Home, Building, Package, Users, ClipboardList, BarChart3, Database, 
  HelpCircle, History, UserCheck, Menu, X, 
  DollarSign, ArrowUpCircle, ArrowDownCircle, // Financeiro icons
  Warehouse, ArrowRightToLine, ArrowLeftToLine, // Estoque icons
  Receipt, FileText // Notas icons
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

  const handleNotImplemented = (feature) => {
    toast({
      title: "🚧 Funcionalidade não implementada ainda",
      description: `${feature} - mas não se preocupe! Você pode solicitar isso no seu próximo prompt! 🚀`,
      duration: 3000,
    });
  };

  const baseSidebarItems = [
    { to: '/app', label: 'Dashboard', icon: Home, type: 'link' },
    { to: '/app/companies', label: 'Empresas', icon: Building, type: 'link' },
    { to: '/app/products', label: 'Produtos', icon: Package, type: 'link' },
    { to: '/app/people', label: 'Pessoas', icon: Users, type: 'link' },
    { to: '/app/budgets', label: 'Orçamentos', icon: ClipboardList, type: 'link' },
    
    // New Financeiro section
    { 
      label: 'Financeiro', 
      icon: DollarSign, 
      type: 'category',
      subItems: [
        { to: '/app/financeiro/creditos', label: 'Créditos', icon: ArrowUpCircle, type: 'link' },
        { to: '/app/financeiro/debitos', label: 'Débitos', icon: ArrowDownCircle, type: 'link' },
      ]
    },

    // New Estoque section
    { 
      label: 'Estoque', 
      icon: Warehouse, 
      type: 'category',
      subItems: [
        { to: '/app/estoque/entradas', label: 'Entradas', icon: ArrowRightToLine, type: 'link' },
        { to: '/app/estoque/saidas', label: 'Saídas', icon: ArrowLeftToLine, type: 'link' },
      ]
    },

    // New Notas section
    { 
      label: 'Notas', 
      icon: Receipt, 
      type: 'category',
      subItems: [
        { to: '/app/notas/nfe', label: 'NF-e', icon: FileText, type: 'link' },
        { to: '/app/notas/nfce', label: 'NFC-e', icon: Receipt, type: 'link' },
      ]
    },

    { to: '/app/reports', label: 'Relatórios', icon: BarChart3, type: 'link' },
    { to: '/app/logs', label: 'Logs', icon: Database, type: 'link' },
    { to: '/app/help', label: 'Ajuda', icon: HelpCircle, type: 'link' },
    { to: '/app/versions', label: 'Versões', icon: History, type: 'link' }
  ];

  const adminOnlyItems = [
    { to: '/app/users', label: 'Usuários', icon: Users, type: 'link' },
    { to: '/app/techResp', label: 'Resp. Técnico', icon: UserCheck, type: 'link' },
  ];

  // Function to insert admin items into the nested structure
  const insertAdminItems = (items, adminItems) => {
    const newItems = [...items];
    const insertIndex = newItems.findIndex(item => item.label === 'Orçamentos') + 1; // Insert after 'Orçamentos'
    newItems.splice(insertIndex, 0, ...adminItems);
    return newItems;
  };

  const sidebarItems = role === 'admin' 
    ? insertAdminItems(baseSidebarItems, adminOnlyItems)
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

      {/* Sidebar container animado - fixed e animando 'left' */}
      <motion.aside
        initial={{ left: -expandedSidebarWidth }} // Começa fora da tela
        animate={{ left: sidebarOpen ? 0 : -expandedSidebarWidth }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`fixed top-0 h-screen w-64 glass-effect border-r border-white/20 z-30`} // Fixed width
      >
        {/* Conteúdo da Sidebar */}
        <Sidebar 
          closeSidebar={closeSidebar}
          sidebarItems={sidebarItems}
          handleSignOut={handleSignOut}
          appVersion={appVersion}
          user={user}
          role={role}
        />
      </motion.aside>

      {/* Overlay para mobile quando a sidebar está aberta */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden" 
          onClick={closeSidebar} 
        />
      )}

      {/* Área de conteúdo principal - anima o margin-left para 'empurrar' o conteúdo */}
      <motion.div
        initial={{ marginLeft: 0 }}
        animate={{ marginLeft: sidebarOpen ? expandedSidebarWidth : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="flex-1 flex flex-col"
      >
        <header className="glass-effect border-b border-white/20 sticky top-0 z-40">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center space-x-4">
              {/* Botão de Toggle no cabeçalho */}
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
      </motion.div>
    </div>
  );
}

export default MainLayout;