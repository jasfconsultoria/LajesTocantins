"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Search, PlusCircle, Edit, Trash2, Percent, ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
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

const IcmsAliquotaList = () => {
    const { handleNotImplemented, activeCompanyId } = useOutletContext();
    const { user: currentUser, activeCompany } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [aliquotas, setAliquotas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortColumn, setSortColumn] = useState('uf_origem');
    const [sortDirection, setSortDirection] = useState('asc');

    const ITEMS_PER_PAGE = 10;

    const fetchAliquotas = useCallback(async () => {
        if (!activeCompany?.cnpj) {
            setAliquotas([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('aliquota_icms') // Corrected table name
                .select('*')
                .eq('cnpj_empresa', activeCompany.cnpj)
                .order(sortColumn, { ascending: sortDirection === 'asc' });
            
            if (error) throw error;
            setAliquotas(data);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao carregar alíquotas",
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    }, [activeCompany?.cnpj, toast, sortColumn, sortDirection]);

    useEffect(() => {
        fetchAliquotas();
    }, [fetchAliquotas]);

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

    const sortedAndFilteredAliquotas = useMemo(() => {
        const normalizedSearchTerm = normalizeString(searchTerm);

        let currentFilteredAliquotas = aliquotas;

        if (normalizedSearchTerm) {
            currentFilteredAliquotas = aliquotas.filter(a => {
                const normalizedUfOrigem = normalizeString(a.uf_origem || '');
                const normalizedUfDestino = normalizeString(a.uf_destino || '');
                return normalizedUfOrigem.includes(normalizedSearchTerm) || normalizedUfDestino.includes(normalizedSearchTerm);
            });
        }

        // Sorting is already handled by fetchAliquotas, but we keep this for consistency if client-side sorting was needed
        return currentFilteredAliquotas;
    }, [aliquotas, searchTerm]);

    const paginatedAliquotas = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return sortedAndFilteredAliquotas.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [sortedAndFilteredAliquotas, currentPage]);

    const totalPages = Math.ceil(sortedAndFilteredAliquotas.length / ITEMS_PER_PAGE);

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const handleDeleteAliquota = async (id, ufOrigem, ufDestino) => {
        if (!window.confirm(`Tem certeza que deseja excluir a alíquota de ${ufOrigem} para ${ufDestino}?`)) {
            return;
        }
        try {
            const { error } = await supabase
                .from('aliquota_icms') // Corrected table name
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast({ title: 'Alíquota excluída!', description: `A alíquota de ${ufOrigem} para ${ufDestino} foi removida com sucesso.` });
            if (currentUser) {
                await logAction(currentUser.id, 'icms_aliquota_delete', `Alíquota ICMS (ID: ${id}) de ${ufOrigem} para ${ufDestino} excluída.`, activeCompanyId, null);
            }
            fetchAliquotas();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao excluir', description: error.message });
        }
    };

    if (!activeCompany?.cnpj) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center bg-white/80 rounded-xl shadow-sm border border-white p-8">
                <Percent className="w-16 h-16 text-blue-500 mb-4" />
                <h2 className="text-2xl font-bold text-slate-800">Nenhuma Empresa Ativa</h2>
                <p className="text-slate-600">Selecione uma empresa para visualizar e gerenciar suas alíquotas ICMS.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold gradient-text flex items-center gap-2">
                        <Percent className="w-8 h-8" />
                        Alíquotas ICMS Interestadual
                    </h1>
                    <p className="text-slate-600 mt-2">Gerencie as alíquotas de ICMS e FCP para operações entre estados.</p>
                </div>
                <Button 
                    onClick={() => navigate('/app/notas/icms-aliquotas/new')} 
                    className="save-button"
                >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Nova Alíquota
                </Button>
            </div>

            <div className="bg-white/80 p-4 rounded-xl shadow-sm border border-white">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                        type="text"
                        placeholder="Buscar por UF de origem ou destino..."
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
                                <TableHead className="cursor-pointer" onClick={() => handleSort('uf_origem')}>
                                    <div className="flex items-center">UF Origem {renderSortIcon('uf_origem')}</div>
                                </TableHead>
                                <TableHead className="cursor-pointer" onClick={() => handleSort('uf_destino')}>
                                    <div className="flex items-center">UF Destino {renderSortIcon('uf_destino')}</div>
                                </TableHead>
                                <TableHead className="text-right cursor-pointer" onClick={() => handleSort('aliquota_icms')}>
                                    <div className="flex items-center justify-end">Alíquota ICMS (%) {renderSortIcon('aliquota_icms')}</div>
                                </TableHead>
                                <TableHead className="text-right cursor-pointer" onClick={() => handleSort('aliquota_fecp')}>
                                    <div className="flex items-center justify-end">Alíquota FECOP (%) {renderSortIcon('aliquota_fecp')}</div>
                                </TableHead>
                                <TableHead className="text-right cursor-pointer" onClick={() => handleSort('aliquota_reducao')}>
                                    <div className="flex items-center justify-end">Redução BC (%) {renderSortIcon('aliquota_reducao')}</div>
                                </TableHead>
                                <TableHead className="text-right">Alíquota Aplicada (%)</TableHead> {/* New TableHead */}
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedAliquotas.map((a) => {
                                const aliquotaAplicada = (a.aliquota_icms + a.aliquota_fecp - a.aliquota_reducao).toFixed(2);
                                return (
                                    <TableRow key={a.id}>
                                        <TableCell className="font-medium">{a.uf_origem}</TableCell>
                                        <TableCell>{a.uf_destino}</TableCell>
                                        <TableCell className="text-right">{a.aliquota_icms.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">{a.aliquota_fecp.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">{a.aliquota_reducao.toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-bold">{aliquotaAplicada}</TableCell> {/* New TableCell */}
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => navigate(`/app/notas/icms-aliquotas/${a.id}/edit`)}>
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteAliquota(a.id, a.uf_origem, a.uf_destino)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}

            <div className="flex justify-between items-center text-sm text-slate-600 mt-4">
                <div>
                    Exibindo {paginatedAliquotas.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-
                    {Math.min(currentPage * ITEMS_PER_PAGE, sortedAndFilteredAliquotas.length)} de {sortedAndFilteredAliquotas.length} registros
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

export default IcmsAliquotaList;