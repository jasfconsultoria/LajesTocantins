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