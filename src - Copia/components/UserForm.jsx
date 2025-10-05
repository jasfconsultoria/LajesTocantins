import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext'; // Import useAuth
import { logAction } from '@/lib/log'; // Import logAction

const UserForm = ({ isOpen, setIsOpen, onSave }) => {
  const { toast } = useToast();
  const { user: currentUser } = useAuth(); // Get the current logged-in user
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role_name: 'user',
  });
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRoles = async () => {
      const { data, error } = await supabase.from('roles').select('name');
      if (!error) {
        setRoles(data);
      }
    };
    fetchRoles();
  }, []);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleRoleChange = (value) => {
    setFormData((prev) => ({ ...prev, role_name: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: formData,
      });

      if (error) throw error;

      toast({
        title: 'Usuário Criado!',
        description: 'O novo usuário foi adicionado com sucesso.',
      });
      
      if (currentUser && data?.user) {
          await logAction(currentUser.id, 'user_create', `Novo usuário ${data.user.email} (ID: ${data.user.id}) criado com perfil ${formData.role_name}.`, null, data.user.id);
      }

      onSave();
      setIsOpen(false);
      setFormData({ full_name: '', email: '', password: '', role_name: 'user' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar usuário',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Usuário</DialogTitle>
          <DialogDescription>
            Preencha os dados para adicionar um novo membro à equipe.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="full_name" className="text-right">
              Nome
            </Label>
            <Input id="full_name" value={formData.full_name} onChange={handleInputChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input id="email" type="email" value={formData.email} onChange={handleInputChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="password" className="text-right">
              Senha
            </Label>
            <Input id="password" type="password" value={formData.password} onChange={handleInputChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role_name" className="text-right">
              Perfil
            </Label>
            <Select onValueChange={handleRoleChange} defaultValue={formData.role_name}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecione um perfil" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.name} value={role.name}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="save-button">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Usuário
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserForm;