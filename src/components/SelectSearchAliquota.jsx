"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Percent, X, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { normalizeString } from '@/lib/utils';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const SelectSearchAliquota = ({
  value, // current selected Aliquota object { id: int, uf_origem: string, uf_destino: string, aliquota_icms: float, ... } or null
  onValueChange, // function to call with the selected Aliquota object or null
  disabled,
  placeholder = "Selecione a Alíquota ICMS",
  required = false,
  className = "",
  activeCompanyCnpj, // CNPJ da empresa ativa para filtrar
}) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [allAliquotas, setAllAliquotas] = useState([]);
  const [loadingAliquotas, setLoadingAliquotas] = useState(true);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Update searchTerm when external value changes
  useEffect(() => {
    if (value && value.uf_origem && value.uf_destino) {
      setSearchTerm(`${value.uf_origem} -> ${value.uf_destino} (${value.aliquota_icms.toFixed(2)}%)`);
    } else {
      setSearchTerm('');
    }
  }, [value]);

  const fetchAliquotas = useCallback(async () => {
    if (!activeCompanyCnpj) {
        setAllAliquotas([]);
        setLoadingAliquotas(false);
        return;
    }
    setLoadingAliquotas(true);
    try {
      const { data, error } = await supabase
        .from('aliquota_icms')
        .select('id, uf_origem, uf_destino, aliquota_icms, aliquota_fecp, aliquota_reducao')
        .eq('cnpj_empresa', activeCompanyCnpj)
        .order('uf_origem', { ascending: true });
      
      if (error) throw error;
      setAllAliquotas(data);
    } catch (error) {
      console.error("Error fetching Aliquotas ICMS:", error.message);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar as alíquotas ICMS.' });
      setAllAliquotas([]);
    } finally {
      setLoadingAliquotas(false);
    }
  }, [toast, activeCompanyCnpj]);

  useEffect(() => {
    fetchAliquotas();
  }, [fetchAliquotas]);

  const filteredAliquotas = useMemo(() => {
    const normalizedSearchTerm = normalizeString(searchTerm);
    if (!normalizedSearchTerm) {
      return allAliquotas;
    }
    return allAliquotas.filter(a => {
      const displayString = `${a.uf_origem} -> ${a.uf_destino} (${a.aliquota_icms.toFixed(2)}%)`;
      return normalizeString(displayString).includes(normalizedSearchTerm);
    });
  }, [allAliquotas, searchTerm]);

  const handleSelect = (aliquotaObject) => {
    onValueChange(aliquotaObject);
    setSearchTerm(`${aliquotaObject.uf_origem} -> ${aliquotaObject.uf_destino} (${aliquotaObject.aliquota_icms.toFixed(2)}%)`);
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
        } else if (value && searchTerm !== `${value.uf_origem} -> ${value.uf_destino} (${value.aliquota_icms.toFixed(2)}%)`) {
            setSearchTerm(`${value.uf_origem} -> ${value.uf_destino} (${value.aliquota_icms.toFixed(2)}%)`);
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
        } else if (value && searchTerm !== `${value.uf_origem} -> ${value.uf_destino} (${value.aliquota_icms.toFixed(2)}%)`) {
            setSearchTerm(`${value.uf_origem} -> ${value.uf_destino} (${value.aliquota_icms.toFixed(2)}%)`);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value, searchTerm, allAliquotas]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={loadingAliquotas ? "Carregando..." : searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className="pl-9 pr-9 w-full"
          disabled={disabled || loadingAliquotas}
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

      {isOpen && (filteredAliquotas.length > 0 || searchTerm) && !loadingAliquotas && ( 
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-md shadow-lg">
          <ScrollArea className="max-h-[200px] overflow-y-auto">
            <div className="py-1">
              {filteredAliquotas.length === 0 && searchTerm ? (
                <div className="text-sm text-slate-500 text-center py-3">
                  Nenhuma alíquota encontrada.
                </div>
              ) : (
                filteredAliquotas.map((aliquotaObj) => (
                  <button
                    key={aliquotaObj.id}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none transition-colors"
                    onMouseDown={(e) => e.preventDefault()} 
                    onClick={() => handleSelect(aliquotaObj)}
                  >
                    <div className="flex items-center text-sm font-medium text-slate-800">
                      <Percent className="w-3 h-3 mr-2 text-blue-500 flex-shrink-0" />
                      <span className="truncate">
                        {aliquotaObj.uf_origem} {'->'} {aliquotaObj.uf_destino} ({aliquotaObj.aliquota_icms.toFixed(2)}% ICMS, {aliquotaObj.aliquota_fecp.toFixed(2)}% FECOP, {aliquotaObj.aliquota_reducao.toFixed(2)}% Redução)
                      </span>
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

export default SelectSearchAliquota;