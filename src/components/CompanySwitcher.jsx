import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building, Loader2 } from 'lucide-react';

const CompanySwitcher = () => {
  const { user, activeCompany, setActiveCompany, loading: authLoading } = useAuth(); // setActiveCompany here is the new updateActiveCompany
  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  const fetchCompanies = useCallback(async () => {
    if (!user) {
      setCompanies([]);
      setLoadingCompanies(false);
      return;
    }
    setLoadingCompanies(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-all-companies');
      if (error) throw error;
      setCompanies(data);
    } catch (error) {
      console.error("Error fetching companies for switcher:", error.message);
      setCompanies([]);
    } finally {
      setLoadingCompanies(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleCompanyChange = (companyId) => {
    setActiveCompany(parseInt(companyId)); // Call the context function
  };

  if (authLoading || loadingCompanies) {
    return (
      <div className="flex items-center space-x-2 text-slate-600">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Carregando...</span>
      </div>
    );
  }

  if (!user || companies.length === 0) {
    return (
      <div className="flex items-center space-x-3">
        <img src="/lajes-tocantins-logo.jpg" alt="Lajes Tocantins Logo" className="h-10" />
      </div>
    );
  }

  return (
    <Select onValueChange={handleCompanyChange} value={activeCompany?.id?.toString()}>
      <SelectTrigger className="w-[200px] h-auto py-2 px-3 flex items-center space-x-2 bg-white/60 border border-white/30 rounded-lg shadow-sm hover:bg-white/80 transition-colors">
        {activeCompany?.logo_sistema_url ? (
          <img src={activeCompany.logo_sistema_url} alt="Logo da Empresa" className="w-7 h-7 rounded-md object-contain bg-white p-0.5" />
        ) : (
          <div className="w-7 h-7 bg-gradient-to-r from-blue-600 to-purple-600 rounded-md flex items-center justify-center">
            <Building className="w-4 h-4 text-white" />
          </div>
        )}
        <SelectValue placeholder="Selecione uma empresa">
          {activeCompany ? (
            <span className="font-semibold text-slate-800 truncate">{activeCompany.razao_social}</span>
          ) : (
            <span className="text-slate-500">Selecione uma empresa</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {companies.map((company) => (
          <SelectItem key={company.id} value={company.id.toString()}>
            {company.razao_social}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CompanySwitcher;