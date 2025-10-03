"use client";

import React, { useState, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Ruler, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { normalizeString } from '@/lib/utils';

const ITEMS_PER_PAGE = 10;

const SelectSearchUnit = ({
  value,
  onValueChange,
  units,
  disabled,
  placeholder = "Selecione a Unidade",
  required = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isOpen, setIsOpen] = useState(false);

  const filteredUnits = useMemo(() => {
    const normalizedSearchTerm = normalizeString(searchTerm);
    if (!normalizedSearchTerm) {
      return units;
    }
    return units.filter(u => {
      const normalizedCodigo = normalizeString(u.codigo.toString());
      const normalizedUnidade = normalizeString(u.unidade);
      return normalizedCodigo.includes(normalizedSearchTerm) || normalizedUnidade.includes(normalizedSearchTerm);
    });
  }, [units, searchTerm]);

  const paginatedUnits = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUnits.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredUnits, currentPage]);

  const totalPages = Math.ceil(filteredUnits.length / ITEMS_PER_PAGE);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleSelect = (unitCode) => {
    onValueChange(unitCode);
    setIsOpen(false);
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleClear = () => {
    onValueChange('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const selectedUnit = value ? units.find(u => u.codigo === parseInt(value, 10)) : null;

  const getDisplayText = (unit) => {
    if (!unit) return placeholder;
    return `${unit.unidade}`;
  };

  return (
    <div className="relative">
      <Select open={isOpen} onOpenChange={setIsOpen} value={value || ''} required={required}>
        <SelectTrigger className="w-full" disabled={disabled}>
          <SelectValue>
            {selectedUnit ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <Ruler className="w-4 h-4 mr-2 text-slate-500" />
                  <span className="truncate">{getDisplayText(selectedUnit)}</span>
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
              placeholder="Buscar por código ou descrição..."
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
            {paginatedUnits.length === 0 ? (
              <div className="text-center text-slate-500 py-4">
                {searchTerm ? 'Nenhuma unidade encontrada.' : 'Nenhuma unidade disponível.'}
              </div>
            ) : (
              <div className="space-y-1 p-1">
                {paginatedUnits.map(unit => (
                  <SelectItem
                    key={unit.codigo}
                    value={unit.codigo.toString()}
                    className="flex items-start py-2 px-3 h-auto"
                  >
                    <div className="flex items-center text-slate-800">
                      <Ruler className="w-4 h-4 mr-2 text-slate-500" />
                      <div>
                        <div className="font-medium">{unit.unidade}</div>
                        <div className="text-xs text-slate-500">Código: {unit.codigo}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </div>
            )}
          </ScrollArea>

          {filteredUnits.length > ITEMS_PER_PAGE && (
            <div className="flex justify-between items-center text-sm text-slate-600 px-3 py-2 border-t">
              <div>
                Exibindo {paginatedUnits.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredUnits.length)} de {filteredUnits.length}
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

export default SelectSearchUnit;