"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Ruler, X, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { normalizeString } from '@/lib/utils';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const SelectSearchUnit = ({
  value, // current selected unit code (string, e.g., "UN")
  onValueChange, // function to call with the selected unit object { codigo: int, unidade: string } or null
  disabled,
  placeholder = "Selecione a Unidade",
  required = false,
  className = "",
}) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [allUnits, setAllUnits] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(true);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Update searchTerm when external value changes
  useEffect(() => {
    if (value) {
      const selected = allUnits.find(u => u.codigo === parseInt(value, 10));
      setSearchTerm(selected ? selected.unidade : '');
    } else {
      setSearchTerm('');
    }
  }, [value, allUnits]); // Depend on allUnits to ensure it's loaded

  const fetchUnits = useCallback(async () => {
    setLoadingUnits(true);
    try {
      const { data, error } = await supabase
        .from('unidade')
        .select('codigo, unidade')
        .order('unidade', { ascending: true });
      
      if (error) throw error;
      setAllUnits(data);
    } catch (error) {
      console.error("Error fetching units:", error.message);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar as unidades comerciais.' });
      setAllUnits([]);
    } finally {
      setLoadingUnits(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const filteredUnits = useMemo(() => {
    const normalizedSearchTerm = normalizeString(searchTerm);
    if (!normalizedSearchTerm) {
      return allUnits;
    }
    return allUnits.filter(u => {
      const normalizedCodigo = normalizeString(u.codigo.toString());
      const normalizedUnidade = normalizeString(u.unidade);
      return normalizedCodigo.includes(normalizedSearchTerm) || normalizedUnidade.includes(normalizedSearchTerm);
    });
  }, [allUnits, searchTerm]);

  const handleSelect = (unitObject) => {
    onValueChange(unitObject.codigo.toString()); // Passa o código como string
    setSearchTerm(unitObject.unidade); // Define o input para a descrição da unidade
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation(); // Impede que o evento se propague e feche o dropdown
    onValueChange(''); // Limpa a seleção
    setSearchTerm('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
    onValueChange(''); // Limpa o valor selecionado ao começar a digitar
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputBlur = () => {
    // Pequeno atraso para permitir o clique nos itens antes de fechar o dropdown
    setTimeout(() => {
      if (containerRef.current && !containerRef.current.contains(document.activeElement)) {
        setIsOpen(false);
        // Se o campo foi limpo e não há valor selecionado, limpa o termo de busca
        if (!value && searchTerm) {
            setSearchTerm('');
        } else if (value && searchTerm !== (allUnits.find(u => u.codigo === parseInt(value, 10))?.unidade || '')) {
            // Se o usuário digitou algo mas não selecionou, restaura o valor anterior
            setSearchTerm(allUnits.find(u => u.codigo === parseInt(value, 10))?.unidade || '');
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
        } else if (value && searchTerm !== (allUnits.find(u => u.codigo === parseInt(value, 10))?.unidade || '')) {
            setSearchTerm(allUnits.find(u => u.codigo === parseInt(value, 10))?.unidade || '');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value, searchTerm, allUnits]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={loadingUnits ? "Carregando..." : searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className="pl-9 pr-9 w-full"
          disabled={disabled || loadingUnits}
          required={required}
        />
        {value && !disabled && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 flex items-center justify-center text-slate-500 hover:text-slate-700 rounded-full"
            onClick={handleClear}
            tabIndex={-1} // Impede que o botão receba foco
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {isOpen && (filteredUnits.length > 0 || searchTerm) && !loadingUnits && ( 
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-md shadow-lg">
          <ScrollArea className="max-h-[200px] overflow-y-auto">
            <div className="py-1">
              {filteredUnits.length === 0 && searchTerm ? (
                <div className="text-sm text-slate-500 text-center py-3">
                  Nenhuma unidade encontrada.
                </div>
              ) : (
                filteredUnits.map((unitObj) => (
                  <button
                    key={unitObj.codigo}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none transition-colors"
                    onMouseDown={(e) => e.preventDefault()} 
                    onClick={() => handleSelect(unitObj)}
                  >
                    <div className="flex items-center text-sm font-medium text-slate-800">
                      <Ruler className="w-3 h-3 mr-2 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{unitObj.codigo} - {unitObj.unidade}</span>
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

export default SelectSearchUnit;