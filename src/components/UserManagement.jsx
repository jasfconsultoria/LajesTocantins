import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Users, ShieldAlert } from 'lucide-react';
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
    const [emitentes, setEmitentes] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch roles
            const { data: rolesData, error: rolesError } = await supabase.from('roles').select('*');
            if (rolesError) throw rolesError;
            setRoles(rolesData);

            // Fetch emitentes (companies)
            const { data: emitentesData, error: emitentesError } = await supabase.from('emitente').select('id, razao_social');
            if (emitentesError) throw emitentesError;
            setEmitentes(emitentesData);

            // Fetch users with their roles and assigned company
            const { data: usersData, error: usersError } = await supabase
                .from('profiles')
                .select(`
                    id,
                    full_name,
                    user_roles ( role_id, roles ( name ) ),
                    emitente_users ( emitente_id )
                `);
            if (usersError) throw usersError;

            const formattedUsers = usersData.map(u => ({
                id: u.id,
                full_name: u.full_name || 'Usuário sem nome',
                role_id: u.user_roles[0]?.role_id,
                emitente_id: u.emitente_users[0]?.emitente_id?.toString(),
            }));
            setUsers(formattedUsers);

        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao carregar dados",
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (role === 'admin') {
            fetchData();
        }
    }, [role, fetchData]);

    const handleRoleChange = async (userId, newRoleId) => {
        try {
            const { error } = await supabase.from('user_roles').update({ role_id: newRoleId }).eq('user_id', userId);
            if (error) throw error;
            toast({ title: "Função atualizada com sucesso!" });
            fetchData();
        } catch (error) {
            toast({ variant: "destructive", title: "Erro ao atualizar função", description: error.message });
        }
    };

    const handleCompanyAssignment = async (userId, newEmitenteId) => {
        try {
            const { error } = await supabase
                .from('emitente_users')
                .upsert({ user_id: userId, emitente_id: newEmitenteId }, { onConflict: 'user_id' });
            if (error) throw error;
            toast({ title: "Empresa atribuída com sucesso!" });
            fetchData();
        } catch (error) {
            toast({ variant: "destructive", title: "Erro ao atribuir empresa", description: error.message });
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
                <p className="text-slate-600 mt-2">Atribua funções e empresas aos usuários do sistema.</p>
            </div>
            
            <div className="data-table-container">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Função</TableHead>
                            <TableHead>Empresa Atribuída</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((u) => (
                            <TableRow key={u.id}>
                                <TableCell className="font-medium">{u.full_name}</TableCell>
                                <TableCell>
                                    <Select
                                        value={u.role_id}
                                        onValueChange={(newRoleId) => handleRoleChange(u.id, newRoleId)}
                                        disabled={u.id === user.id}
                                    >
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Definir função" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell>
                                     <Select
                                        value={u.emitente_id}
                                        onValueChange={(newEmitenteId) => handleCompanyAssignment(u.id, newEmitenteId)}
                                    >
                                        <SelectTrigger className="w-[280px]">
                                            <SelectValue placeholder="Atribuir empresa" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {emitentes.map(e => <SelectItem key={e.id} value={e.id.toString()}>{e.razao_social}</SelectItem>)}
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