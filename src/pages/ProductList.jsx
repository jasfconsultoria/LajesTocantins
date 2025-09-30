"use client";

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

// Helper function for normalization (copied from PeopleList.jsx)
const normalizeString = (str) => {
    if (typeof str !== 'string') return '';
    return str
        .normalize("NFD") // Normalize diacritics
        .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
        .toLowerCase() // Convert to lowercase
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"") // Remove common punctuation
        .replace(/\s{2,}/g," ") // Replace multiple spaces with a single space
        .trim(); // Trim leading/trailing whitespace
};

const ProductList = () => {
    const { handleNotImplemented, activeCompanyId } = useOutletContext();
    const { user: currentUser } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true); // Corrigido: Adicionado useState
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const ITEMS_PER_PAGE = 10;

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { 
            style: 'decimal', // Usar 'decimal' para não incluir o símbolo da moeda
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };

    const fetchProducts = useCallback(async () => {
        if (!activeCompanyId) {
            setProducts([]);
            setLoading(false);
            console.log("ProductList: No active company ID, skipping product fetch.");
            return;
        }
        setLoading(true);
        try {
            console.log(`ProductList: Fetching products for activeCompanyId: ${activeCompanyId}`);
            
            // 1. Fetch products directly from 'produtos' table
            const { data: productsData, error: productsError } = await supabase
                .from('produtos')
                .select('*')
                .eq('id_emit', activeCompanyId)
                .order('created_at', { ascending: false });

            if (productsError) throw productsError;

            // 2. Fetch units from 'unidade' table
            const { data: unitsData, error: unitsError } = await supabase
                .from('unidade')
                .select('codigo, unidade'); // Only fetch necessary columns

            if (unitsError) throw unitsError;

            // Create a map for quick lookup of unit descriptions
            const unitMap = new Map(unitsData.map(unit => [unit.codigo, unit.unidade]));

            // 3. Combine products with their unit descriptions and create client-side busca_completa
            const combinedProducts = productsData.map(p => {
                const unitDescription = unitMap.get(p.prod_uCOM) || ''; // Get unit description, default to empty string
                
                // Create a string for client-side search, filtering out null/undefined values
                const searchStringParts = [
                    p.prod_cProd,
                    p.prod_xProd,
                    p.prod_cEAN,
                    p.prod_NCM,
                    unitDescription
                ].filter(Boolean); // Filter out falsy values (null, undefined, empty string)

                const buscaCompleta = normalizeString(searchStringParts.join(' '));

                return {
                    ...p,
                    prod_uCOM_descricao: unitDescription || 'N/A', // Still display 'N/A' if unitDescription is empty
                    busca_completa: buscaCompleta
                };
            });

            console.log(`ProductList: Fetched ${combinedProducts.length} products. Combined data:`, combinedProducts);
            setProducts(combinedProducts);

        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao carregar produtos",
                description: error.message,
            });
            console.error("ProductList: Error fetching products:", error.message);
        } finally {
            setLoading(false);
        }
    }, [activeCompanyId, toast]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const filteredProducts = useMemo(() => {
        const normalizedSearchTerm = normalizeString(searchTerm);
        if (!normalizedSearchTerm) {
            return products;
        }
        return products.filter(p =>
            // Usa a nova coluna 'busca_completa' gerada no cliente para a pesquisa
            normalizeString(p.busca_completa || '').includes(normalizedSearchTerm)
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
                .from('produtos')
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
                                <TableHead>ID</TableHead>
                                <TableHead>Código</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead>NCM</TableHead>
                                <TableHead>Unidade Comercial</TableHead>
                                <TableHead className="text-right">Valor Unitário Comercial</TableHead> {/* Nova coluna */}
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedProducts.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell className="font-medium">{p.id}</TableCell>
                                    <TableCell>{p.prod_cProd}</TableCell>
                                    <TableCell>{p.prod_xProd}</TableCell>
                                    <TableCell>{p.prod_NCM}</TableCell>
                                    <TableCell>{p.prod_uCOM_descricao || 'N/A'}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(p.prod_vUnCOM)}</TableCell> {/* Valor formatado */}
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => navigate(`/app/products/${p.id}/edit`)}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteProduct(p.id, p.prod_xProd)}>
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
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} de {filteredProducts.length} registros
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