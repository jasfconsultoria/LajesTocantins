import React from 'react';
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react';

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const getStatusBadge = (status) => {
  const statusMap = {
    authorized: { class: 'status-authorized', text: 'Autorizada', icon: CheckCircle },
    rejected: { class: 'status-rejected', text: 'Rejeitada', icon: XCircle },
    not_issued: { class: 'status-pending', text: 'Pendente', icon: Clock },
    pending: { class: 'status-pending', text: 'Pendente', icon: Clock },
    cancelled: { class: 'status-cancelled', text: 'Cancelada', icon: Trash2 }
  };
  
  const statusInfo = statusMap[status] || statusMap.pending;
  const Icon = statusInfo.icon;
  
  return (
    <span className={`status-badge ${statusInfo.class}`}>
      <Icon className="w-3 h-3 mr-1" />
      {statusInfo.text}
    </span>
  );
};

export const normalizeCnpj = (cnpj) => {
  if (!cnpj) return '';
  return cnpj.replace(/[^\d]/g, ''); // Remove todos os caracteres não numéricos
};

// Função para validar CPF
export const validateCPF = (cpf) => {
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
  cpf = cpf.split('');
  const validator = cpf.filter((digit, index, array) => index >= array.length - 2 && digit).map((digit) => parseInt(digit));
  const rest = (count) => {
    const sum = cpf.filter((digit, index) => index < count).map((digit) => parseInt(digit)).reduce((sum, digit, index) => sum + digit * (count + 1 - index), 0);
    return (((sum * 10) % 11) % 10);
  };
  return rest(9) === validator[0] && rest(10) === validator[1];
};

// Função para validar CNPJ
export const validateCNPJ = (cnpj) => {
  cnpj = cnpj.replace(/[^\d]+/g, '');
  if (cnpj.length !== 14 || !!cnpj.match(/(\d)\1{13}/)) return false;
  cnpj = cnpj.split('');
  const validator = cnpj.filter((digit, index, array) => index >= array.length - 2 && digit).map((digit) => parseInt(digit));
  const rest = (count) => {
    const sum = cnpj.filter((digit, index) => index < count).map((digit) => parseInt(digit)).reduce((sum, digit, index) => sum + digit * ((count + 1) - (index % ((count + 1) - 1))), 0);
    return (((sum * 10) % 11) % 10);
  };
  return rest(12) === validator[0] && rest(13) === validator[1];
};

// Função para validar CPF ou CNPJ
export const validateCpfCnpj = (doc, type) => {
  if (!doc) return false;
  if (type === 1) { // Pessoa Física (CPF)
    return validateCPF(doc);
  } else if (type === 2) { // Pessoa Jurídica (CNPJ)
    return validateCNPJ(doc);
  }
  return false; // Invalid type
};