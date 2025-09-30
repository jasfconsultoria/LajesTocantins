import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut, ChevronDown, ChevronRight } from 'lucide-react';
import '@/components/ui/sidebar.css'; // Importa os estilos personalizados

const Sidebar = ({ sidebarItems, handleSignOut, appVersion, closeSidebar, user, role }) => {
  const [expandedCategories, setExpandedCategories] = useState({});

  const toggleCategory = (label) => {
    setExpandedCategories(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  return (
    <div className="flex flex-col h-full w-64"> {/* Fixed width for internal content */}
      {/* Sidebar Header with Logo */}
      <div className="flex items-center p-4 border-b border-white/20">
        <img src="/lajes-tocantins-logo.jpg" alt="Lajes Tocantins Logo" className="h-10 mr-3" />
        <span className="text-lg font-semibold text-white whitespace-nowrap">Lajes Tocantins</span>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {sidebarItems.map((item, index) => (
          item.type === 'category' ? (
            <div key={item.label || index}>
              <button
                onClick={() => toggleCategory(item.label)}
                className="flex items-center justify-between w-full text-slate-400 text-xs font-semibold uppercase mt-4 mb-2 px-3 py-1 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
              >
                <div className="flex items-center">
                  {item.icon && <item.icon className="w-4 h-4 mr-2" />}
                  {item.label}
                </div>
                {expandedCategories[item.label] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {expandedCategories[item.label] && item.subItems && (
                <div className="ml-4 space-y-1">
                  {item.subItems.map(subItem => (
                    <NavLink
                      key={subItem.to}
                      to={subItem.to}
                      end={subItem.to === '/app'}
                      onClick={closeSidebar}
                      className={({ isActive }) => `sidebar-item text-sm ${isActive ? 'active' : ''}`}
                    >
                      <subItem.icon className="w-5 h-5 mr-3" />
                      {subItem.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ) : (
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
          )
        ))}
      </div>
      
      {/* Footer */}
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
  );
};

export default Sidebar;