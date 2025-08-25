import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Search, PlusCircle, Edit, Trash2, Users, ChevronLeft, ChevronRight, User, Building2 } from 'lucide-react';
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

const PeopleList = () => {
    const { handleNotImplemented } = useOutletContext();
    const { user: currentUser } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [people, setPeople] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const ITEMS_PER_PAGE = 10;

    const fetchPeople = useCallback(async () => {
        setLoading(true);
        try {
            let allPeople = [];
            let offset = 0;
            const limit = 1000; // Limite de linhas por requisição do PostgREST
            let hasMore = true;

            while (hasMore) {
                const { data, error } = await supabase
                    .from('pessoas')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .range(offset, offset + limit - 1); // Busca um 'range' de registros

                if (error) throw error;

                if (data && data.length > 0) {
                    allPeople = allPeople.concat(data);
                    offset += data.length;
                    if (data.length < limit) { // Se retornou menos que o limite, é a última página
                        hasMore = false;
                    }
                } else {
                    hasMore = false; // Não há mais dados
                }
            }
            setPeople(allPeople);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao carregar pessoas",
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchPeople();
    }, [fetchPeople]);

    const filteredPeople = useMemo(() => {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        
        // Função para normalizar strings (remover acentos)
        const normalizeString = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        const normalizedSearchTerm = normalizeString(lowerCaseSearchTerm);

        return people.filter(p => {
            const razaoSocial = p.razao_social ? normalizeString(p.razao_social.toLowerCase()) : '';
            const nomeFantasia = p.nome_fantasia ? normalizeString(p.nome_fantasia.toLowerCase()) : '';
            const cpfCnpj = p.cpf_cnpj ? p.cpf_cnpj.replace(/[^\d]/g, '') : '';

            return (
                razaoSocial.includes(normalizedSearchTerm) ||
                nomeFantasia.includes(normalizedSearchTerm) ||
                cpfCnpj.includes(lowerCaseSearchTerm.replace(/[^\d]/g, '')) // CPF/CNPJ não precisa de normalização de acentos
            );
        });
    }, [people, searchTerm]);

    const paginatedPeople = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredPeople.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredPeople, currentPage]);

    const totalPages = Math.ceil(filteredPeople.length / ITEMS_PER_PAGE);

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    }

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const handleDeletePerson = async (personId, personName) => {
        if (!window.confirm(`Tem certeza que deseja excluir ${personName}?`)) {
            return;
        }
        try {
            const { error } = await supabase
                .from('pessoas')
                .delete()
                .eq('id', personId);

            if (error) throw error;

            toast({ title: 'Pessoa excluída!', description: `${personName} foi removido(a) com sucesso.` });
            if (currentUser) {
                await logAction(currentUser.id, 'person_delete', `Pessoa ${personName} (ID: ${personId}) excluída.`, null, personId);
            }
            fetchPeople();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao excluir', description: error.message });
        }
    };

    const getPessoaTipoIcon = (tipo) => {
        if (tipo === 1) return <User className="w-4 h-4 mr-1 text-blue-500" />;
        if (tipo === 2) return <Building2 className="w-4 h-4 mr-1 text-purple-500" />;
        return null;
    };

    const getPessoaTipoText = (tipo) => {
        if (tipo === 1) return 'Pessoa Física';
        if (tipo === 2) return 'Pessoa Jurídica';
        return 'Desconhecido';
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold gradient-text flex items-center gap-2">
                        <Users className="w-8 h-8" />
                        Cadastro de Pessoas
                    </h1>
                    <p className="text-slate-600 mt-2">Gerencie clientes, fornecedores e outros contatos.</p>
                </div>
                <Button 
                    onClick={() => navigate('/app/people/new')} 
                    className="save-button"
                >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Nova Pessoa
                </Button>
            </div>

            <div className="bg-white/80 p-4 rounded-xl shadow-sm border border-white">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                        type="text"
                        placeholder="Buscar por nome, CPF/CNPJ..."
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
                                <TableHead>Tipo</TableHead>
                                <TableHead>Nome/Razão Social</TableHead>
                                <TableHead>CPF/CNPJ</TableHead>
                                <TableHead>Cidade/UF</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedPeople.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell className="font-medium flex items-center">
                                        {getPessoaTipoIcon(p.pessoa_tipo)}
                                        {getPessoaTipoText(p.pessoa_tipo)}
                                    </TableCell>
                                    <TableCell>{p.razao_social || p.nome_fantasia}</TableCell>
                                    <TableCell>{p.cpf_cnpj}</TableCell>
                                    <TableCell>{p.municipio}/{p.uf}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => navigate(`/app/people/${p.id}/edit`)}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDeletePerson(p.id, p.razao_social || p.nome_fantasia)}>
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
                    Exibindo {paginatedPeople.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredPeople.length)} de {filteredPeople.length} registros
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

export default PeopleList;