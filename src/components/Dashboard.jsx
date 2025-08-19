import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Hand } from 'lucide-react';

const Dashboard = () => {
    const { user } = useAuth();

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold gradient-text">Dashboard</h1>
                <p className="text-slate-600 mt-2">Bem-vindo ao seu painel de controle.</p>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/80 p-8 rounded-xl shadow-sm border border-white text-center"
            >
                <Hand className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-slate-800">
                    Olá, {user?.email}!
                </h2>
                <p className="text-slate-600 mt-2">
                    Selecione uma opção no menu ao lado para começar a configurar seu sistema de emissão de NFC-e.
                </p>
            </motion.div>
        </div>
    );
};

export default Dashboard;