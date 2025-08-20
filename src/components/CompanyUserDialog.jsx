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
import { Loader2, Star } from 'lucide-react';

const CompanyUserDialog = ({ company, isOpen, setIsOpen }) => {
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [associatedUserIds, setAssociatedUserIds] = useState(new Set());
  const [defaultUserId, setDefaultUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    try {
      const { data: usersData, error: usersError } = await supabase.functions.invoke('get-all-users');
      if (usersError) throw usersError;
      setUsers(usersData.filter(u => u.role !== 'admin'));

      const { data: associationData, error: associationError } = await supabase
        .from('emitente_users')
        .select('user_id')
        .eq('emitente_id', company.id);
      if (associationError) throw associationError;
      setAssociatedUserIds(new Set(associationData.map(a => a.user_id)));

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id')
        .eq('default_emitente_id', company.id);
      if (profilesError) throw profilesError;
      setDefaultUserId(profilesData.length > 0 ? profilesData[0].id : null);

    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao carregar dados', description: error.message });
    } finally {
      setLoading(false);
    }
  }, [company, toast]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, fetchData]);

  const handleAssociationChange = async (userId, isAssociated) => {
    try {
      if (isAssociated) {
        const { error } = await supabase.from('emitente_users').insert({ emitente_id: company.id, user_id: userId });
        if (error) throw error;
        setAssociatedUserIds(prev => new Set(prev).add(userId));
        toast({ title: "Usuário associado!" });
      } else {
        const { error } = await supabase.from('emitente_users').delete().match({ emitente_id: company.id, user_id: userId });
        if (error) throw error;
        setAssociatedUserIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
        if (userId === defaultUserId) {
            await supabase.from('profiles').update({ default_emitente_id: null }).eq('id', userId);
            setDefaultUserId(null);
        }
        toast({ title: "Associação removida." });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao atualizar associação", description: error.message });
    }
  };

  const handleSetDefault = async (userId) => {
    try {
      const { error } = await supabase.from('profiles').update({ default_emitente_id: company.id }).eq('id', userId);
      if (error) throw error;
      setDefaultUserId(userId);
      toast({ title: 'Empresa padrão definida com sucesso!' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao definir empresa padrão', description: error.message });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Gerenciar Usuários de {company?.razao_social}</DialogTitle>
          <DialogDescription>
            Associe usuários a esta empresa e defina a empresa padrão para acesso rápido.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center items-center h-48"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : (
          <div className="pt-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {users.map(user => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                <div>
                  <p className="font-medium text-slate-800">{user.full_name}</p>
                  <p className="text-sm text-slate-500">{user.email}</p>
                </div>
                <div className="flex items-center space-x-4">
                  {associatedUserIds.has(user.id) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetDefault(user.id)}
                      disabled={defaultUserId === user.id}
                      className={defaultUserId === user.id ? 'text-yellow-500' : 'text-slate-400 hover:text-yellow-500'}
                    >
                      <Star className={`w-4 h-4 mr-2 ${defaultUserId === user.id ? 'fill-current' : ''}`} />
                      {defaultUserId === user.id ? 'Padrão' : 'Definir Padrão'}
                    </Button>
                  )}
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`user-${user.id}`}
                      checked={associatedUserIds.has(user.id)}
                      onCheckedChange={(isChecked) => handleAssociationChange(user.id, isChecked)}
                    />
                    <Label htmlFor={`user-${user.id}`}>Acesso</Label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CompanyUserDialog;