"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, FileText, X, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { normalizeString } from '@/lib/utils';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const SelectSearchCstCsosn = ({
  value, // current selected CST/CSOSN object { id: int, cst_csosn: string, descricao: string, ... } or null
  onValueChange, // function to call with the selected CST/CSOSN object or null
  disabled,
  placeholder = "Selecione o CST/CSOSN",
  required = false,
  className = "",
}) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [allCstCsosn, setAllCstCsosn] = useState([]);
  const [loadingCstCsosn, setLoadingCstCsosn] = useState(true);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Update searchTerm when external value changes
  useEffect(() => {
    if (value && value.cst_csosn && value.descricao) {
      setSearchTerm(`${value.cst_csosn} - ${value.descricao}`);
    } else {
      setSearchTerm('');
    }
  }, [value]);

  const fetchCstCsosn = useCallback(async () => {
    setLoadingCstCsosn(true);
    try {
      const { data, error } = await supabase
        .from('cst_csosn')
        .select('id, cst_csosn, descricao, origem, resumo')
        .order('cst_csosn', { ascending: true });
      
      if (error) throw error;
      setAllCstCsosn(data);
    } catch (error) {
      console.error("Error fetching CST/CSOSN:", error.message);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar os códigos CST/CSOSN.' });
      setAllCstCsosn([]);
    } finally {
      setLoadingCstCsosn(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCstCsosn();
  }, [fetchCstCsosn]);

  const filteredCstCsosn = useMemo(() => {
    const normalizedSearchTerm = normalizeString(searchTerm);
    if (!normalizedSearchTerm) {
      return allCstCsosn;
    }
    return allCstCsosn.filter(c => {
      const normalizedCstCsosnCode = normalizeString(c.cst_csosn);
      const normalizedDescricao = normalizeString(c.descricao);
      const normalizedOrigem = normalizeString(c.origem || '');
      const normalizedResumo = normalizeString(c.resumo || '');
      return normalizedCstCsosnCode.includes(normalizedSearchTerm) || 
             normalizedDescricao.includes(normalizedSearchTerm) ||
             normalizedOrigem.includes(normalizedSearchTerm) ||
             normalizedResumo.includes(normalizedSearchTerm);
    });
  }, [allCstCsosn, searchTerm]);

  const handleSelect = (cstCsosnObject) => {
    onValueChange(cstCsosnObject);
    setSearchTerm(`${cstCsosnObject.cst_csosn} - ${cstCsosnObject.descricao}`);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onValueChange(null);
    setSearchTerm('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
    onValueChange(null);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      if (containerRef.current && !containerRef.current.contains(document.activeElement)) {
        setIsOpen(false);
        if (!value && searchTerm) {
            setSearchTerm('');
        } else if (value && searchTerm !== `${value.cst_csosn} - ${value.descricao}`) {
            setSearchTerm(`${value.cst_csosn} - ${value.descricao}`);
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
        } else if (value && searchTerm !== `${value.cst_csosn} - ${value.descricao}`) {
            setSearchTerm(`${value.cst_csosn} - ${value.descricao}`);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value, searchTerm, allCstCsosn]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={loadingCstCsosn ? "Carregando..." : searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className="pl-9 pr-9 w-full"
          disabled={disabled || loadingCstCsosn}
          required={required}
        />
        {value && !disabled && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 flex items-center justify-center text-slate-500 hover:text-slate-700 rounded-full"
            onClick={handleClear}
            tabIndex={-1}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {isOpen && (filteredCstCsosn.length > 0 || searchTerm) && !loadingCstCsosn && ( 
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-md shadow-lg">
          <ScrollArea className="max-h-[200px] overflow-y-auto">
            <div className="py-1">
              {filteredCstCsosn.length === 0 && searchTerm ? (
                <div className="text-sm text-slate-500 text-center py-3">
                  Nenhum CST/CSOSN encontrado.
                </div>
              ) : (
                filteredCstCsosn.map((cstCsosnObj) => (
                  <button
                    key={cstCsosnObj.id}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none transition-colors"
                    onMouseDown={(e) => e.preventDefault()} 
                    onClick={() => handleSelect(cstCsosnObj)}
                  >
                    <div className="flex items-center text-sm font-medium text-slate-800">
                      <FileText className="w-3 h-3 mr-2 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{cstCsosnObj.cst_csosn} - {cstCsosnObj.descricao}</span>
                    </div>
                    <div className="text-xs text-slate-500 ml-5 mt-0.5">
                        Origem: {cstCsosnObj.origem} | Resumo: {cstCsosnObj.resumo}
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

export default SelectSearchCstCsosn;