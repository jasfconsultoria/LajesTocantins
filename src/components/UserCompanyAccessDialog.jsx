"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, Building, Star } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { logAction } from '@/lib/log';

const UserCompanyAccessDialog = ({ isOpen, setIsOpen, targetUser, onUpdate }) => {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [allCompanies, setAllCompanies] = useState([]);
  const [userAssociatedCompanies, setUserAssociatedCompanies] = useState(new Set());
  const [userDefaultCompanyId, setUserDefaultCompanyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!targetUser?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Fetch all companies
      const { data: companiesData, error: companiesError } = await supabase.functions.invoke('get-all-companies');
      if (companiesError) throw companiesError;
      setAllCompanies(companiesData);

      // Fetch companies associated with the target user
      const { data: associationData, error: associationError } = await supabase
        .from('emitente_users')
        .select('emitente_id')
        .eq('user_id', targetUser.id);
      if (associationError) throw associationError;
      setUserAssociatedCompanies(new Set(associationData.map(a => a.emitente_id)));

      // Fetch the default company for the target user
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('default_emitente_id')
        .eq('id', targetUser.id)
        .single();
      if (profileError && profileError.code !== 'PGRST116') throw profileError; // PGRST116 means no rows found
      setUserDefaultCompanyId(profileData?.default_emitente_id || null);

    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao carregar dados', description: error.message });
    } finally {
      setLoading(false);
    }
  }, [targetUser, toast]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, fetchData]);

  const handleAssociationChange = async (companyId, isChecked) => {
    setSaving(true);
    try {
      if (isChecked) {
        const { error } = await supabase.from('emitente_users').insert({ emitente_id: companyId, user_id: targetUser.id });
        if (error) throw error;
        setUserAssociatedCompanies(prev => new Set(prev).add(companyId));
        toast({ title: "Empresa associada!" });
        if (currentUser) {
            await logAction(currentUser.id, 'user_associate_company', `Usuário ${targetUser.email} (ID: ${targetUser.id}) associado à empresa (ID: ${companyId}).`, companyId, targetUser.id);
        }
      } else {
        const { error } = await supabase.from('emitente_users').delete().match({ emitente_id: companyId, user_id: targetUser.id });
        if (error) throw error;
        setUserAssociatedCompanies(prev => {
          const newSet = new Set(prev);
          newSet.delete(companyId);
          return newSet;
        });
        // If the disassociated company was the default, unset it
        if (companyId === userDefaultCompanyId) {
            await handleSetDefaultCompany(null); // Unset default
        }
        toast({ title: "Associação removida." });
        if (currentUser) {
            await logAction(currentUser.id, 'user_disassociate_company', `Usuário ${targetUser.email} (ID: ${targetUser.id}) desassociado da empresa (ID: ${companyId}).`, companyId, targetUser.id);
        }
      }
      onUpdate(); // Notify parent to refresh if needed
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao atualizar associação", description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefaultCompany = async (companyId) => {
    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke('set-user-default-company', {
        body: { userId: targetUser.id, companyId: companyId }
      });
      if (error) throw error;
      setUserDefaultCompanyId(companyId);
      toast({ title: 'Empresa padrão definida com sucesso!' });
      if (currentUser) {
          await logAction(currentUser.id, 'user_set_default_company', `Empresa (ID: ${companyId || 'Nenhuma'}) definida como padrão para o usuário ${targetUser.email} (ID: ${targetUser.id}).`, companyId, targetUser.id);
      }
      onUpdate(); // Notify parent to refresh if needed
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao definir empresa padrão', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Gerenciar Empresas para {targetUser?.full_name || targetUser?.email}</DialogTitle>
          <DialogDescription>
            Associe empresas a este usuário e defina uma como padrão.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center items-center h-48"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : (
          <div className="pt-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {allCompanies.length === 0 ? (
                <p className="text-center text-slate-500">Nenhuma empresa cadastrada.</p>
            ) : (
                allCompanies.map(company => (
                <div key={company.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                    <div className="flex items-center gap-2">
                        {company.logo_sistema_url ? (
                            <img src={company.logo_sistema_url} alt="Logo" className="w-6 h-6 rounded-md object-contain" />
                        ) : (
                            <Building className="w-6 h-6 text-slate-500" />
                        )}
                        <p className="font-medium text-slate-800">{company.razao_social}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                    {userAssociatedCompanies.has(company.id) && (
                        <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefaultCompany(company.id)}
                        disabled={userDefaultCompanyId === company.id || saving}
                        className={userDefaultCompanyId === company.id ? 'text-yellow-500' : 'text-slate-400 hover:text-yellow-500'}
                        >
                        <Star className={`w-4 h-4 mr-2 ${userDefaultCompanyId === company.id ? 'fill-current' : ''}`} />
                        {userDefaultCompanyId === company.id ? 'Padrão' : 'Definir Padrão'}
                        </Button>
                    )}
                    <div className="flex items-center space-x-2">
                        <Switch
                        id={`company-${company.id}`}
                        checked={userAssociatedCompanies.has(company.id)}
                        onCheckedChange={(isChecked) => handleAssociationChange(company.id, isChecked)}
                        disabled={saving}
                        />
                        <Label htmlFor={`company-${company.id}`}>Acesso</Label>
                    </div>
                    </div>
                </div>
                ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserCompanyAccessDialog;