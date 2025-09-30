"use client";

import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Ruler } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

// Helper function for normalization
const normalizeString = (str) => {
    if (typeof str !== 'string') return '';
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

const UnitSearchSelect = ({
  value, // current selected unit code (e.g., "UN")
  onValueChange, // function to call when a unit is selected
  units, // array of { codigo, unidade }
  disabled,
  placeholder = "Selecione a Unidade",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [displayValue, setDisplayValue] = useState('');

  // Update display value when `value` or `units` change
  useEffect(() => {
    if (value !== undefined && value !== null && units.length > 0) {
      // Converte o valor para número para comparação, já que u.codigo é int4
      const selected = units.find(u => u.codigo === parseInt(value, 10));
      if (selected) {
        setDisplayValue(selected.unidade); // Alterado para mostrar apenas a unidade
      } else {
        setDisplayValue('');
      }
    } else {
      setDisplayValue('');
    }
  }, [value, units]);

  const filteredUnits = useMemo(() => {
    const normalizedSearchTerm = normalizeString(searchTerm);
    if (!normalizedSearchTerm) {
      return units;
    }
    return units.filter(u => {
      const normalizedCodigo = normalizeString(u.codigo.toString()); // Converte para string para normalizar
      const normalizedUnidade = normalizeString(u.unidade);
      return normalizedCodigo.includes(normalizedSearchTerm) || normalizedUnidade.includes(normalizedSearchTerm);
    });
  }, [units, searchTerm]);

  const handleSelect = (unitCode) => {
    onValueChange(unitCode.toString()); // Passa o código como string para onValueChange
    setIsOpen(false);
    setSearchTerm(''); // Clear search term on close
  };

  // Clear search term when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  return (
    <>
      <Button
        variant="outline"
        className="w-full justify-between pr-2"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
      >
        <span className="truncate text-left flex-1">{displayValue || placeholder}</span>
        <Ruler className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px] p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle>Selecionar Unidade</DialogTitle>
            <DialogDescription>
              Busque e selecione uma unidade comercial da lista.
            </DialogDescription>
          </DialogHeader>
          <div className="relative px-6 pb-4">
            <Search className="absolute left-9 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por código ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <ScrollArea className="h-[300px] px-6 pb-6">
            {filteredUnits.length === 0 ? (
              <p className="text-center text-slate-500 py-4">Nenhuma unidade encontrada.</p>
            ) : (
              <div className="space-y-2">
                {filteredUnits.map(u => (
                  <Button
                    key={u.codigo}
                    variant="ghost"
                    className="w-full justify-start h-auto py-2 px-3"
                    onClick={() => handleSelect(u.codigo)}
                  >
                    <Ruler className="w-4 h-4 mr-2 text-slate-500" />
                    {u.codigo} - {u.unidade} {/* Mantido código e unidade na lista para facilitar a busca */}
                  </Button>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UnitSearchSelect;