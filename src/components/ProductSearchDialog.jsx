"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Package, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency, normalizeString } from '@/lib/utils';

const ITEMS_PER_PAGE = 10;

const ProductSearchDialog = ({ isOpen, setIsOpen, onSelectProduct, activeCompanyId }) => {
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [unitsMap, setUnitsMap] = useState(new Map());

  const fetchProductsAndUnits = useCallback(async () => {
    if (!activeCompanyId) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('produtos')
        .select('*')
        .eq('id_emit', activeCompanyId)
        .order('prod_xProd', { ascending: true });

      if (productsError) {
        console.error("Error fetching products (ProductSearchDialog):", productsError);
        throw productsError;
      }

      // Fetch units (make this more resilient)
      let currentUnitsMap = new Map();
      const { data: unitsData, error: unitsError } = await supabase
        .from('unidade')
        .select('codigo, unidade');

      if (unitsError) {
        console.error("Error fetching units (ProductSearchDialog):", unitsError);
        toast({
          variant: "destructive",
          title: "Erro ao carregar unidades comerciais",
          description: unitsError.message || 'Verifique as configurações do banco de dados ou permissões (RLS).',
        });
        // Do NOT throw here. Proceed with an empty currentUnitsMap.
      } else {
        currentUnitsMap = new Map(unitsData.map(unit => [unit.codigo, unit.unidade]));
      }
      setUnitsMap(currentUnitsMap); // Set the map, whether empty or populated

      // Combine products with unit descriptions and create search string
      const combinedProducts = productsData.map(p => {
        const unitDescription = currentUnitsMap.get(p.prod_uCOM) || '';
        const searchStringParts = [
          p.prod_cProd,
          p.prod_xProd,
          p.prod_cEAN,
          p.prod_NCM,
          unitDescription
        ].filter(Boolean);
        const buscaCompleta = normalizeString(searchStringParts.join(' '));
        return {
          ...p,
          prod_uCOM_descricao: unitDescription,
          busca_completa: buscaCompleta
        };
      });

      setProducts(combinedProducts);
    } catch (error) {
      // This catch block will now primarily catch productError
      toast({
        variant: "destructive",
        title: "Erro ao carregar produtos",
        description: error.message || 'Ocorreu um erro inesperado ao carregar os produtos.',
      });
      console.error("ProductSearchDialog: Caught error in fetchProductsAndUnits:", error);
      setProducts([]);
      setUnitsMap(new Map()); // Ensure unitsMap is empty on error
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId, toast]);

  useEffect(() => {
    if (isOpen) {
      fetchProductsAndUnits();
    }
  }, [isOpen, fetchProductsAndUnits]);

  const filteredProducts = useMemo(() => {
    const normalizedSearchTerm = normalizeString(searchTerm);
    if (!normalizedSearchTerm) {
      return products;
    }
    return products.filter(p =>
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

  const handleSelect = (product) => {
    onSelectProduct(product);
    setIsOpen(false);
    setSearchTerm('');
    setCurrentPage(1);
  };

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setCurrentPage(1);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[700px] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Selecionar Produto</DialogTitle>
          <DialogDescription>
            Busque e selecione um produto da lista para adicionar ao orçamento.
          </DialogDescription>
        </DialogHeader>
        <div className="relative px-6 pb-4">
          <Search className="absolute left-9 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por código, descrição, EAN ou NCM..."
            value={searchTerm}
            onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>
        {loading ? (
          <div className="flex justify-center items-center h-48"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : (
          <ScrollArea className="h-[400px] px-6 pb-6">
            {paginatedProducts.length === 0 ? (
              <p className="text-center text-slate-500 py-4">Nenhum produto encontrado.</p>
            ) : (
              <div className="space-y-2">
                {paginatedProducts.map(product => (
                  <Button
                    key={product.id}
                    variant="ghost"
                    className="w-full justify-start h-auto py-2 px-3 flex-col items-start text-left"
                    onClick={() => handleSelect(product)}
                  >
                    <div className="flex items-center text-slate-800 font-medium">
                      <Package className="w-4 h-4 mr-2 text-blue-500" />
                      {product.prod_xProd} ({product.prod_cProd})
                    </div>
                    <div className="text-xs text-slate-500 mt-1 pl-6">
                      Unidade: {product.prod_uCOM_descricao || 'N/A'} | Valor: {formatCurrency(product.prod_vUnCOM)}
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </ScrollArea>
        )}
        <div className="flex justify-between items-center text-sm text-slate-600 px-6 py-4 border-t border-slate-200">
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
      </DialogContent>
    </Dialog>
  );
};

export default ProductSearchDialog;