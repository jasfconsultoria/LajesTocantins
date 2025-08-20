import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ShieldAlert, Search, PlusCircle, Edit, Trash2, Users as UsersIcon, Building, ChevronLeft, ChevronRight } from 'lucide-react';
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

const CompanyList = ({ handleNotImplemented }) => {
    const { role } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const fetchCompanies = useCallback(async () => {
        if (role !== 'admin') {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('emitente')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCompanies(data);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao carregar empresas",
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    }, [role, toast]);

    useEffect(() => {
        fetchCompanies();
    }, [fetchCompanies]);

    const filteredCompanies = useMemo(() => {
        return companies.filter(c =>
            (c.razao_social?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (c.cnpj?.replace(/[^\d]/g, '').includes(searchTerm.replace(/[^\d]/g, '')))
        );
    }, [companies, searchTerm]);

    const paginatedCompanies = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredCompanies.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredCompanies, currentPage]);

    const totalPages = Math.ceil(filteredCompanies.length / ITEMS_PER_PAGE);

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    if (role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center bg-white/80 rounded-xl shadow-sm border border-white p-8">
                <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-slate-800">Acesso Negado</h2>
                <p className="text-slate-600">Esta área é restrita a administradores.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold gradient-text flex items-center gap-2">
                        <Building className="w-8 h-8" />
                        Lista de Empresas
                    </h1>
                    <p className="text-slate-600 mt-2">Visualize e gerencie as empresas (emitentes) cadastradas.</p>
                </div>
                <Button onClick={() => navigate('/app/companies/new')} className="save-button">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Nova Empresa
                </Button>
            </div>

            <div className="bg-white/80 p-4 rounded-xl shadow-sm border border-white">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                        type="text"
                        placeholder="Buscar por Razão Social ou CNPJ..."
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
                                <TableHead>Razão Social</TableHead>
                                <TableHead>CNPJ</TableHead>
                                <TableHead>Cidade/UF</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedCompanies.map((c) => (
                                <TableRow key={c.id}>
                                    <TableCell className="font-medium">{c.razao_social}</TableCell>
                                    <TableCell>{c.cnpj}</TableCell>
                                    <TableCell>{c.municipio}/{c.uf}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleNotImplemented('Atribuir Usuários')}>
                                                <UsersIcon className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => navigate(`/app/companies/${c.id}/edit`)}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleNotImplemented('Excluir Empresa')}>
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
                    Exibindo {paginatedCompanies.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredCompanies.length)} de {filteredCompanies.length} registros
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

export default CompanyList;