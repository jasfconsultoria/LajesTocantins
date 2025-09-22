import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ShieldAlert, Search, PlusCircle, Edit, Trash2, Eye, Shield, ChevronLeft, ChevronRight, Users, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import UserForm from './UserForm';
import UserCompanyAccessDialog from './UserCompanyAccessDialog'; // Import the new dialog
import { logAction } from '@/lib/log';

const UserManagement = () => {
    const { handleNotImplemented } = useOutletContext();
    const { user: currentUser, role } = useAuth();
    const { toast } = useToast();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isCompanyAccessDialogOpen, setIsCompanyAccessDialogOpen] = useState(false); // New state for company access dialog
    const [userToManageCompanies, setUserToManageCompanies] = useState(null); // New state to hold the user for company management
    const ITEMS_PER_PAGE = 10;

    const fetchUsers = useCallback(async () => {
        if (role !== 'admin') {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('get-all-users');
            
            if (error) throw error;

            const sortedUsers = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setUsers(sortedUsers);

        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao carregar usuários",
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    }, [role, toast]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const filteredUsers = useMemo(() => {
        return users.filter(u =>
            (u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (u.email?.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [users, searchTerm]);

    const paginatedUsers = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredUsers, currentPage]);

    const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const handleSaveSuccess = () => {
        fetchUsers();
    };

    const handleUserAction = (action, targetUser) => {
        if (currentUser) {
            let description = '';
            let actionType = '';
            switch (action) {
                case 'Visualizar Usuário':
                    actionType = 'user_view';
                    description = `Visualizou detalhes do usuário ${targetUser.email} (ID: ${targetUser.id}).`;
                    break;
                case 'Editar Permissões':
                    actionType = 'user_edit_permissions';
                    description = `Tentou editar permissões do usuário ${targetUser.email} (ID: ${targetUser.id}).`;
                    break;
                case 'Editar Usuário':
                    actionType = 'user_edit';
                    description = `Tentou editar informações do usuário ${targetUser.email} (ID: ${targetUser.id}).`;
                    break;
                case 'Excluir Usuário':
                    actionType = 'user_delete';
                    description = `Tentou excluir o usuário ${targetUser.email} (ID: ${targetUser.id}).`;
                    break;
                default:
                    actionType = 'unknown_user_action';
                    description = `Ação desconhecida em usuário (ID: ${targetUser.id}).`;
            }
            logAction(currentUser.id, actionType, description, null, targetUser.id);
        }
        handleNotImplemented(action);
    };

    const handleOpenCompanyAccessDialog = (user) => {
        setUserToManageCompanies(user);
        setIsCompanyAccessDialogOpen(true);
    };

    const getRoleBadge = (roleName) => {
        const lowerCaseRole = roleName?.toLowerCase();
        let colorClasses = 'bg-slate-200 text-slate-700';
        if (lowerCaseRole === 'admin') {
            colorClasses = 'bg-green-100 text-green-800';
        } else if (lowerCaseRole === 'user') {
            colorClasses = 'bg-blue-100 text-blue-800';
        }
        return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClasses}`}>{roleName}</span>;
    };

    if (role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center bg-white/80 rounded-xl shadow-sm border border-white p-8">
                <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-slate-800">Acesso Negado</h2>
                <p className="text-slate-600">Você não tem permissão para acessar esta página.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold gradient-text flex items-center gap-2">
                        <Users className="w-8 h-8" />
                        Lista de Usuários
                    </h1>
                    <p className="text-slate-600 mt-2">Visualize e gerencie usuários cadastrados.</p>
                </div>
                <Button onClick={() => setIsFormOpen(true)} className="save-button">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Novo Usuário
                </Button>
            </div>

            <div className="bg-white/80 p-4 rounded-xl shadow-sm border border-white">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                        type="text"
                        placeholder="Buscar por nome ou email..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>
            </div>
            
            {loading ? (
                 <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
            ) : (
                <div className="data-table-container">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Perfil</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedUsers.map((u) => (
                                <TableRow key={u.id}>
                                    <TableCell className="font-medium">{u.full_name}</TableCell>
                                    <TableCell>{u.email}</TableCell>
                                    <TableCell>{getRoleBadge(u.role)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleUserAction('Visualizar Usuário', u)}>
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenCompanyAccessDialog(u)}> {/* New button */}
                                                <Building className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleUserAction('Editar Permissões', u)}>
                                                <Shield className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleUserAction('Editar Usuário', u)}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleUserAction('Excluir Usuário', u)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <div className="flex justify-between items-center text-sm text-slate-600 mt-4">
                <div>
                    Exibindo {paginatedUsers.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} de {filteredUsers.length} registros
                </div>
                <div className="flex items-center gap-2">
                    <span>Página {currentPage} de {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage === 1}>
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Anterior
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages}>
                        Próximo
                        <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            </div>
            <UserForm 
                isOpen={isFormOpen}
                setIsOpen={setIsFormOpen}
                onSave={handleSaveSuccess}
            />
            {userToManageCompanies && (
                <UserCompanyAccessDialog
                    isOpen={isCompanyAccessDialogOpen}
                    setIsOpen={setIsCompanyAccessDialogOpen}
                    targetUser={userToManageCompanies}
                    onUpdate={fetchUsers} // Pass fetchUsers to refresh the list after changes
                />
            )}
        </div>
    );
};

export default UserManagement;