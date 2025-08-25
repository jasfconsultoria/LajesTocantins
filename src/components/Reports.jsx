import React from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Calendar,
  TrendingUp,
  Users,
  FileText,
  BarChart3,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const Reports = () => {
  const { handleNotImplemented } = useOutletContext();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Relatórios</h1>
        <p className="text-slate-600 mt-2">Análises e relatórios das suas NFC-e emitidas</p>
      </div>

      {/* A seção de stats-grid foi movida para o Dashboard.jsx */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="chart-container">
          <h3 className="chart-title">Faturamento por Período</h3>
          <div className="flex items-center justify-center h-64 text-slate-400">
            <BarChart3 className="w-16 h-16" />
          </div>
        </div>
        <div className="chart-container">
          <h3 className="chart-title">NFC-e por Status</h3>
          <div className="flex items-center justify-center h-64 text-slate-400">
            <TrendingUp className="w-16 h-16" />
          </div>
        </div>
      </div>

      <div className="nfce-card">
        <h3 className="section-title">Relatórios Disponíveis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="feature-card">
            <FileText className="feature-icon" />
            <h4 className="feature-title">Relatório de Vendas</h4>
            <p className="feature-description">Relatório detalhado de todas as vendas e NFC-e emitidas</p>
            <Button 
              onClick={() => handleNotImplemented('Gerar relatório de vendas')}
              className="mt-4 w-full"
            >
              Gerar Relatório
            </Button>
          </div>
          <div className="feature-card">
            <BarChart3 className="feature-icon" />
            <h4 className="feature-title">Análise Fiscal</h4>
            <p className="feature-description">Análise dos impostos e tributos das NFC-e emitidas</p>
            <Button 
              onClick={() => handleNotImplemented('Gerar análise fiscal')}
              className="mt-4 w-full"
            >
              Gerar Análise
            </Button>
          </div>
          <div className="feature-card">
            <Users className="feature-icon" />
            <h4 className="feature-title">Relatório de Clientes</h4>
            <p className="feature-description">Relatório dos clientes e suas compras</p>
            <Button 
              onClick={() => handleNotImplemented('Gerar relatório de clientes')}
              className="mt-4 w-full"
            >
              Gerar Relatório
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;