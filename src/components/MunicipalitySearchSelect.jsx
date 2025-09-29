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
import { Search, MapPin } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area'; // Assuming ScrollArea exists

// Helper function for normalization (copied from PeopleList.jsx)
const normalizeString = (str) => {
    if (typeof str !== 'string') return '';
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

const MunicipalitySearchSelect = ({
  value, // current selected municipality code
  onValueChange, // function to call when a municipality is selected
  municipalities, // array of { codigo, municipio }
  disabled,
  placeholder = "Selecione o Município",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [displayValue, setDisplayValue] = useState('');

  // Update display value when `value` or `municipalities` change
  useEffect(() => {
    if (value && municipalities.length > 0) {
      const selected = municipalities.find(m => m.codigo === value);
      if (selected) {
        setDisplayValue(selected.municipio);
      } else {
        setDisplayValue('');
      }
    } else {
      setDisplayValue('');
    }
  }, [value, municipalities]);

  const filteredMunicipalities = useMemo(() => {
    const normalizedSearchTerm = normalizeString(searchTerm);
    if (!normalizedSearchTerm) {
      return municipalities;
    }
    return municipalities.filter(m => {
      const normalizedName = normalizeString(m.municipio);
      return normalizedName.includes(normalizedSearchTerm);
    });
  }, [municipalities, searchTerm]);

  const handleSelect = (municipalityCode) => {
    onValueChange(municipalityCode);
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
        <MapPin className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px] p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle>Selecionar Município</DialogTitle>
            <DialogDescription>
              Busque e selecione um município da lista.
            </DialogDescription>
          </DialogHeader>
          <div className="relative px-6 pb-4">
            <Search className="absolute left-9 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por nome do município..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <ScrollArea className="h-[300px] px-6 pb-6">
            {filteredMunicipalities.length === 0 ? (
              <p className="text-center text-slate-500 py-4">Nenhum município encontrado.</p>
            ) : (
              <div className="space-y-2">
                {filteredMunicipalities.map(m => (
                  <Button
                    key={m.codigo}
                    variant="ghost"
                    className="w-full justify-start h-auto py-2 px-3"
                    onClick={() => handleSelect(m.codigo)}
                  >
                    <MapPin className="w-4 h-4 mr-2 text-slate-500" />
                    {m.municipio}
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

export default MunicipalitySearchSelect;