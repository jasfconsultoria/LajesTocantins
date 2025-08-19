import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, BarChart3, Shield, Building, Bell, Menu, Home, Database, Globe, 
  HelpCircle, Lock, UserCheck, LogOut, Loader2, ShoppingCart, Users, ClipboardList, History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import Dashboard from '@/components/Dashboard';
import Sales from '@/components/Sales';
import Nfce from '@/components/Nfce';
import Products from '@/components/Products';
import Customers from '@/components/Customers';
import CompanySettings from '@/components/settings/CompanySettings';
import SefazSettings from '@/components/settings/SefazSettings';
import WooCommerceSettings from '@/components/settings/WooCommerceSettings';
import CertificateSettings from '@/components/settings/CertificateSettings';
import TechRespSettings from '@/components/settings/TechRespSettings';
import Reports from '@/components/Reports';
import Logs from '@/components/Logs';
import Help from '@/components/Help';
import Versions from '@/components/Versions';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useApp } from '@/contexts/AppContext';

function App() {
  const [activeTab, setActiveTab] = useState('sales');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();
  const { session, user, signOut } = useAuth();
  const { isWooConnected, isCheckingConnection, setIsWooConnected, appVersion } = useApp();
  const navigate = useNavigate();

  const handleNotImplemented = (feature) => {
    toast({
      title: "🚧 Funcionalidade não implementada ainda",
      description: `${feature} - mas não se preocupe! Você pode solicitar isso no seu próximo prompt! 🚀`,
      duration: 3000,
    });
  };

  const sidebarItems = [
    { id: 'sales', label: 'Vendas', icon: ClipboardList },
    { id: 'nfce', label: 'NFC-e', icon: FileText },
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'products', label: 'Produtos', icon: ShoppingCart },
    { id: 'customers', label: 'Clientes', icon: Users },
    { id: 'company', label: 'Empresa', icon: Building },
    { id: 'certificate', label: 'Certificado', icon: Lock },
    { id: 'sefaz', label: 'SEFAZ', icon: Shield },
    { id: 'techResp', label: 'Resp. Técnico', icon: UserCheck },
    { id: 'woocommerce', label: 'WooCommerce', icon: Globe },
    { id: 'reports', label: 'Relatórios', icon: BarChart3 },
    { id: 'logs', label: 'Logs', icon: Database },
    { id: 'help', label: 'Ajuda', icon: HelpCircle },
    { id: 'versions', label: 'Versões', icon: History }
  ];

  const renderContent = () => {
    if (isCheckingConnection) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="ml-4 text-slate-600">Verificando conexão com a loja...</p>
            </div>
        );
    }

    const commonProps = { handleNotImplemented, isWooConnected, onWooConnectionChange: setIsWooConnected, setActiveTab, isSupabaseConnected: !!session };
    switch (activeTab) {
      case 'sales': return <Sales {...commonProps} />;
      case 'nfce': return <Nfce {...commonProps} />;
      case 'dashboard': return <Dashboard {...commonProps} />;
      case 'products': return <Products {...commonProps} />;
      case 'customers': return <Customers {...commonProps} />;
      case 'company': return <CompanySettings {...commonProps} />;
      case 'certificate': return <CertificateSettings {...commonProps} />;
      case 'sefaz': return <SefazSettings {...commonProps} />;
      case 'techResp': return <TechRespSettings {...commonProps} />;
      case 'woocommerce': return <WooCommerceSettings {...commonProps} />;
      case 'reports': return <Reports {...commonProps} />;
      case 'logs': return <Logs {...commonProps} />;
      case 'help': return <Help {...commonProps} />;
      case 'versions': return <Versions {...commonProps} />;
      default: return <Sales {...commonProps} />;
    }
  };
  
  const goHome = () => setActiveTab('sales');

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 text-sm">
      <Helmet>
        <title>App | NFC-e Plus</title>
        <meta name="description" content="Painel de controle para emissão automática de NFC-e integrado ao WordPress/WooCommerce." />
      </Helmet>

      <header className="glass-effect border-b border-white/20 sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden">
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center space-x-3 cursor-pointer" onClick={goHome}>
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
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`sidebar-item w-full ${activeTab === item.id ? 'active' : ''}`}
                    >
                      <item.icon className="w-5 h-5 mr-3" />
                      {item.label}
                    </button>
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
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderContent()}
          </motion.div>
        </main>
      </div>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}

export default App;