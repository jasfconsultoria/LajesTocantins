import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Search, PlusCircle, Edit, Trash2, ClipboardList, ChevronLeft, ChevronRight, CheckCircle, Clock } from 'lucide-react';
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

// Helper function for normalization (moved outside component)
const normalizeString = (str) => {
    if (typeof str !== 'string') return '';
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

const BudgetList = () => {
    const { handleNotImplemented, activeCompanyId } = useOutletContext();
    const { user: currentUser } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [budgets, setBudgets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const ITEMS_PER_PAGE = 10;

    const fetchBudgets = useCallback(async () => {
        if (!activeCompanyId) {
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
                    .eq('cnpj_empresa', activeCompanyId) // Filter by active company
                    .order('data_orcamento', { ascending: false })
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

            // Sort after fetching all data
            const sortedBudgets = allBudgets.sort((a, b) => {
                const dateA = new Date(a.data_orcamento);
                const dateB = new Date(b.data_orcamento);
                return dateB.getTime() - dateA.getTime(); // Most recent first
            });

            setBudgets(sortedBudgets);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao carregar orçamentos",
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    }, [activeCompanyId, toast]);

    useEffect(() => {
        fetchBudgets();
    }, [fetchBudgets]);

    const filteredBudgets = useMemo(() => {
        const normalizedSearchTerm = normalizeString(searchTerm);

        return budgets.filter(b => {
            const normalizedNomeCliente = normalizeString(b.nome_cliente);
            const normalizedNumeroPedido = normalizeString(b.numero_pedido);
            const normalizedVendedor = normalizeString(b.vendedor);

            return (
                normalizedNomeCliente.includes(normalizedSearchTerm) ||
                normalizedNumeroPedido.includes(normalizedSearchTerm) ||
                normalizedVendedor.includes(normalizedSearchTerm)
            );
        });
    }, [budgets, searchTerm]);

    const paginatedBudgets = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredBudgets.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredBudgets, currentPage]);

    const totalPages = Math.ceil(filteredBudgets.length / ITEMS_PER_PAGE);

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
                await logAction(currentUser.id, 'budget_delete', `Orçamento "${budgetNumber}" (ID: ${budgetId}) excluído.`, activeCompanyId, null);
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

    if (!activeCompanyId) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center bg-white/80 rounded-xl shadow-sm border border-white p-8">
                <ClipboardList className="w-16 h-16 text-blue-500 mb-4" />
                <h2 className="text-2xl font-bold text-slate-800">Nenhuma Empresa Ativa</h2>
                <p className="text-slate-600">Selecione uma empresa para visualizar e gerenciar seus orçamentos.</p>
            </div>
        );
    }

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
            ) : (
                <div className="data-table-container">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nº Pedido</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead>Vendedor</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedBudgets.map((b) => (
                                <TableRow key={b.id}>
                                    <TableCell className="font-medium">{b.numero_pedido || 'N/A'}</TableCell>
                                    <TableCell>{b.nome_cliente || 'Cliente Não Informado'}</TableCell>
                                    <TableCell>{formatDate(b.data_orcamento)}</TableCell>
                                    <TableCell>{b.vendedor || 'N/A'}</TableCell>
                                    <TableCell>{formatCurrency(b.total_venda)}</TableCell>
                                    <TableCell>
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
            )}

            <div className="flex justify-between items-center text-sm text-slate-600 mt-4">
                <div>
                    Exibindo {paginatedBudgets.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredBudgets.length)} de {filteredBudgets.length} registros
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
        </div>
    );
};

export default BudgetList;