import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader, FileText, Shield, User, ShoppingCart, DollarSign, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

const StatusIndicator = ({ status, text }) => {
    const getStatusContent = () => {
        switch (status) {
            case 'loading':
                return <><Loader className="w-4 h-4 mr-2 animate-spin" /> {text}...</>;
            case 'success':
                return <><CheckCircle className="w-4 h-4 mr-2 text-green-500" /> {text}</>;
            case 'error':
                return <><XCircle className="w-4 h-4 mr-2 text-red-500" /> {text}</>;
            default:
                return null;
        }
    };
    return <div className="flex items-center text-sm text-slate-600">{getStatusContent()}</div>;
};

const EmitNfce = ({ order, goBack, handleNotImplemented }) => {
    const [certStatus, setCertStatus] = useState('loading');
    const [dataStatus, setDataStatus] = useState('loading');

    useEffect(() => {
        setDataStatus('loading');
        setCertStatus('loading');

        // Simula o carregamento dos dados do pedido
        const dataTimeout = setTimeout(() => {
            setDataStatus('success');
        }, 1000);

        // Simula a verificação do certificado digital
        const certTimeout = setTimeout(() => {
            // Randomly succeed or fail for demonstration
            if (Math.random() > 0.2) {
                setCertStatus('success');
            } else {
                setCertStatus('error');
            }
        }, 2000);

        return () => {
            clearTimeout(dataTimeout);
            clearTimeout(certTimeout);
        };
    }, [order]);

    const isReadyToEmit = certStatus === 'success' && dataStatus === 'success';

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Coluna de Detalhes */}
                <div className="space-y-6">
                    <div className="nfce-card p-6">
                        <h3 className="config-title flex items-center"><User className="w-5 h-5 mr-2" /> Cliente</h3>
                        <div className="mt-4 space-y-1 text-sm">
                            <p><strong className="font-medium text-slate-800">Nome:</strong> {order.customer}</p>
                            <p><strong className="font-medium text-slate-800">CPF:</strong> 123.456.789-00 (Exemplo)</p>
                        </div>
                    </div>
                    <div className="nfce-card p-6">
                        <h3 className="config-title flex items-center"><ShoppingCart className="w-5 h-5 mr-2" /> Itens do Pedido</h3>
                        <ul className="mt-4 space-y-2 text-sm">
                            {order.items.map((item, index) => (
                                <li key={index} className="flex justify-between">
                                    <span>{item.qty}x {item.name}</span>
                                    <span className="font-medium">{item.price}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="border-t border-slate-200 mt-4 pt-4 flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span>{order.total}</span>
                        </div>
                    </div>
                </div>

                {/* Coluna de Ações e Status */}
                <div className="space-y-6">
                    <div className="nfce-card p-6">
                        <h3 className="config-title flex items-center"><FileText className="w-5 h-5 mr-2" /> Resumo da Emissão</h3>
                        <div className="mt-4 space-y-2 text-sm">
                            <p><strong className="font-medium text-slate-800">Nº do Pedido:</strong> #{order.id}</p>
                            <p><strong className="font-medium text-slate-800">Data do Pedido:</strong> {order.date}</p>
                            <p><strong className="font-medium text-slate-800">Valor Total:</strong> <span className="font-bold text-lg text-green-600">{order.total}</span></p>
                        </div>
                    </div>
                    <div className="nfce-card p-6">
                        <h3 className="config-title flex items-center"><Shield className="w-5 h-5 mr-2" /> Status de Preparação</h3>
                        <div className="mt-4 space-y-3">
                            <StatusIndicator status={dataStatus} text="Carregando dados do pedido" />
                            <StatusIndicator status={certStatus} text={certStatus === 'error' ? 'Falha ao validar certificado' : 'Certificado digital verificado'} />
                        </div>
                    </div>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: isReadyToEmit ? 1 : 0.5, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Button
                            onClick={() => handleNotImplemented('Gerar XML e enviar para SEFAZ')}
                            className="w-full save-button text-lg"
                            disabled={!isReadyToEmit}
                        >
                            <Send className="w-5 h-5 mr-3" />
                            {isReadyToEmit ? 'Confirmar e Gerar NFC-e' : 'Aguardando verificação...'}
                        </Button>
                        {certStatus === 'error' && (
                            <p className="text-xs text-red-600 text-center mt-2">
                                Verifique as configurações do seu certificado digital para continuar.
                            </p>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default EmitNfce;