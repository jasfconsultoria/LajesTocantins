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
import { User, Building2, Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCpfCnpj, normalizeString } from '@/lib/utils';

const ITEMS_PER_PAGE = 10;

const SelectSearchClient = ({ value, onValueChange, people, placeholder = "Selecionar cliente..." }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isOpen, setIsOpen] = useState(false);

  const filteredPeople = useMemo(() => {
    const normalizedSearchTerm = normalizeString(searchTerm);
    if (!normalizedSearchTerm) {
      return people;
    }
    return people.filter(p => {
      const normalizedRazaoSocial = normalizeString(p.razao_social || '');
      const normalizedNomeFantasia = normalizeString(p.nome_fantasia || '');
      const normalizedCpfCnpj = normalizeString(p.cpf_cnpj || '');
      const normalizedMunicipio = normalizeString(p.municipio_nome || '');
      const normalizedUf = normalizeString(p.uf || '');

      return (
        normalizedRazaoSocial.includes(normalizedSearchTerm) ||
        normalizedNomeFantasia.includes(normalizedSearchTerm) ||
        normalizedCpfCnpj.includes(normalizedSearchTerm) ||
        normalizedMunicipio.includes(normalizedSearchTerm) ||
        normalizedUf.includes(normalizedSearchTerm)
      );
    });
  }, [people, searchTerm]);

  const paginatedPeople = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPeople.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredPeople, currentPage]);

  const totalPages = Math.ceil(filteredPeople.length / ITEMS_PER_PAGE);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleSelect = (personId) => {
    const selectedPerson = people.find(p => p.id === personId);
    onValueChange(selectedPerson);
    setIsOpen(false);
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleClear = () => {
    onValueChange(null);
    setSearchTerm('');
    setCurrentPage(1);
  };

  const selectedPerson = value ? people.find(p => p.id === value.id) : null;

  const getDisplayText = (person) => {
    if (!person) return placeholder;
    
    const name = person.nome_fantasia && person.razao_social 
      ? `${person.nome_fantasia} - ${person.razao_social}` 
      : person.razao_social || person.nome_fantasia;
    
    const document = person.cpf_cnpj 
      ? ` (${person.pessoa_tipo === 1 ? 'CPF' : 'CNPJ'} ${formatCpfCnpj(person.cpf_cnpj, person.pessoa_tipo)})`
      : '';
    
    return `${name}${document}`;
  };

  return (
    <div className="relative">
      <Select open={isOpen} onOpenChange={setIsOpen} value={value?.id || ''}>
        <SelectTrigger className="w-full">
          <SelectValue>
            {selectedPerson ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  {selectedPerson.pessoa_tipo === 1 ? 
                    <User className="w-4 h-4 mr-2 text-blue-500" /> : 
                    <Building2 className="w-4 h-4 mr-2 text-purple-500" />
                  }
                  <span className="truncate">{getDisplayText(selectedPerson)}</span>
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
              placeholder="Buscar por nome, CPF/CNPJ, cidade ou UF..."
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
            {paginatedPeople.length === 0 ? (
              <div className="text-center text-slate-500 py-4">
                {searchTerm ? 'Nenhum cliente encontrado.' : 'Nenhum cliente disponível.'}
              </div>
            ) : (
              <div className="space-y-1 p-1">
                {paginatedPeople.map(person => (
                  <SelectItem
                    key={person.id}
                    value={person.id}
                    className="flex flex-col items-start py-2 px-3 h-auto"
                  >
                    <div className="flex items-center text-slate-800 font-medium">
                      {person.pessoa_tipo === 1 ? 
                        <User className="w-4 h-4 mr-2 text-blue-500" /> : 
                        <Building2 className="w-4 h-4 mr-2 text-purple-500" />
                      }
                      {person.nome_fantasia && person.razao_social 
                        ? `${person.nome_fantasia} - ${person.razao_social}` 
                        : person.razao_social || person.nome_fantasia}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 pl-6">
                      {person.cpf_cnpj && `${person.pessoa_tipo === 1 ? 'CPF' : 'CNPJ'} ${formatCpfCnpj(person.cpf_cnpj, person.pessoa_tipo)}`}
                      {person.cpf_cnpj && (person.municipio_nome || person.municipio || person.uf) && ' - '}
                      {(person.municipio_nome || person.municipio) && `${person.municipio_nome || person.municipio}`}
                      {(person.municipio_nome || person.municipio) && person.uf && '/'}
                      {person.uf}
                    </div>
                  </SelectItem>
                ))}
              </div>
            )}
          </ScrollArea>

          {filteredPeople.length > ITEMS_PER_PAGE && (
            <div className="flex justify-between items-center text-sm text-slate-600 px-3 py-2 border-t">
              <div>
                Exibindo {paginatedPeople.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredPeople.length)} de {filteredPeople.length}
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

export default SelectSearchClient;