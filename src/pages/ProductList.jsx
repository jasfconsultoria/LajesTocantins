import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Search, PlusCircle, Edit, Trash2, Package, ChevronLeft, ChevronRight } from 'lucide-react';
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

const ProductList = () => {
    const { handleNotImplemented, activeCompanyId } = useOutletContext();
    const { user: currentUser } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const ITEMS_PER_PAGE = 10;

    const fetchProducts = useCallback(async () => {
        if (!activeCompanyId) {
            setProducts([]);
            setLoading(false);
            console.log("ProductList: Nenhuma empresa ativa selecionada.");
            return;
        }
        setLoading(true);
        console.log("ProductList: Buscando produtos para activeCompanyId:", activeCompanyId); // Log para depuração
        try {
            const { data, error } = await supabase
                .from('produtos') // Corrigido para 'produtos' (minúsculas)
                .select('*')
                .eq('id_emit', activeCompanyId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setProducts(data);
            console.log("ProductList: Produtos carregados:", data.length); // Log para depuração
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao carregar produtos",
                description: error.message,
            });
            console.error("ProductList: Erro ao buscar produtos:", error.message); // Log para depuração
        } finally {
            setLoading(false);
        }
    }, [activeCompanyId, toast]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const filteredProducts = useMemo(() => {
        return products.filter(p =>
            (p.prod_xprod?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p.prod_cprod?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p.prod_cean?.replace(/[^\d]/g, '').includes(searchTerm.replace(/[^\d]/g, '')))
        );
    }, [products, searchTerm]);

    const paginatedProducts = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredProducts, currentPage]);

    const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const handleDeleteProduct = async (productId, productName) => {
        if (!window.confirm(`Tem certeza que deseja excluir o produto "${productName}"?`)) {
            return;
        }
        try {
            const { error } = await supabase
                .from('produtos') // Corrigido para 'produtos' (minúsculas)
                .delete()
                .eq('id', productId);

            if (error) throw error;

            toast({ title: 'Produto excluído!', description: `"${productName}" foi removido(a) com sucesso.` });
            if (currentUser) {
                await logAction(currentUser.id, 'product_delete', `Produto "${productName}" (ID: ${productId}) excluído.`, activeCompanyId, null);
            }
            fetchProducts();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao excluir', description: error.message });
        }
    };

    if (!activeCompanyId) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center bg-white/80 rounded-xl shadow-sm border border-white p-8">
                <Package className="w-16 h-16 text-blue-500 mb-4" />
                <h2 className="text-2xl font-bold text-slate-800">Nenhuma Empresa Ativa</h2>
                <p className="text-slate-600">Selecione uma empresa para visualizar e gerenciar seus produtos.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold gradient-text flex items-center gap-2">
                        <Package className="w-8 h-8" />
                        Cadastro de Produtos
                    </h1>
                    <p className="text-slate-600 mt-2">Gerencie os produtos e serviços da sua empresa.</p>
                </div>
                <Button 
                    onClick={() => navigate('/app/products/new')} 
                    className="save-button"
                >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Novo Produto
                </Button>
            </div>

            <div className="bg-white/80 p-4 rounded-xl shadow-sm border border-white">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                        type="text"
                        placeholder="Buscar por código, descrição ou EAN..."
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
                                <TableHead>Código</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead>NCM</TableHead>
                                <TableHead>Un. Com.</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedProducts.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell className="font-medium">{p.prod_cprod}</TableCell>
                                    <TableCell>{p.prod_xprod}</TableCell>
                                    <TableCell>{p.prod_ncm}</TableCell>
                                    <TableCell>{p.prod_ucom}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => navigate(`/app/products/${p.id}/edit`)}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteProduct(p.id, p.prod_xprod)}>
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
                    Exibindo {paginatedProducts.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} de {filteredProducts.length} de {filteredProducts.length} registros
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

export default ProductList;