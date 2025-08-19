import React, { useState, useEffect } from 'react';
import { FileText, Search, Download, Printer, Eye, Trash2, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { getStatusBadge } from '@/lib/utils.jsx';
import { useToast } from '@/components/ui/use-toast';
import { processNfceGeneration } from '@/lib/nfce.js';

const SelectOrder = ({ handleNotImplemented }) => {
    const [orders, setOrders] = useState([]);
    const [selectedOrders, setSelectedOrders] = useState([]);
    const [processingOrders, setProcessingOrders] = useState([]);
    const { toast } = useToast();

    useEffect(() => {
        const mockOrders = [
            { id: 1256, customer: 'Ana Beatriz', date: '2025-07-22', total: 'R$ 250,00', status: 'Processando', nfceStatus: 'not_issued', items: [{name: 'Produto A', qty: 2, price: 'R$ 125,00'}] },
            { id: 1255, customer: 'Carlos Eduardo', date: '2025-07-22', total: 'R$ 99,90', status: 'Processando', nfceStatus: 'not_issued', items: [{name: 'Produto B', qty: 1, price: 'R$ 99,90'}] },
            { id: 1254, customer: 'Daniela Lima', date: '2025-07-21', total: 'R$ 450,00', status: 'Concluído', nfceStatus: 'authorized', items: [{name: 'Produto C', qty: 3, price: 'R$ 150,00'}] },
            { id: 1253, customer: 'Eduardo Martins', date: '2025-07-21', total: 'R$ 120,50', status: 'Processando', nfceStatus: 'rejected', items: [{name: 'Produto D', qty: 1, price: 'R$ 120,50'}] },
            { id: 1252, customer: 'Fernanda Alves', date: '2025-07-20', total: 'R$ 75,00', status: 'Concluído', nfceStatus: 'cancelled', items: [{name: 'Produto E', qty: 1, price: 'R$ 75,00'}] },
            { id: 1251, customer: 'Gabriel Costa', date: '2025-07-20', total: 'R$ 180,00', status: 'Concluído', nfceStatus: 'not_issued', items: [{name: 'Produto F', qty: 2, price: 'R$ 90,00'}] },
        ];
        setOrders(mockOrders);
    }, []);

    const handleGenerateNfce = async (order) => {
        setProcessingOrders(prev => [...prev, order.id]);
        
        const result = await processNfceGeneration(order);
        
        if (result.success) {
            setOrders(prevOrders => prevOrders.map(o => 
                o.id === order.id ? { ...o, nfceStatus: 'authorized' } : o
            ));
            toast({
                title: "✅ Sucesso!",
                description: `NFC-e para o pedido #${order.id} foi autorizada.`,
            });
        } else {
            setOrders(prevOrders => prevOrders.map(o => 
                o.id === order.id ? { ...o, nfceStatus: 'rejected' } : o
            ));
            toast({
                title: "❌ Falha na Emissão",
                description: `Pedido #${order.id}: ${result.message}`,
                variant: 'destructive',
            });
        }

        setProcessingOrders(prev => prev.filter(id => id !== order.id));
    };

    const handleSelectAll = (checked) => {
        if (checked) {
            const allOrderIds = orders.filter(o => o.nfceStatus === 'not_issued').map(order => order.id);
            setSelectedOrders(allOrderIds);
        } else {
            setSelectedOrders([]);
        }
    };

    const handleRowSelect = (orderId) => {
        setSelectedOrders(prev => 
            prev.includes(orderId) 
                ? prev.filter(id => id !== orderId)
                : [...prev, orderId]
        );
    };

    const getOrderStatusBadge = (status) => {
        const baseClasses = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium';
        switch (status.toLowerCase()) {
            case 'processando':
                return `${baseClasses} bg-blue-100 text-blue-800`;
            case 'concluído':
                return `${baseClasses} bg-green-100 text-green-800`;
            case 'pendente':
                return `${baseClasses} bg-yellow-100 text-yellow-800`;
            default:
                return `${baseClasses} bg-gray-100 text-gray-800`;
        }
    };

    const isAllSelected = selectedOrders.length > 0 && selectedOrders.length === orders.filter(o => o.nfceStatus === 'not_issued').length;
    const isIndeterminate = selectedOrders.length > 0 && !isAllSelected;

    return (
        <div className="space-y-6">
            <div className="filter-bar">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Buscar por nº do pedido ou nome do cliente..."
                        className="search-input pl-10"
                    />
                </div>
                {selectedOrders.length > 0 ? (
                     <Button 
                        onClick={() => handleNotImplemented('Gerar NFC-e em Lote')}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg text-white"
                    >
                        <FileText className="w-4 h-4 mr-2" />
                        Gerar {selectedOrders.length} NFC-e em Lote
                    </Button>
                ) : (
                    <Button 
                        onClick={() => {}}
                        variant="outline"
                    >
                        Sincronizar Pedidos
                    </Button>
                )}
            </div>

            <div className="data-table responsive-table">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="table-header">
                            <th className="p-3 w-12 text-center">
                                <Checkbox 
                                    checked={isAllSelected}
                                    onCheckedChange={handleSelectAll}
                                    aria-label="Selecionar todos"
                                    data-state={isIndeterminate ? 'indeterminate' : (isAllSelected ? 'checked' : 'unchecked')}
                                />
                            </th>
                            <th className="text-left p-3">Nº Pedido</th>
                            <th className="text-left p-3">Cliente</th>
                            <th className="text-left p-3">Data</th>
                            <th className="text-left p-3">Total</th>
                            <th className="text-left p-3">Status Pedido</th>
                            <th className="text-left p-3">Status Nota</th>
                            <th className="text-center p-3">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((order) => (
                            <tr key={order.id} className="table-row">
                                <td className="p-3 text-center">
                                    {(order.nfceStatus === 'not_issued' || order.nfceStatus === 'rejected') && !processingOrders.includes(order.id) && (
                                        <Checkbox 
                                            checked={selectedOrders.includes(order.id)}
                                            onCheckedChange={() => handleRowSelect(order.id)}
                                            aria-label={`Selecionar pedido ${order.id}`}
                                        />
                                    )}
                                </td>
                                <td className="p-3 font-mono font-medium">#{order.id}</td>
                                <td className="p-3">{order.customer}</td>
                                <td className="p-3">{order.date}</td>
                                <td className="p-3 font-medium">{order.total}</td>
                                <td className="p-3">
                                    <span className={getOrderStatusBadge(order.status)}>
                                        {order.status}
                                    </span>
                                </td>
                                <td className="p-3">{getStatusBadge(order.nfceStatus)}</td>
                                <td className="p-3 text-center">
                                    {processingOrders.includes(order.id) ? (
                                        <div className="flex items-center justify-center text-blue-600">
                                            <Loader className="w-4 h-4 mr-2 animate-spin" />
                                            <span>Gerando...</span>
                                        </div>
                                    ) : (
                                        <>
                                            {(order.nfceStatus === 'not_issued' || order.nfceStatus === 'rejected') ? (
                                                <Button 
                                                    onClick={() => handleGenerateNfce(order)}
                                                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg text-white"
                                                    size="sm"
                                                >
                                                    <FileText className="w-4 h-4 mr-2" />
                                                    {order.nfceStatus === 'rejected' ? 'Tentar Novamente' : 'Gerar NFC-e'}
                                                </Button>
                                            ) : (
                                                <div className="flex justify-center space-x-1">
                                                    <Button variant="ghost" size="sm" onClick={() => handleNotImplemented('Visualizar NFC-e')}><Eye className="w-4 h-4" /></Button>
                                                    <Button variant="ghost" size="sm" onClick={() => handleNotImplemented('Download XML')}><Download className="w-4 h-4" /></Button>
                                                    <Button variant="ghost" size="sm" onClick={() => handleNotImplemented('Imprimir DANFE')}><Printer className="w-4 h-4" /></Button>
                                                    {order.nfceStatus === 'authorized' && (
                                                        <Button variant="ghost" size="sm" onClick={() => handleNotImplemented('Cancelar NFC-e')}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="pagination">
                <button className="pagination-button">Anterior</button>
                <button className="pagination-button active">1</button>
                <button className="pagination-button">2</button>
                <button className="pagination-button">Próximo</button>
            </div>
        </div>
    );
};

export default SelectOrder;