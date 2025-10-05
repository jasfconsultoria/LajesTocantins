"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search, User, Building2, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCpfCnpj, normalizeString } from '@/lib/utils';

const SelectSearchClient = ({ 
  value, // O objeto da pessoa selecionada ou null
  onValueChange, // Função para chamar com o objeto da pessoa selecionada ou null
  people, // Array de todas as pessoas disponíveis
  placeholder = "Buscar cliente...",
  className = "",
  disabled = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Atualiza o termo de busca quando o valor externo muda (para exibir o nome do cliente selecionado)
  useEffect(() => {
    if (value) {
      const name = value.nome_fantasia && value.razao_social 
        ? `${value.nome_fantasia} - ${value.razao_social}` 
        : value.razao_social || value.nome_fantasia;
      setSearchTerm(name);
    } else {
      setSearchTerm('');
    }
  }, [value]);

  const filteredPeople = useMemo(() => {
    const normalizedSearchTerm = normalizeString(searchTerm);
    if (!normalizedSearchTerm) {
      return people; 
    }
    return people
      .filter(p => 
        normalizeString(p.razao_social || '').includes(normalizedSearchTerm) ||
        normalizeString(p.nome_fantasia || '').includes(normalizedSearchTerm) ||
        normalizeString(p.cpf_cnpj || '').includes(normalizedSearchTerm) ||
        normalizeString(p.municipio_nome || '').includes(normalizedSearchTerm) ||
        normalizeString(p.uf || '').includes(normalizedSearchTerm)
      );
  }, [people, searchTerm]);

  const handleSelect = (person) => {
    onValueChange(person);
    setSearchTerm(person.nome_fantasia && person.razao_social 
        ? `${person.nome_fantasia} - ${person.razao_social}` 
        : person.razao_social || person.nome_fantasia);
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
    onValueChange(null); // Limpa o valor selecionado ao começar a digitar
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
        } else if (value && searchTerm !== (value.nome_fantasia && value.razao_social 
            ? `${value.nome_fantasia} - ${value.razao_social}` 
            : value.razao_social || value.nome_fantasia)) {
            // Se o usuário digitou algo mas não selecionou, restaura o valor anterior
            setSearchTerm(value.nome_fantasia && value.razao_social 
                ? `${value.nome_fantasia} - ${value.razao_social}` 
                : value.razao_social || value.nome_fantasia);
        }
      }
    }, 200);
  };

  const handleClear = (e) => {
    e.stopPropagation(); // Impede que o evento se propague e feche o dropdown
    onValueChange(null);
    setSearchTerm('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        // Se o campo foi limpo e não há valor selecionado, limpa o termo de busca
        if (!value && searchTerm) {
            setSearchTerm('');
        } else if (value && searchTerm !== (value.nome_fantasia && value.razao_social 
            ? `${value.nome_fantasia} - ${value.razao_social}` 
            : value.razao_social || value.nome_fantasia)) {
            // Se o usuário digitou algo mas não selecionou, restaura o valor anterior
            setSearchTerm(value.nome_fantasia && value.razao_social 
                ? `${value.nome_fantasia} - ${value.razao_social}` 
                : value.razao_social || value.nome_fantasia);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value, searchTerm]);

  const getClientDisplayText = (person) => {
    const name = person.nome_fantasia && person.razao_social 
      ? `${person.nome_fantasia} - ${person.razao_social}` 
      : person.razao_social || person.nome_fantasia;
    
    const document = person.cpf_cnpj 
      ? ` (${person.pessoa_tipo === 1 ? 'CPF' : 'CNPJ'} ${formatCpfCnpj(person.cpf_cnpj, person.pessoa_tipo)})`
      : '';
    
    return `${name}${document}`;
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className="pl-9 pr-9 w-full"
          disabled={disabled}
        />
        {value && !disabled && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 flex items-center justify-center text-slate-500 hover:text-slate-700 rounded-full"
            onClick={handleClear}
            tabIndex={-1} // Impede que o botão receba foco
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {isOpen && (filteredPeople.length > 0 || searchTerm) && ( 
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-md shadow-lg">
          <ScrollArea className="max-h-[200px] overflow-y-auto">
            <div className="py-1">
              {filteredPeople.length === 0 && searchTerm ? (
                <div className="text-sm text-slate-500 text-center py-3">
                  Nenhum cliente encontrado.
                </div>
              ) : (
                filteredPeople.map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none transition-colors"
                    onMouseDown={(e) => e.preventDefault()} 
                    onClick={() => handleSelect(person)}
                  >
                    <div className="flex items-center text-sm font-medium text-slate-800">
                      {person.pessoa_tipo === 1 ? 
                        <User className="w-3 h-3 mr-2 text-blue-500 flex-shrink-0" /> : 
                        <Building2 className="w-3 h-3 mr-2 text-purple-500 flex-shrink-0" />
                      }
                      <span className="truncate">{getClientDisplayText(person)}</span>
                    </div>
                    <div className="text-xs text-slate-500 ml-5 mt-0.5 flex justify-between">
                      <span>
                        {(person.municipio_nome || person.municipio) && `${person.municipio_nome || person.municipio}`}
                        {(person.municipio_nome || person.municipio) && person.uf && '/'}
                        {person.uf}
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

export default SelectSearchClient;