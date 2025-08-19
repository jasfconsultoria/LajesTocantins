import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Users, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const UserManagement = () => {
    const { user, role } = useAuth();
    const { toast } = useToast();
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchUsersAndRoles = useCallback(async () => {
        setLoading(true);
        try {
            const { data: rolesData, error: rolesError } = await supabase
                .from('roles')
                .select('*');
            if (rolesError) throw rolesError;
            setRoles(rolesData);

            const { data: usersData, error: usersError } = await supabase
                .from('profiles')
                .select(`
                    id,
                    full_name,
                    user_roles (
                        role_id,
                        roles ( name )
                    )
                `);
            if (usersError) throw usersError;

            const formattedUsers = usersData.map(u => ({
                id: u.id,
                full_name: u.full_name,
                email: 'Carregando...', // O email está em auth.users, que não é diretamente consultável por segurança
                role_id: u.user_roles[0]?.role_id,
                role_name: u.user_roles[0]?.roles?.name,
            }));
            setUsers(formattedUsers);

        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao carregar usuários",
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (role === 'admin') {
            fetchUsersAndRoles();
        }
    }, [role, fetchUsersAndRoles]);

    const handleRoleChange = async (userId, newRoleId) => {
        try {
            const { error } = await supabase
                .from('user_roles')
                .update({ role_id: newRoleId })
                .eq('user_id', userId);

            if (error) throw error;

            toast({
                title: "Função atualizada!",
                description: "A função do usuário foi alterada com sucesso.",
            });
            fetchUsersAndRoles();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao atualizar função",
                description: error.message,
            });
        }
    };

    if (role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-slate-800">Acesso Negado</h2>
                <p className="text-slate-600">Você não tem permissão para acessar esta página.</p>
            </div>
        );
    }

    if (loading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold gradient-text">Gerenciamento de Usuários</h1>
                <p className="text-slate-600 mt-2">Adicione, remova e edite as permissões dos usuários do sistema.</p>
            </div>
            
            <div className="data-table-container">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Função</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((u) => (
                            <TableRow key={u.id}>
                                <TableCell className="font-medium">{u.full_name || 'Usuário sem nome'}</TableCell>
                                <TableCell>
                                    <Select
                                        value={u.role_id}
                                        onValueChange={(newRoleId) => handleRoleChange(u.id, newRoleId)}
                                        disabled={u.id === user.id} // Impede que o admin altere a própria função
                                    >
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Selecione a função" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {roles.map(r => (
                                                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default UserManagement;