"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { User, Building2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCpfCnpj } from '@/lib/utils';

// Helper function for normalization (copied from PeopleList.jsx)
const normalizeString = (str) => {
    if (typeof str !== 'string') return '';
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"")
        .replace(/\s{2,}/g," ")
        .trim();
};

const ClientSearchDialog = ({ isOpen, setIsOpen, people, onSelectClient }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

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

  const handleSelect = (person) => {
    onSelectClient(person);
    setIsOpen(false);
    setSearchTerm('');
    setCurrentPage(1);
  };

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setCurrentPage(1);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[700px] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Selecionar Cliente</DialogTitle>
          <DialogDescription>
            Busque e selecione um cliente da lista.
          </DialogDescription>
        </DialogHeader>
        <div className="relative px-6 pb-4">
          <Search className="absolute left-9 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por nome, CPF/CNPJ, cidade ou UF..."
            value={searchTerm}
            onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>
        <ScrollArea className="h-[400px] px-6 pb-6">
          {paginatedPeople.length === 0 ? (
            <p className="text-center text-slate-500 py-4">Nenhum cliente encontrado.</p>
          ) : (
            <div className="space-y-2">
              {paginatedPeople.map(person => (
                <Button
                  key={person.id}
                  variant="ghost"
                  className="w-full justify-start h-auto py-2 px-3 flex-col items-start text-left"
                  onClick={() => handleSelect(person)}
                >
                  <div className="flex items-center text-slate-800 font-medium">
                    {person.pessoa_tipo === 1 ? <User className="w-4 h-4 mr-2 text-blue-500" /> : <Building2 className="w-4 h-4 mr-2 text-purple-500" />}
                    {person.nome_fantasia && person.razao_social ? `${person.nome_fantasia} - ${person.razao_social}` : person.razao_social || person.nome_fantasia}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 pl-6">
                    {person.cpf_cnpj && `${person.pessoa_tipo === 1 ? 'CPF' : 'CNPJ'} ${formatCpfCnpj(person.cpf_cnpj, person.pessoa_tipo)}`}
                    {person.cpf_cnpj && (person.municipio_nome || person.uf) && ' - '}
                    {person.municipio_nome && `${person.municipio_nome}`}
                    {person.municipio_nome && person.uf && '/'}
                    {person.uf}
                  </div>
                </Button>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="flex justify-between items-center text-sm text-slate-600 px-6 py-4 border-t border-slate-200">
            <div>
                Exibindo {paginatedPeople.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredPeople.length)} de {filteredPeople.length} registros
            </div>
            <div className="flex items-center gap-2">
                <span>Página {currentPage} de {totalPages}</span>
                <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage === 1}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Anterior
                </Button>
                <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages}>
                    Próximo
                    <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientSearchDialog;