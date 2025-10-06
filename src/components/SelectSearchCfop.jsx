"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, FileText, X, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { normalizeString } from '@/lib/utils';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const SelectSearchCfop = ({
  value, // current selected CFOP object { id: bigint, cfop: string, descricao: string } or null
  onValueChange, // function to call with the selected CFOP object or null
  disabled,
  placeholder = "Selecione o CFOP",
  required = false,
  className = "",
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
    if (value && value.cfop && value.descricao) {
      setSearchTerm(`${value.cfop} - ${value.descricao}`);
    } else {
      setSearchTerm('');
    }
  }, [value]);

  const fetchCfops = useCallback(async () => {
    setLoadingCfops(true);
    try {
      const { data, error } = await supabase
        .from('cfop')
        .select('id, cfop, descricao') // Seleciona o ID também
        .order('cfop', { ascending: true });
      
      if (error) throw error;
      setAllCfops(data);
    } catch (error) {
      console.error("Error fetching CFOPs:", error.message);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar os códigos CFOP.' });
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
      const normalizedCfopCode = normalizeString(c.cfop);
      const normalizedDescricao = normalizeString(c.descricao);
      return normalizedCfopCode.includes(normalizedSearchTerm) || normalizedDescricao.includes(normalizedSearchTerm);
    });
  }, [allCfops, searchTerm]);

  const handleSelect = (cfopObject) => {
    onValueChange(cfopObject); // Passa o objeto completo, incluindo o ID
    setSearchTerm(`${cfopObject.cfop} - ${cfopObject.descricao}`);
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
        } else if (value && searchTerm !== `${value.cfop} - ${value.descricao}`) {
            setSearchTerm(`${value.cfop} - ${value.descricao}`);
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
        } else if (value && searchTerm !== `${value.cfop} - ${value.descricao}`) {
            setSearchTerm(`${value.cfop} - ${value.descricao}`);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value, searchTerm, allCfops]);

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
            tabIndex={-1}
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
                  Nenhum CFOP encontrado.
                </div>
              ) : (
                filteredCfops.map((cfopObj) => (
                  <button
                    key={cfopObj.id} // Usa o ID como chave
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none transition-colors"
                    onMouseDown={(e) => e.preventDefault()} 
                    onClick={() => handleSelect(cfopObj)}
                  >
                    <div className="flex items-center text-sm font-medium text-slate-800">
                      <FileText className="w-3 h-3 mr-2 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{cfopObj.cfop} - {cfopObj.descricao}</span>
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

export default SelectSearchCfop;