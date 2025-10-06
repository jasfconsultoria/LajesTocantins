"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Search, PlusCircle, Edit, Trash2, ClipboardList, ChevronLeft, ChevronRight, CheckCircle, Clock, ArrowUp, ArrowDown, FileText, CheckSquare } from 'lucide-react'; // Added FileText and CheckSquare
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { logAction } from '@/lib/log';
import { normalizeCnpj, normalizeString, capitalizeFirstLetter } from '@/lib/utils';

const BudgetList = () => {
    const { handleNotImplemented } = useOutletContext();
    const { user: currentUser, activeCompany } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [budgets, setBudgets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortColumn, setSortColumn] = useState('data_orcamento');
    const [sortDirection, setSortDirection] = useState('desc');

    const ITEMS_PER_PAGE = 10;

    const fetchBudgets = useCallback(async () => {
        if (!activeCompany?.cnpj) {
            setBudgets([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            let allBudgets = [];
            let offset = 0;
            const limit = 1000;

            while (true) {
                const { data, error } = await supabase
                    .from('orcamento_summary_view')
                    .select('*')
                    .eq('cnpj_empresa', normalizeCnpj(activeCompany.cnpj))
                    .order('data_orcamento', { ascending: false })
                    .range(offset, offset + limit - 1);

                if (error) throw error;

                if (data && data.length > 0) {
                    allBudgets = allBudgets.concat(data);
                    offset += data.length;
                    if (data.length < limit) {
                        break;
                    }
                } else {
                    break;
                }
            }
            setBudgets(allBudgets);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao carregar orçamentos",
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    }, [activeCompany?.cnpj, toast]);

    useEffect(() => {
        fetchBudgets();
    }, [fetchBudgets]);

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
        setCurrentPage(1);
    };

    const renderSortIcon = (column) => {
        if (sortColumn === column) {
            return sortDirection === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
        }
        return null;
    };

    const sortedAndFilteredBudgets = useMemo(() => {
        const normalizedSearchTerm = normalizeString(searchTerm);

        let currentFilteredBudgets = budgets;

        if (normalizedSearchTerm) {
            currentFilteredBudgets = budgets.filter(b => {
                const normalizedNomeCliente = normalizeString(b.nome_cliente);
                const normalizedNumeroPedido = normalizeString(b.numero_pedido);
                const normalizedVendedor = normalizeString(b.vendedor);
                const normalizedStatus = normalizeString(b.status_orcamento); // Include new status in search

                return (
                    normalizedNomeCliente.includes(normalizedSearchTerm) ||
                    normalizedNumeroPedido.includes(normalizedSearchTerm) ||
                    normalizedVendedor.includes(normalizedSearchTerm) ||
                    normalizedStatus.includes(normalizedSearchTerm)
                );
            });
        }

        return [...currentFilteredBudgets].sort((a, b) => {
            let aValue, bValue;

            switch (sortColumn) {
                case 'numero_pedido':
                case 'nome_cliente':
                case 'vendedor':
                case 'status_orcamento': // Sort by new status field
                    aValue = normalizeString(a[sortColumn] || '');
                    bValue = normalizeString(b[sortColumn] || '');
                    break;
                case 'data_orcamento':
                    aValue = new Date(a.data_orcamento).getTime();
                    bValue = new Date(b.data_orcamento).getTime();
                    break;
                case 'total_do_pedido_calculado':
                case 'total_desconto_itens':
                case 'total_liquido_calculado':
                    aValue = a[sortColumn] || 0;
                    bValue = b[sortColumn] || 0;
                    break;
                default:
                    aValue = normalizeString(a[sortColumn] || '');
                    bValue = normalizeString(b[sortColumn] || '');
            }

            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [budgets, searchTerm, sortColumn, sortDirection]);

    const paginatedBudgets = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return sortedAndFilteredBudgets.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [sortedAndFilteredBudgets, currentPage]);

    const totalPages = Math.ceil(sortedAndFilteredBudgets.length / ITEMS_PER_PAGE);

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const handleDeleteBudget = async (budgetId, budgetNumber) => {
        if (!window.confirm(`Tem certeza que deseja excluir o orçamento "${budgetNumber}"?`)) {
            return;
        }
        try {
            const { error: deleteCompositionsError } = await supabase
                .from('orcamento_composicao')
                .delete()
                .eq('orcamento_id', budgetId);

            if (deleteCompositionsError) throw deleteCompositionsError;

            const { error: deleteBudgetError } = await supabase
                .from('orcamento')
                .delete()
                .eq('id', budgetId);

            if (deleteBudgetError) throw deleteBudgetError;

            toast({ title: 'Orçamento excluído!', description: `"${budgetNumber}" foi removido(a) com sucesso.` });
            if (currentUser) {
                await logAction(currentUser.id, 'budget_delete', `Orçamento "${budgetNumber}" (ID: ${budgetId}) excluído.`, activeCompany?.id, null);
            }
            fetchBudgets();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao excluir', description: error.message });
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'faturado':
                return (
                    <span className="status-badge bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" /> {capitalizeFirstLetter(status)}
                    </span>
                );
            case 'aprovado':
                return (
                    <span className="status-badge bg-blue-100 text-blue-800">
                        <CheckSquare className="w-3 h-3 mr-1" /> {capitalizeFirstLetter(status)}
                    </span>
                );
            case 'nf_e_emitida':
                return (
                    <span className="status-badge bg-purple-100 text-purple-800">
                        <FileText className="w-3 h-3 mr-1" /> NF-e Emitida
                    </span>
                );
            case 'cancelado':
                return (
                    <span className="status-badge bg-red-100 text-red-800">
                        <XCircle className="w-3 h-3 mr-1" /> {capitalizeFirstLetter(status)}
                    </span>
                );
            case 'alterado':
                return (
                    <span className="status-badge bg-orange-100 text-orange-800">
                        <Edit className="w-3 h-3 mr-1" /> {capitalizeFirstLetter(status)}
                    </span>
                );
            case 'pre_orcamento':
                return (
                    <span className="status-badge bg-gray-100 text-gray-800">
                        <ClipboardList className="w-3 h-3 mr-1" /> Pré-Orçamento
                    </span>
                );
            case 'pendente':
            default:
                return (
                    <span className="status-badge bg-yellow-100 text-yellow-800">
                        <Clock className="w-3 h-3 mr-1" /> {capitalizeFirstLetter(status)}
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold gradient-text flex items-center gap-2">
                        <ClipboardList className="w-8 h-8" />
                        Lista de Orçamentos
                    </h1>
                    <p className="text-slate-600 mt-2">Gerencie os orçamentos e pedidos da sua empresa.</p>
                </div>
                <Button 
                    onClick={() => navigate('/app/budgets/new')} 
                    className="save-button"
                >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Novo Orçamento
                </Button>
            </div>

            <div className="bg-white/80 p-4 rounded-xl shadow-sm border border-white">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                        type="text"
                        placeholder="Buscar por cliente, número do pedido, vendedor ou status..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>
            </div>
            
            {loading ? (
                 <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
            ) : !activeCompany?.cnpj ? (
                <div className="flex flex-col items-center justify-center h-64 text-center bg-white/80 rounded-xl shadow-sm border border-white p-8">
                    <ClipboardList className="w-16 h-16 text-blue-500 mb-4" />
                    <h2 className="text-2xl font-bold text-slate-800">Nenhuma Empresa Ativa</h2>
                    <p className="text-slate-600">Selecione uma empresa para visualizar e gerenciar seus orçamentos.</p>
                </div>
            ) : (
                <>
                    <div className="data-table-container">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="cursor-pointer" onClick={() => handleSort('numero_pedido')}>
                                        <div className="flex items-center">Nº Pedido {renderSortIcon('numero_pedido')}</div>
                                    </TableHead>
                                    <TableHead className="cursor-pointer" onClick={() => handleSort('data_orcamento')}>
                                        <div className="flex items-center">Data {renderSortIcon('data_orcamento')}</div>
                                    </TableHead>
                                    <TableHead className="cursor-pointer" onClick={() => handleSort('nome_cliente')}>
                                        <div className="flex items-center">Cliente {renderSortIcon('nome_cliente')}</div>
                                    </TableHead>
                                    <TableHead className="cursor-pointer" onClick={() => handleSort('vendedor')}>
                                        <div className="flex items-center">Vendedor {renderSortIcon('vendedor')}</div>
                                    </TableHead>
                                    <TableHead className="text-right cursor-pointer" onClick={() => handleSort('total_do_pedido_calculado')}>
                                        <div className="flex items-center justify-end">Total R$ {renderSortIcon('total_do_pedido_calculado')}</div>
                                    </TableHead>
                                    <TableHead className="text-right cursor-pointer" onClick={() => handleSort('total_desconto_itens')}>
                                        <div className="flex items-center justify-end">Desconto R$ {renderSortIcon('total_desconto_itens')}</div>
                                    </TableHead>
                                    <TableHead className="text-right cursor-pointer" onClick={() => handleSort('total_liquido_calculado')}>
                                        <div className="flex items-center justify-end">Líquido R$ {renderSortIcon('total_liquido_calculado')}</div>
                                    </TableHead>
                                    <TableHead className="cursor-pointer" onClick={() => handleSort('status_orcamento')}>
                                        <div className="flex items-center justify-end">Status {renderSortIcon('status_orcamento')}</div>
                                    </TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedBudgets.map((b) => (
                                    <TableRow key={b.id}>
                                        <TableCell className="font-medium">{b.numero_pedido || 'N/A'}</TableCell>
                                        <TableCell>{formatDate(b.data_orcamento)}</TableCell>
                                        <TableCell>{b.nome_cliente || 'Cliente Não Informado'}</TableCell>
                                        <TableCell>{b.vendedor || 'N/A'}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(b.total_do_pedido_calculado)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(b.total_desconto_itens)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(b.total_liquido_calculado)}</TableCell>
                                        <TableCell className="text-right">
                                            {getStatusBadge(b.status_orcamento)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => navigate(`/app/budgets/${b.id}/edit`)}>
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteBudget(b.id, b.numero_pedido || b.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex justify-between items-center text-sm text-slate-600 mt-4">
                        <div>
                            Exibindo {paginatedBudgets.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-
                            {Math.min(currentPage * ITEMS_PER_PAGE, sortedAndFilteredBudgets.length)} de {sortedAndFilteredBudgets.length} registros
                        </div>
                        <div className="flex items-center gap-2">
                            <span>Página {currentPage} de {totalPages}</span>
                            <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage === 1}>
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Anterior
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages}>
                                Próximo
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default BudgetList;