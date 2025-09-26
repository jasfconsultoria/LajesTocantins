import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Outlet, useNavigate } from 'react-router-dom';
import { 
  Bell, Menu, Home, Building, Package, Users, ClipboardList, BarChart3, Database, 
  HelpCircle, History, UserCheck // Importa todos os ícones necessários
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useApp } from '@/contexts/AppContext';
import CompanySwitcher from '@/components/CompanySwitcher';
import Sidebar from '@/components/Sidebar'; // Importa o novo componente Sidebar

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 text-sm">
      <Helmet>
        <title>{activeCompany ? activeCompany.razao_social : 'App'} | Lajes Tocantins</title>
        <meta name="description" content="Painel de controle para o sistema de gerenciamento Lajes Tocantins." />
      </Helmet>

      <header className="glass-effect border-b border-white/20 sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center space-x-4">
            {/* Botão de toggle da sidebar, visível em todas as resoluções */}
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
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
        {/* Novo componente Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          closeSidebar={() => setSidebarOpen(false)}
          sidebarItems={sidebarItems}
          handleSignOut={handleSignOut}
          appVersion={appVersion}
          user={user}
          role={role}
        />

        {/* Área de conteúdo principal - não precisa de margin-left, pois a sidebar é fixa */}
        <main className="flex-1 p-4 lg:p-6">
          <Outlet context={{ handleNotImplemented, activeCompanyId: activeCompany?.id }} />
        </main>
      </div>

      {/* Overlay para mobile - apenas em telas pequenas quando a sidebar está aberta */}
      {sidebarOpen && window.innerWidth < 1024 && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}

export default MainLayout;