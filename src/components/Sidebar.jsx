import React from 'react';
import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import '@/components/ui/sidebar.css'; // Importa os estilos personalizados

const Sidebar = ({ isOpen, sidebarItems, handleSignOut, appVersion, closeSidebar }) => {
  return (
    <motion.aside
      initial={{ x: '-100%' }}
      animate={{ x: isOpen ? '0%' : '-100%' }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      // Classes Tailwind para posicionamento fixo e largura, combinadas com a classe 'sidebar' do CSS
      className={`sidebar fixed inset-y-0 left-0 z-30 w-64 glass-effect border-r border-white/20`}
    >
      <div className="flex flex-col h-full">
        <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {sidebarItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/app'}
              onClick={closeSidebar}
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
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
  );
};

export default Sidebar;