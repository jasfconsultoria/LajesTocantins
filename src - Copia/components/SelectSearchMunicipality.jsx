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
import { Search, MapPin, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { normalizeString } from '@/lib/utils';

const ITEMS_PER_PAGE = 10;

const SelectSearchMunicipality = ({
  value,
  onValueChange,
  municipalities,
  disabled,
  placeholder = "Selecione o Município",
  required = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isOpen, setIsOpen] = useState(false);

  const filteredMunicipalities = useMemo(() => {
    const normalizedSearchTerm = normalizeString(searchTerm);
    if (!normalizedSearchTerm) {
      return municipalities;
    }
    return municipalities.filter(m => {
      const normalizedMunicipio = normalizeString(m.municipio);
      return normalizedMunicipio.includes(normalizedSearchTerm);
    });
  }, [municipalities, searchTerm]);

  const paginatedMunicipalities = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMunicipalities.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredMunicipalities, currentPage]);

  const totalPages = Math.ceil(filteredMunicipalities.length / ITEMS_PER_PAGE);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleSelect = (municipalityCode) => {
    onValueChange(municipalityCode);
    setIsOpen(false);
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleClear = () => {
    onValueChange('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const selectedMunicipality = value ? municipalities.find(m => m.codigo === value) : null;

  const getDisplayText = (municipality) => {
    if (!municipality) return placeholder;
    return `${municipality.municipio}`;
  };

  return (
    <div className="relative">
      <Select open={isOpen} onOpenChange={setIsOpen} value={value?.toString() || ''} required={required}>
        <SelectTrigger className="w-full" disabled={disabled}>
          <SelectValue>
            {selectedMunicipality ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-slate-500" />
                  <span className="truncate">{getDisplayText(selectedMunicipality)}</span>
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
              placeholder="Buscar por nome do município..."
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
            {paginatedMunicipalities.length === 0 ? (
              <div className="text-center text-slate-500 py-4">
                {searchTerm ? 'Nenhum município encontrado.' : 'Nenhum município disponível.'}
              </div>
            ) : (
              <div className="space-y-1 p-1">
                {paginatedMunicipalities.map(municipality => (
                  <SelectItem
                    key={municipality.codigo}
                    value={municipality.codigo.toString()}
                    className="flex items-start py-2 px-3 h-auto"
                  >
                    <div className="flex items-center text-slate-800">
                      <MapPin className="w-4 h-4 mr-2 text-slate-500" />
                      <div>
                        <div className="font-medium">{municipality.municipio}</div>
                        <div className="text-xs text-slate-500">Código: {municipality.codigo}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </div>
            )}
          </ScrollArea>

          {filteredMunicipalities.length > ITEMS_PER_PAGE && (
            <div className="flex justify-between items-center text-sm text-slate-600 px-3 py-2 border-t">
              <div>
                Exibindo {paginatedMunicipalities.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredMunicipalities.length)} de {filteredMunicipalities.length}
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

export default SelectSearchMunicipality;