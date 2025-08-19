import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, History, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';

const Versions = ({ handleNotImplemented }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVersions = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('app_versions')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setVersions(data);
            } catch (error) {
                toast({
                    variant: "destructive",
                    title: "Erro ao carregar versões",
                    description: error.message,
                });
            } finally {
                setLoading(false);
            }
        };

        fetchVersions();
    }, [user, toast]);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };
    
    if (loading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold gradient-text">Histórico de Versões</h1>
                <p className="text-slate-600 mt-2">Acompanhe todas as atualizações e melhorias implementadas no sistema.</p>
            </div>
            
            <div className="card-ui">
                <div className="p-4">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Versão</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Data</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Hash</th>
                                    <th scope="col" className="relative px-6 py-3"><span className="sr-only">Ações</span></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {versions.map((version) => (
                                    <tr key={version.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{version.version}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatDate(version.created_at)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">{version.commit_hash}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" size="sm">
                                                        <Info className="w-4 h-4 mr-2" />
                                                        Detalhes
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Detalhes da Versão {version.version}</DialogTitle>
                                                        <DialogDescription>
                                                            <p className="mt-4 text-slate-700">{version.description || 'Nenhuma descrição fornecida.'}</p>
                                                            <div className="mt-4 text-xs text-slate-500">
                                                                <p><strong>Hash:</strong> {version.commit_hash}</p>
                                                                <p><strong>Data de Lançamento:</strong> {formatDate(version.created_at)}</p>
                                                            </div>
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                </DialogContent>
                                            </Dialog>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Versions;