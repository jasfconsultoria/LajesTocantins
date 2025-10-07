"use client";

import React from 'react';
import { ClipboardList } from 'lucide-react';

const BudgetCompany = ({ companyData, companyAddress }) => {
  if (!companyData) {
    return (
      <div className="flex items-center space-x-3">
        <div className="h-16 w-16 flex items-center justify-center bg-slate-200 rounded-md">
          <ClipboardList className="w-8 h-8 text-slate-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Empresa Não Informada</h1>
          <p className="text-sm text-slate-600">Dados da empresa não disponíveis.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      {companyData.logo_documentos_url ? (
        <img src={companyData.logo_documentos_url} alt="Company Logo" className="h-16 object-contain" />
      ) : (
        <div className="h-16 w-16 flex items-center justify-center bg-slate-200 rounded-md">
          <ClipboardList className="w-8 h-8 text-slate-400" />
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{companyData.razao_social || 'Sua Empresa'}</h1>
        {companyData.nome_fantasia && <p className="text-sm text-slate-600">{companyData.nome_fantasia}</p>}
        <p className="text-sm text-slate-600">{companyData.cnpj}</p>
        <p className="text-sm text-slate-600">{companyAddress}</p>
        <p className="text-sm text-slate-600">{companyData.telefone} | {companyData.email}</p>
      </div>
    </div>
  );
};

export default BudgetCompany;