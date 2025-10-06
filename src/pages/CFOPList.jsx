"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Search, PlusCircle, Edit, Trash2, FileText, ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
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
import { normalizeString } from '@/lib/utils';

const CFOPList = () => {
    const { handleNotImplemented } = useOutletContext();
    const { user: currentUser } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [cfops, setCfops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortColumn, setSortColumn] = useState('cfop');
    const [sortDirection, setSortDirection] = useState('asc');

    const ITEMS_PER_PAGE = 10;

    const fetchCfops = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('cfop')
                .select('*, tipo_operacao') // Select tipo_operacao
                .order('cfop', { ascending: true });
            
            if (error) throw error;
            setCfops(data);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao carregar CFOPs",
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchCfops();
    }, [fetchCfops]);

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

    const sortedAndFilteredCfops = useMemo(() => {
        const normalizedSearchTerm = normalizeString(searchTerm);

        let currentFilteredCfops = cfops;

        if (normalizedSearchTerm) {
            currentFilteredCfops = cfops.filter(c => {
                const normalizedCfop = normalizeString(c.cfop || '');
                const normalizedDescricao = normalizeString(c.descricao || '');
                const normalizedTipoOperacao = normalizeString(c.tipo_operacao || ''); // Include in search
                return normalizedCfop.includes(normalizedSearchTerm) || 
                       normalizedDescricao.includes(normalizedSearchTerm) ||
                       normalizedTipoOperacao.includes(normalizedSearchTerm);
            });
        }

        return [...currentFilteredCfops].sort((a, b) => {
            let aValue, bValue;

            switch (sortColumn) {
                case 'cfop':
                case 'descricao':
                case 'tipo_operacao': // Include in sort
                    aValue = normalizeString(a[sortColumn] || '');
                    bValue = normalizeString(b[sortColumn] || '');
                    break;
                default:
                    aValue = normalizeString(a[sortColumn] || '');
                    bValue = normalizeString(b[sortColumn] || '');
            }

            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [cfops, searchTerm, sortColumn, sortDirection]);

    const paginatedCfops = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return sortedAndFilteredCfops.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [sortedAndFilteredCfops, currentPage]);

    const totalPages = Math.ceil(sortedAndFilteredCfops.length / ITEMS_PER_PAGE);

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const handleDeleteCfop = async (cfopCode, cfopDescription) => {
        if (!window.confirm(`Tem certeza que deseja excluir o CFOP "${cfopCode} - ${cfopDescription}"?`)) {
            return;
        }
        try {
            const { error } = await supabase
                .from('cfop')
                .delete()
                .eq('cfop', cfopCode);

            if (error) throw error;

            toast({ title: 'CFOP excluído!', description: `"${cfopCode} - ${cfopDescription}" foi removido(a) com sucesso.` });
            if (currentUser) {
                await logAction(currentUser.id, 'cfop_delete', `CFOP "${cfopCode} - ${cfopDescription}" excluído.`, null, null);
            }
            fetchCfops();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao excluir', description: error.message });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold gradient-text flex items-center gap-2">
                        <FileText className="w-8 h-8" />
                        Cadastro de CFOPs
                    </h1>
                    <p className="text-slate-600 mt-2">Gerencie os Códigos Fiscais de Operações e Prestações.</p>
                </div>
                <Button 
                    onClick={() => navigate('/app/notas/cfop/new')} 
                    className="save-button"
                >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Novo CFOP
                </Button>
            </div>

            <div className="bg-white/80 p-4 rounded-xl shadow-sm border border-white">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                        type="text"
                        placeholder="Buscar por CFOP, descrição ou tipo de operação..."
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
                                <TableHead className="cursor-pointer" onClick={() => handleSort('cfop')}>
                                    <div className="flex items-center">CFOP {renderSortIcon('cfop')}</div>
                                </TableHead>
                                <TableHead className="cursor-pointer" onClick={() => handleSort('descricao')}>
                                    <div className="flex items-center">Descrição {renderSortIcon('descricao')}</div>
                                </TableHead>
                                <TableHead className="cursor-pointer" onClick={() => handleSort('tipo_operacao')}>
                                    <div className="flex items-center">Tipo de Operação {renderSortIcon('tipo_operacao')}</div>
                                </TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedCfops.map((c) => (
                                <TableRow key={c.cfop}>
                                    <TableCell className="font-medium">{c.cfop}</TableCell>
                                    <TableCell>{c.descricao}</TableCell>
                                    <TableCell>{c.tipo_operacao}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => navigate(`/app/notas/cfop/${c.cfop}/edit`)}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteCfop(c.cfop, c.descricao)}>
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
                    Exibindo {paginatedCfops.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-
                    {Math.min(currentPage * ITEMS_PER_PAGE, sortedAndFilteredCfops.length)} de {sortedAndFilteredCfops.length} registros
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

export default CFOPList;