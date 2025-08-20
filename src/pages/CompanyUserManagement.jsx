import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, Building, Users, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const CompanyUserManagement = () => {
    const { id: companyId } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { role } = useAuth();

    const [company, setCompany] = useState(null);
    const [allUsers, setAllUsers] = useState([]);
    const [associatedUserIds, setAssociatedUserIds] = useState(new Set());
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Buscar detalhes da empresa
            const { data: companyData, error: companyError } = await supabase
                .from('emitente')
                .select('razao_social')
                .eq('id', companyId)
                .single();
            if (companyError) throw companyError;
            setCompany(companyData);

            // Buscar todos os usuários (exceto admins)
            const { data: usersData, error: usersError } = await supabase.functions.invoke('get-all-users');
            if (usersError) throw usersError;
            setAllUsers(usersData.filter(u => u.role !== 'admin'));

            // Buscar usuários já associados
            const { data: associationData, error: associationError } = await supabase
                .from('emitente_users')
                .select('user_id')
                .eq('emitente_id', companyId);
            if (associationError) throw associationError;
            setAssociatedUserIds(new Set(associationData.map(a => a.user_id)));

        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao carregar dados",
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    }, [companyId, toast]);

    useEffect(() => {
        if (role === 'admin') {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [fetchData, role]);

    const handleAssociationChange = async (userId, isAssociated) => {
        try {
            if (isAssociated) {
                // Adicionar associação
                const { error } = await supabase
                    .from('emitente_users')
                    .insert({ emitente_id: companyId, user_id: userId });
                if (error) throw error;
                setAssociatedUserIds(prev => new Set(prev).add(userId));
                toast({ title: "Usuário associado com sucesso!" });
            } else {
                // Remover associação
                const { error } = await supabase
                    .from('emitente_users')
                    .delete()
                    .match({ emitente_id: companyId, user_id: userId });
                if (error) throw error;
                setAssociatedUserIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(userId);
                    return newSet;
                });
                toast({ title: "Associação removida com sucesso!" });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao atualizar associação",
                description: error.message,
            });
        }
    };
    
    if (loading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
    }

    if (role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center bg-white/80 rounded-xl shadow-sm border border-white p-8">
                <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-slate-800">Acesso Negado</h2>
                <p className="text-slate-600">Esta área é restrita a administradores.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => navigate('/app/companies')}>
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold gradient-text">Gerenciar Usuários</h1>
                    <p className="text-slate-600 mt-1 flex items-center gap-2">
                        <Building className="w-4 h-4" /> {company?.razao_social || 'Carregando...'}
                    </p>
                </div>
            </div>

            <div className="config-card max-w-3xl mx-auto">
                <div className="config-header">
                    <div className="flex items-center gap-3">
                        <Users className="w-6 h-6 text-blue-600" />
                        <div>
                            <h3 className="config-title">Usuários Associados</h3>
                            <p className="config-description">Ative para permitir que um usuário acesse esta empresa.</p>
                        </div>
                    </div>
                </div>
                <div className="pt-6 space-y-4">
                    {allUsers.length > 0 ? allUsers.map(user => (
                        <div key={user.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                            <div>
                                <p className="font-medium text-slate-800">{user.full_name}</p>
                                <p className="text-sm text-slate-500">{user.email}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id={`user-${user.id}`}
                                    checked={associatedUserIds.has(user.id)}
                                    onCheckedChange={(isChecked) => handleAssociationChange(user.id, isChecked)}
                                />
                                <Label htmlFor={`user-${user.id}`}>Associado</Label>
                            </div>
                        </div>
                    )) : (
                        <p className="text-center text-slate-500 py-4">Nenhum usuário (com perfil 'user') encontrado para associar.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CompanyUserManagement;