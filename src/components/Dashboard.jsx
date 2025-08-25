import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Hand, Calendar, TrendingUp, Users, FileText } from 'lucide-react'; // Importar ícones necessários

const Dashboard = () => {
    const { user } = useAuth();

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold gradient-text">Dashboard</h1>
                <p className="text-slate-600 mt-2">Bem-vindo ao seu painel de controle.</p>
            </div>

            {/* Removido o bloco de boas-vindas conforme solicitado */}

            {/* Novos cards de métricas */}
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
        </div>
    );
};

export default Dashboard;