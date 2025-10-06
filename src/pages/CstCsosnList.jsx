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

const CstCsosnList = () => {
    const { handleNotImplemented, activeCompanyId } = useOutletContext();
    const { user: currentUser } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [cstCsosnEntries, setCstCsosnEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortColumn, setSortColumn] = useState('cst_csosn');
    const [sortDirection, setSortDirection] = useState('asc');

    const ITEMS_PER_PAGE = 10;

    const fetchCstCsosnEntries = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('cst_csosn')
                .select('*')
                .order(sortColumn, { ascending: sortDirection === 'asc' });
            
            if (error) throw error;
            setCstCsosnEntries(data);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao carregar CST/CSOSN",
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    }, [toast, sortColumn, sortDirection]);

    useEffect(() => {
        fetchCstCsosnEntries();
    }, [fetchCstCsosnEntries]);

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

    const sortedAndFilteredCstCsosnEntries = useMemo(() => {
        const normalizedSearchTerm = normalizeString(searchTerm);

        let currentFilteredEntries = cstCsosnEntries;

        if (normalizedSearchTerm) {
            currentFilteredEntries = cstCsosnEntries.filter(entry => {
                const normalizedCstCsosn = normalizeString(entry.cst_csosn || '');
                const normalizedDescricao = normalizeString(entry.descricao || '');
                const normalizedOrigem = normalizeString(entry.origem || '');
                const normalizedResumo = normalizeString(entry.resumo || '');
                return normalizedCstCsosn.includes(normalizedSearchTerm) ||
                       normalizedDescricao.includes(normalizedSearchTerm) ||
                       normalizedOrigem.includes(normalizedSearchTerm) ||
                       normalizedResumo.includes(normalizedSearchTerm);
            });
        }

        return currentFilteredEntries;
    }, [cstCsosnEntries, searchTerm]);

    const paginatedCstCsosnEntries = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return sortedAndFilteredCstCsosnEntries.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [sortedAndFilteredCstCsosnEntries, currentPage]);

    const totalPages = Math.ceil(sortedAndFilteredCstCsosnEntries.length / ITEMS_PER_PAGE);

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const handleDeleteCstCsosn = async (id, cstCsosnCode) => {
        if (!window.confirm(`Tem certeza que deseja excluir o CST/CSOSN "${cstCsosnCode}"?`)) {
            return;
        }
        try {
            const { error } = await supabase
                .from('cst_csosn')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast({ title: 'CST/CSOSN excluído!', description: `"${cstCsosnCode}" foi removido(a) com sucesso.` });
            if (currentUser) {
                await logAction(currentUser.id, 'cst_csosn_delete', `CST/CSOSN "${cstCsosnCode}" (ID: ${id}) excluído.`, null, null);
            }
            fetchCstCsosnEntries();
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
                        Cadastro de CST/CSOSN
                    </h1>
                    <p className="text-slate-600 mt-2">Gerencie os Códigos de Situação Tributária e Códigos de Situação da Operação no Simples Nacional.</p>
                </div>
                <Button 
                    onClick={() => navigate('/app/notas/cst/new')} 
                    className="save-button"
                >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Novo CST/CSOSN
                </Button>
            </div>

            <div className="bg-white/80 p-4 rounded-xl shadow-sm border border-white">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                        type="text"
                        placeholder="Buscar por código, descrição, origem ou resumo..."
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
                                <TableHead className="cursor-pointer" onClick={() => handleSort('cst_csosn')}>
                                    <div className="flex items-center">CST/CSOSN {renderSortIcon('cst_csosn')}</div>
                                </TableHead>
                                <TableHead className="cursor-pointer" onClick={() => handleSort('descricao')}>
                                    <div className="flex items-center">Descrição {renderSortIcon('descricao')}</div>
                                </TableHead>
                                <TableHead className="cursor-pointer" onClick={() => handleSort('origem')}>
                                    <div className="flex items-center">Origem {renderSortIcon('origem')}</div>
                                </TableHead>
                                <TableHead className="cursor-pointer" onClick={() => handleSort('resumo')}>
                                    <div className="flex items-center">Resumo {renderSortIcon('resumo')}</div>
                                </TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedCstCsosnEntries.map((entry) => (
                                <TableRow key={entry.id}>
                                    <TableCell className="font-medium">{entry.cst_csosn}</TableCell>
                                    <TableCell>{entry.descricao}</TableCell>
                                    <TableCell>{entry.origem}</TableCell>
                                    <TableCell>{entry.resumo}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => navigate(`/app/notas/cst/${entry.id}/edit`)}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteCstCsosn(entry.id, entry.cst_csosn)}>
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
                    Exibindo {paginatedCstCsosnEntries.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-
                    {Math.min(currentPage * ITEMS_PER_PAGE, sortedAndFilteredCstCsosnEntries.length)} de {sortedAndFilteredCstCsosnEntries.length} registros
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

export default CstCsosnList;