"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Search, PlusCircle, Edit, Trash2, ClipboardList, ChevronLeft, ChevronRight, CheckCircle, Clock, ArrowUp, ArrowDown } from 'lucide-react';
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
import { normalizeCnpj } from '@/lib/utils'; // Importar a função de normalização

// Helper function for normalization (moved outside component)
const normalizeString = (str) => {
    if (typeof str !== 'string') return '';
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

const BudgetList = () => {
    const { handleNotImplemented } = useOutletContext();
    const { user: currentUser, activeCompany } = useAuth(); // Get activeCompany from useAuth
    const { toast } = useToast();
    const navigate = useNavigate();
    const [budgets, setBudgets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortColumn, setSortColumn] = useState('data_orcamento'); // Default sort by date
    const [sortDirection, setSortDirection] = useState('desc'); // Default sort descending

    const ITEMS_PER_PAGE = 10;

    const fetchBudgets = useCallback(async () => {
        if (!activeCompany?.cnpj) { // Use activeCompany.cnpj for filtering
            setBudgets([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            let allBudgets = [];
            let offset = 0;
            const limit = 1000; // Supabase/PostgREST default limit

            while (true) {
                const { data, error } = await supabase
                    .from('orcamento')
                    .select('*')
                    .eq('cnpj_empresa', normalizeCnpj(activeCompany.cnpj)) // Normaliza o CNPJ aqui
                    .order('data_orcamento', { ascending: false }) // Keep initial order for fetching
                    .range(offset, offset + limit - 1);

                if (error) throw error;

                if (data && data.length > 0) {
                    allBudgets = allBudgets.concat(data);
                    offset += data.length;
                    if (data.length < limit) {
                        break; // No more data
                    }
                } else {
                    break; // No data or no more data
                }
            }

            // Now, for each budget, fetch its compositions to calculate totals
            // WARNING: This can be inefficient for a large number of budgets (N+1 queries).
            // For better performance, consider a Supabase function or database view to pre-calculate these totals.
            const budgetsWithCalculatedTotals = await Promise.all(allBudgets.map(async (budget) => {
                const { data: compositionsData, error: compError } = await supabase
                    .from('orcamento_composicao')
                    .select('quantidade, valor_venda, desconto_total')
                    .eq('orcamento_id', budget.id);

                if (compError) {
                    console.error(`Error fetching compositions for budget ${budget.id}:`, compError.message);
                    return { ...budget, totalBrutoItens: 0, totalDescontoItens: 0, totalLiquidoCalculated: budget.total_venda };
                }

                const totalBrutoItens = compositionsData.reduce((sum, item) => sum + (item.quantidade * item.valor_venda), 0);
                const totalDescontoItens = compositionsData.reduce((sum, item) => sum + (item.desconto_total || 0), 0);
                
                // Total Líq. do Pedido R$ = Total Bruto dos Itens - Total Desconto dos Itens
                const totalLiquidoCalculated = totalBrutoItens - totalDescontoItens;

                return {
                    ...budget,
                    totalBrutoItens,
                    totalDescontoItens,
                    totalLiquidoCalculated,
                };
            }));

            setBudgets(budgetsWithCalculatedTotals);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao carregar orçamentos",
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    }, [activeCompany?.cnpj, toast]); // Depend on activeCompany.cnpj

    useEffect(() => {
        fetchBudgets();
    }, [fetchBudgets]);

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc'); // Default to asc when changing column
        }
        setCurrentPage(1); // Reset to first page on sort change
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

        // 1. Aplicar filtragem se houver termo de busca
        if (normalizedSearchTerm) {
            currentFilteredBudgets = budgets.filter(b => {
                const normalizedNomeCliente = normalizeString(b.nome_cliente);
                const normalizedNumeroPedido = normalizeString(b.numero_pedido);
                const normalizedVendedor = normalizeString(b.vendedor);

                return (
                    normalizedNomeCliente.includes(normalizedSearchTerm) ||
                    normalizedNumeroPedido.includes(normalizedSearchTerm) ||
                    normalizedVendedor.includes(normalizedSearchTerm)
                );
            });
        }

        // 2. Aplicar ordenação aos resultados filtrados (ou à lista completa se não houver busca)
        return [...currentFilteredBudgets].sort((a, b) => { // Cria uma cópia para não modificar o array original
            let aValue, bValue;

            switch (sortColumn) {
                case 'numero_pedido':
                case 'nome_cliente':
                case 'vendedor':
                    aValue = normalizeString(a[sortColumn] || '');
                    bValue = normalizeString(b[sortColumn] || '');
                    break;
                case 'data_orcamento':
                    aValue = new Date(a.data_orcamento).getTime();
                    bValue = new Date(b.data_orcamento).getTime();
                    break;
                case 'totalBrutoItens':
                case 'totalDescontoItens':
                case 'totalLiquidoCalculated':
                    aValue = a[sortColumn] || 0;
                    bValue = b[sortColumn] || 0;
                    break;
                case 'faturado':
                    aValue = a.faturado ? 1 : 0;
                    bValue = b.faturado ? 1 : 0;
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
            // First delete compositions related to the budget
            const { error: deleteCompositionsError } = await supabase
                .from('orcamento_composicao')
                .delete()
                .eq('orcamento_id', budgetId);

            if (deleteCompositionsError) throw deleteCompositionsError;

            // Then delete the budget itself
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

    return (
        <div className="space-y-6"> {/* Este é o elemento raiz consistente */}
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
                        placeholder="Buscar por cliente, número do pedido ou vendedor..."
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
            ) : !activeCompany?.cnpj ? ( // Esta condição agora renderiza DENTRO do elemento raiz
                <div className="flex flex-col items-center justify-center h-64 text-center bg-white/80 rounded-xl shadow-sm border border-white p-8">
                    <ClipboardList className="w-16 h-16 text-blue-500 mb-4" />
                    <h2 className="text-2xl font-bold text-slate-800">Nenhuma Empresa Ativa</h2>
                    <p className="text-slate-600">Selecione uma empresa para visualizar e gerenciar seus orçamentos.</p>
                </div>
            ) : (
                <> {/* Fragmento para o conteúdo real quando activeCompany.cnpj está presente */}
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
                                    <TableHead className="text-right cursor-pointer" onClick={() => handleSort('totalBrutoItens')}>
                                        <div className="flex items-center justify-end">Total R$ {renderSortIcon('totalBrutoItens')}</div>
                                    </TableHead>
                                    <TableHead className="text-right cursor-pointer" onClick={() => handleSort('totalDescontoItens')}>
                                        <div className="flex items-center justify-end">Desconto R$ {renderSortIcon('totalDescontoItens')}</div>
                                    </TableHead>
                                    <TableHead className="text-right cursor-pointer" onClick={() => handleSort('totalLiquidoCalculated')}>
                                        <div className="flex items-center justify-end">Líquido R$ {renderSortIcon('totalLiquidoCalculated')}</div>
                                    </TableHead>
                                    <TableHead className="cursor-pointer" onClick={() => handleSort('faturado')}>
                                        <div className="flex items-center justify-end">Status {renderSortIcon('faturado')}</div>
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
                                        <TableCell className="text-right">{formatCurrency(b.totalBrutoItens)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(b.totalDescontoItens)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(b.totalLiquidoCalculated)}</TableCell>
                                        <TableCell className="text-right">
                                            {b.faturado ? (
                                                <span className="status-badge bg-green-100 text-green-800">
                                                    <CheckCircle className="w-3 h-3 mr-1" /> Faturado
                                                </span>
                                            ) : (
                                                <span className="status-badge bg-yellow-100 text-yellow-800">
                                                    <Clock className="w-3 h-3 mr-1" /> Pendente
                                                </span>
                                            )}
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