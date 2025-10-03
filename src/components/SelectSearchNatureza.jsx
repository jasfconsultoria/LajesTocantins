"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, FileText, ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { normalizeString } from '@/lib/utils';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const ITEMS_PER_PAGE = 10;

const SelectSearchNatureza = ({
  value, // current selected nature description (string)
  onValueChange, // function to call with the selected CFOP object { cfop: string, descricao: string } or null
  disabled,
  placeholder = "Selecione a Natureza da Operação",
  required = false,
}) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isOpen, setIsOpen] = useState(false);
  const [allCfops, setAllCfops] = useState([]);
  const [loadingCfops, setLoadingCfops] = useState(true);

  const fetchCfops = useCallback(async () => {
    setLoadingCfops(true);
    try {
      const { data, error } = await supabase
        .from('cfop')
        .select('cfop, descricao')
        .order('cfop', { ascending: true });
      
      if (error) throw error;
      setAllCfops(data);
    } catch (error) {
      console.error("Error fetching CFOPs:", error.message);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar as naturezas de operação.' });
      setAllCfops([]);
    } finally {
      setLoadingCfops(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCfops();
  }, [fetchCfops]);

  const filteredCfops = useMemo(() => {
    const normalizedSearchTerm = normalizeString(searchTerm);
    if (!normalizedSearchTerm) {
      return allCfops;
    }
    return allCfops.filter(c => {
      const normalizedCfop = normalizeString(c.cfop);
      const normalizedDescricao = normalizeString(c.descricao);
      return normalizedCfop.includes(normalizedSearchTerm) || normalizedDescricao.includes(normalizedSearchTerm);
    });
  }, [allCfops, searchTerm]);

  const paginatedCfops = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCfops.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredCfops, currentPage]);

  const totalPages = Math.ceil(filteredCfops.length / ITEMS_PER_PAGE);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleSelect = (cfopObject) => {
    onValueChange(cfopObject); // Passa o objeto completo
    setIsOpen(false);
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleClear = () => {
    onValueChange(null); // Limpa a seleção
    setSearchTerm('');
    setCurrentPage(1);
  };

  const selectedCfop = value ? allCfops.find(c => c.descricao === value) : null;

  const getDisplayText = (cfopObj) => {
    if (!cfopObj) return placeholder;
    return `${cfopObj.cfop} - ${cfopObj.descricao}`;
  };

  return (
    <div className="relative">
      <Select open={isOpen} onOpenChange={setIsOpen} value={selectedCfop?.descricao || ''} required={required}>
        <SelectTrigger className="w-full" disabled={disabled || loadingCfops}>
          <SelectValue>
            {loadingCfops ? (
                <div className="flex items-center text-slate-500">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Carregando...
                </div>
            ) : selectedCfop ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-slate-500" />
                  <span className="truncate">{getDisplayText(selectedCfop)}</span>
                </div>
                {value && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-slate-200 ml-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClear();
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ) : (
              <span className="text-slate-500">{placeholder}</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="p-0 max-h-[400px]">
          <div className="relative p-3 border-b">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por CFOP ou descrição..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          <ScrollArea className="h-[300px]">
            {filteredCfops.length === 0 ? (
              <div className="text-center text-slate-500 py-4">
                {searchTerm ? 'Nenhuma natureza de operação encontrada.' : 'Nenhuma natureza de operação disponível.'}
              </div>
            ) : (
              <div className="space-y-1 p-1">
                {filteredCfops.map(cfopObj => (
                  <SelectItem
                    key={cfopObj.cfop}
                    value={cfopObj.descricao} // O valor do SelectItem é a descrição
                    className="flex items-start py-2 px-3 h-auto"
                    onClick={() => handleSelect(cfopObj)} // Passa o objeto completo no clique
                  >
                    <div className="flex items-center text-slate-800">
                      <FileText className="w-4 h-4 mr-2 text-slate-500" />
                      <div>
                        <div className="font-medium">{cfopObj.cfop}</div>
                        <div className="text-xs text-slate-500">{cfopObj.descricao}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </div>
            )}
          </ScrollArea>

          {filteredCfops.length > ITEMS_PER_PAGE && (
            <div className="flex justify-between items-center text-sm text-slate-600 px-3 py-2 border-t">
              <div>
                Exibindo {paginatedCfops.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredCfops.length)} de {filteredCfops.length}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={handlePrevPage} disabled={currentPage === 1}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs">Página {currentPage}</span>
                <Button variant="ghost" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

export default SelectSearchNatureza;