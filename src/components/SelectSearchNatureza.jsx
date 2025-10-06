"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, FileText, X, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { normalizeString } from '@/lib/utils';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const SelectSearchNatureza = ({
  value, // current selected nature description (string)
  onValueChange, // function to call with the selected CFOP object { cfop: string, descricao: string, tipo_operacao: string } or null
  disabled,
  placeholder = "Selecione a Natureza da Operação",
  required = false,
  className = "",
  companyUf, // New prop: UF of the active company
  clientUf,  // New prop: UF of the selected client
}) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [allCfops, setAllCfops] = useState([]);
  const [loadingCfops, setLoadingCfops] = useState(true);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Update searchTerm when external value changes
  useEffect(() => {
    if (value) {
      setSearchTerm(value);
    } else {
      setSearchTerm('');
    }
  }, [value]);

  const fetchCfops = useCallback(async () => {
    setLoadingCfops(true);
    try {
      const { data, error } = await supabase
        .from('cfop')
        .select('cfop, descricao, tipo_operacao') // Select tipo_operacao
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
    let currentCfops = allCfops;

    // 1. Filter for "Saída" operations (CFOPs starting with 5, 6, or 7)
    currentCfops = currentCfops.filter(c => c.tipo_operacao === 'Saída');

    // 2. Apply location-based filtering if clientUf and companyUf are available
    if (clientUf && companyUf) {
        if (clientUf === companyUf) {
            // Sales within the state (CFOPs starting with 5)
            currentCfops = currentCfops.filter(c => c.cfop.startsWith('5'));
        } else {
            // Sales outside the state (CFOPs starting with 6)
            currentCfops = currentCfops.filter(c => c.cfop.startsWith('6'));
        }
    }
    // If clientUf or companyUf is not available, no specific geographic filter is applied,
    // so all sales CFOPs (5xxx, 6xxx) remain.

    // 3. Apply search term filter
    if (normalizedSearchTerm) {
      currentCfops = currentCfops.filter(c => {
        const normalizedCfop = normalizeString(c.cfop);
        const normalizedDescricao = normalizeString(c.descricao);
        return normalizedCfop.includes(normalizedSearchTerm) || normalizedDescricao.includes(normalizedSearchTerm);
      });
    }

    return currentCfops;
  }, [allCfops, searchTerm, companyUf, clientUf]);

  const handleSelect = (cfopObject) => {
    onValueChange(cfopObject); // Pass the full object
    setSearchTerm(cfopObject.descricao); // Set input to description
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation(); // Prevent event from propagating and closing dropdown
    onValueChange(null); // Clear the selection
    setSearchTerm('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
    onValueChange(null); // Clear selected value when user starts typing
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputBlur = () => {
    // Small delay to allow click on items before closing dropdown
    setTimeout(() => {
      if (containerRef.current && !containerRef.current.contains(document.activeElement)) {
        setIsOpen(false);
        // If input was cleared and no value selected, clear search term
        if (!value && searchTerm) {
            setSearchTerm('');
        } else if (value && searchTerm !== value) {
            // If user typed something but didn't select, restore previous value
            setSearchTerm(value);
        }
      }
    }, 200);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        if (!value && searchTerm) {
            setSearchTerm('');
        } else if (value && searchTerm !== value) {
            setSearchTerm(value);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value, searchTerm]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={loadingCfops ? "Carregando..." : searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className="pl-9 pr-9 w-full"
          disabled={disabled || loadingCfops}
          required={required}
        />
        {value && !disabled && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 flex items-center justify-center text-slate-500 hover:text-slate-700 rounded-full"
            onClick={handleClear}
            tabIndex={-1} // Prevents button from receiving focus
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {isOpen && (filteredCfops.length > 0 || searchTerm) && !loadingCfops && ( 
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-md shadow-lg">
          <ScrollArea className="max-h-[200px] overflow-y-auto">
            <div className="py-1">
              {filteredCfops.length === 0 && searchTerm ? (
                <div className="text-sm text-slate-500 text-center py-3">
                  Nenhuma natureza de operação encontrada.
                </div>
              ) : (
                filteredCfops.map((cfopObj) => (
                  <button
                    key={cfopObj.cfop}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none transition-colors"
                    onMouseDown={(e) => e.preventDefault()} 
                    onClick={() => handleSelect(cfopObj)}
                  >
                    <div className="flex items-center text-sm font-medium text-slate-800">
                      <FileText className="w-3 h-3 mr-2 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{cfopObj.cfop} - {cfopObj.descricao} ({cfopObj.tipo_operacao})</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default SelectSearchNatureza;