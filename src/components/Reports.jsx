import React from 'react';
import {
  Calendar,
  TrendingUp,
  Users,
  FileText,
  BarChart3,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const Reports = ({ handleNotImplemented }) => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Relatórios</h1>
        <p className="text-slate-600 mt-2">Análises e relatórios das suas NFC-e emitidas</p>
      </div>

      <div className="stats-grid">
        <div className="metric-card">
          <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-3" />
          <div className="metric-value">R$ 45.230</div>
          <div className="metric-label">Faturamento Mensal</div>
        </div>
        <div className="metric-card">
          <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-3" />
          <div className="metric-value">+12%</div>
          <div className="metric-label">Crescimento</div>
        </div>
        <div className="metric-card">
          <Users className="w-8 h-8 text-purple-600 mx-auto mb-3" />
          <div className="metric-value">847</div>
          <div className="metric-label">Clientes Únicos</div>
        </div>
        <div className="metric-card">
          <FileText className="w-8 h-8 text-orange-600 mx-auto mb-3" />
          <div className="metric-value">R$ 53,45</div>
          <div className="metric-label">Ticket Médio</div>
        </div>
      </div>

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