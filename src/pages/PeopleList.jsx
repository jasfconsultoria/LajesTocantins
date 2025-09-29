import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Search, PlusCircle, Edit, Trash2, Users, ChevronLeft, ChevronRight, User, Building2, ArrowUp, ArrowDown } from 'lucide-react'; // Importar ArrowUp e ArrowDown
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
    if (typeof str !== 'string') return ''; // Handle non-string inputs
    return str
        .normalize("NFD") // Normalize diacritics
        .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
        .toLowerCase() // Convert to lowercase
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"") // Remove common punctuation
        .replace(/\s{2,}/g," ") // Replace multiple spaces with a single space
        .trim(); // Trim leading/trailing whitespace
};

const PeopleList = () => {
    const { handleNotImplemented } = useOutletContext();
    const { user: currentUser } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [people, setPeople] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortColumn, setSortColumn] = useState('nome_completo_busca'); // Estado para a coluna de ordenação
    const [sortDirection, setSortDirection] = useState('asc'); // Estado para a direção da ordenação ('asc' ou 'desc')

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
                    .from('pessoas_com_municipio') // Consulta a nova VIEW
                    .select('*') // Seleciona todos os campos da VIEW
                    .order('created_at', { ascending: false }) // Keep initial order for fetching
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

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const sortedAndFilteredPeople = useMemo(() => {
        const normalizedSearchTerm = normalizeString(searchTerm);
        const rawNumericSearchTerm = searchTerm.replace(/[^\d]/g, '');

        let currentFilteredPeople = people;

        // 1. Aplicar filtragem se houver termo de busca
        if (normalizedSearchTerm || rawNumericSearchTerm) {
            currentFilteredPeople = people.filter(p => {
                const normalizedNomeCompletoBusca = normalizeString(p.nome_completo_busca);
                const cpfCnpj = p.cpf_cnpj ? p.cpf_cnpj.replace(/[^\d]/g, '') : '';
                const municipioNome = p.municipio_nome ? normalizeString(p.municipio_nome) : '';
                const ufNormalized = p.uf ? normalizeString(p.uf) : '';

                const textMatches = normalizedNomeCompletoBusca.includes(normalizedSearchTerm) ||
                                    municipioNome.includes(normalizedSearchTerm) ||
                                    ufNormalized.includes(normalizedSearchTerm);

                const numericMatches = cpfCnpj.includes(rawNumericSearchTerm);

                // Lógica de filtragem aprimorada:
                // Se ambos (texto e numérico) estão presentes no termo de busca, ambos devem corresponder.
                if (normalizedSearchTerm && rawNumericSearchTerm) {
                    return textMatches && numericMatches;
                } 
                // Se apenas o termo de busca de texto está presente, apenas os campos de texto precisam corresponder.
                else if (normalizedSearchTerm) {
                    return textMatches;
                } 
                // Se apenas o termo de busca numérico está presente, apenas os campos numéricos precisam corresponder.
                else if (rawNumericSearchTerm) {
                    return numericMatches;
                }
                return false; // Não deve ser alcançado se houver termo de busca
            });
        }

        // 2. Aplicar ordenação aos resultados filtrados (ou à lista completa se não houver busca)
        return [...currentFilteredPeople].sort((a, b) => { // Cria uma cópia para não modificar o array original
            let aValue, bValue;

            switch (sortColumn) {
                case 'tipo':
                    aValue = a.pessoa_tipo;
                    bValue = b.pessoa_tipo;
                    break;
                case 'nome_completo_busca':
                    aValue = normalizeString(a.nome_completo_busca);
                    bValue = normalizeString(b.nome_completo_busca);
                    break;
                case 'cpf_cnpj':
                    aValue = a.cpf_cnpj ? a.cpf_cnpj.replace(/[^\d]/g, '') : '';
                    bValue = b.cpf_cnpj ? b.cpf_cnpj.replace(/[^\d]/g, '') : '';
                    break;
                case 'cidade_uf':
                    aValue = normalizeString(`${a.municipio_nome || a.municipio_codigo}/${a.uf}`);
                    bValue = normalizeString(`${b.municipio_nome || b.municipio_codigo}/${b.uf}`);
                    break;
                default:
                    aValue = normalizeString(a[sortColumn] || '');
                    bValue = normalizeString(b[sortColumn] || '');
            }

            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [people, searchTerm, sortColumn, sortDirection]);

    const paginatedPeople = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return sortedAndFilteredPeople.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [sortedAndFilteredPeople, currentPage]);

    const totalPages = Math.ceil(sortedAndFilteredPeople.length / ITEMS_PER_PAGE);

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
            // Ao deletar, ainda precisamos deletar da tabela 'pessoas' original, não da VIEW
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

    const renderSortIcon = (column) => {
        if (sortColumn === column) {
            return sortDirection === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
        }
        return null;
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
                        placeholder="Buscar por nome, CPF/CNPJ, município ou UF..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1); // Resetar página ao mudar o termo de busca
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
                                <TableHead className="cursor-pointer" onClick={() => handleSort('tipo')}>
                                    <div className="flex items-center">Tipo {renderSortIcon('tipo')}</div>
                                </TableHead>
                                <TableHead className="cursor-pointer" onClick={() => handleSort('nome_completo_busca')}>
                                    <div className="flex items-center">Nome Fantasia/Razão Social {renderSortIcon('nome_completo_busca')}</div>
                                </TableHead>
                                <TableHead className="cursor-pointer" onClick={() => handleSort('cpf_cnpj')}>
                                    <div className="flex items-center">CPF/CNPJ {renderSortIcon('cpf_cnpj')}</div>
                                </TableHead>
                                <TableHead className="cursor-pointer" onClick={() => handleSort('cidade_uf')}>
                                    <div className="flex items-center">Cidade/UF {renderSortIcon('cidade_uf')}</div>
                                </TableHead>
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
                                    <TableCell>{p.nome_completo_busca}</TableCell>
                                    <TableCell>{p.cpf_cnpj}</TableCell>
                                    <TableCell>{p.municipio_nome || p.municipio_codigo}/{p.uf}</TableCell>
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
                    {Math.min(currentPage * ITEMS_PER_PAGE, sortedAndFilteredPeople.length)} de {sortedAndFilteredPeople.length} registros
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