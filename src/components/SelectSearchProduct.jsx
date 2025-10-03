"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Package } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { normalizeString, formatCurrency } from '@/lib/utils';

const SelectSearchProduct = ({ 
  products, 
  onSelect, 
  placeholder = "Buscar produto...",
  className = ""
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const filteredProducts = useMemo(() => {
    // Removido o limite de fatiamento para permitir que todos os produtos correspondentes sejam rolados
    const normalizedSearchTerm = normalizeString(searchTerm);
    if (!normalizedSearchTerm) {
      return products; 
    }
    return products
      .filter(p => 
        normalizeString(p.busca_completa || '').includes(normalizedSearchTerm) ||
        normalizeString(p.prod_xProd || '').includes(normalizedSearchTerm) ||
        normalizeString(p.prod_cProd || '').includes(normalizedSearchTerm)
      );
  }, [products, searchTerm]);

  const handleSelect = (product) => {
    onSelect(product);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputBlur = (e) => {
    // Pequeno atraso para permitir o clique nos itens antes de fechar o dropdown
    setTimeout(() => {
      if (containerRef.current && !containerRef.current.contains(document.activeElement)) {
        setIsOpen(false);
      }
    }, 200);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          className="pl-9 pr-3 w-full"
        />
      </div>

      {isOpen && (filteredProducts.length > 0 || searchTerm) && ( 
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60">
          <ScrollArea className="max-h-[200px]"> {/* Altura máxima explícita para a barra de rolagem */}
            <div className="py-1">
              {filteredProducts.length === 0 && searchTerm ? (
                <div className="text-sm text-slate-500 text-center py-3">
                  Nenhum produto encontrado.
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none transition-colors"
                    onMouseDown={(e) => e.preventDefault()} {/* Impede o blur imediato ao clicar */}
                    onClick={() => handleSelect(product)}
                  >
                    <div className="flex items-center text-sm font-medium text-slate-800">
                      <Package className="w-3 h-3 mr-2 text-blue-500 flex-shrink-0" />
                      <span className="truncate">{product.prod_xProd}</span>
                    </div>
                    <div className="text-xs text-slate-500 ml-5 mt-0.5 flex justify-between">
                      <span>Cód: {product.prod_cProd} | Unid: {product.prod_uCOM_descricao}</span>
                      <span className="font-medium text-green-600 ml-2">
                        {formatCurrency(product.prod_vUnCOM || 0)}
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

export default SelectSearchProduct;