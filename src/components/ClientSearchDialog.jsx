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
import { User, Building2, Search } from 'lucide-react';
import { formatCpfCnpj } from '@/lib/utils'; // Importar a função de formatação

// Helper function for normalization (copied from PeopleList.jsx)
const normalizeString = (str) => {
    if (typeof str !== 'string') return '';
    return str
        .normalize("NFD") // Normalize diacritics
        .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
        .toLowerCase() // Convert to lowercase
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"") // Remove common punctuation
        .replace(/\s{2,}/g," ") // Replace multiple spaces with a single space
        .trim(); // Trim leading/trailing whitespace
};

const ClientSearchDialog = ({ isOpen, setIsOpen, people, onSelectClient }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPeople = useMemo(() => {
    const normalizedSearchTerm = normalizeString(searchTerm);
    if (!normalizedSearchTerm) {
      return people;
    }
    return people.filter(p => {
      const normalizedName = normalizeString(p.razao_social || p.nome_fantasia);
      const normalizedCpfCnpj = normalizeString(p.cpf_cnpj || '');
      const normalizedMunicipio = normalizeString(p.municipio_nome || '');
      const normalizedUf = normalizeString(p.uf || '');

      return (
        normalizedName.includes(normalizedSearchTerm) ||
        normalizedCpfCnpj.includes(normalizedSearchTerm) ||
        normalizedMunicipio.includes(normalizedSearchTerm) ||
        normalizedUf.includes(normalizedSearchTerm)
      );
    });
  }, [people, searchTerm]);

  const handleSelect = (person) => {
    onSelectClient(person); // Pass the full person object
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px] p-0"> {/* Largura ajustada */}
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
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto px-6 pb-6">
          {filteredPeople.length === 0 ? (
            <p className="text-center text-slate-500 py-4">Nenhum cliente encontrado.</p>
          ) : (
            <div className="space-y-2">
              {filteredPeople.map(person => (
                <Button
                  key={person.id}
                  variant="ghost"
                  className="w-full justify-start h-auto py-2 px-3 flex-col items-start text-left" // Adicionado flex-col para layout de duas linhas
                  onClick={() => handleSelect(person)}
                >
                  <div className="flex items-center text-slate-800 font-medium">
                    {person.pessoa_tipo === 1 ? <User className="w-4 h-4 mr-2 text-blue-500" /> : <Building2 className="w-4 h-4 mr-2 text-purple-500" />}
                    {person.nome_fantasia && person.razao_social ? `${person.nome_fantasia} - ${person.razao_social}` : person.razao_social || person.nome_fantasia}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 pl-6"> {/* Ajustado padding para alinhamento */}
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientSearchDialog;