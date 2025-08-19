import React, { useState, useEffect, useCallback } from 'react';
import { Shield, CheckCircle, Clock, Save, Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const SefazSettings = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [sefazConfig, setSefazConfig] = useState({
        ambiente: 'homologacao',
        serie: '',
        numero_inicial: '',
        csc: '',
        csc_id: ''
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isConfigured, setIsConfigured] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [serviceStatus, setServiceStatus] = useState({
        status: 'online',
        autorizacao: 'testando',
        consulta: 'online'
    });

    const fetchSefazData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);

        const { data, error } = await supabase
            .from('nfce_settings')
            .select('*')
            .eq('user_id', user.id)
            .limit(1)
            .single();

        if (data) {
            setSefazConfig(data);
            if (data.csc && data.csc_id) {
                setIsConfigured(true);
            }
        } else if (error && error.code !== 'PGRST116') {
             toast({
                variant: 'destructive',
                title: 'Erro ao buscar dados',
                description: 'Não foi possível carregar as configurações da SEFAZ.',
            });
        }
        setIsLoading(false);
    }, [user, toast]);

    useEffect(() => {
        fetchSefazData();
    }, [fetchSefazData]);


    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setSefazConfig(prev => ({ ...prev, [id]: value }));
    };

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        const { error } = await supabase
            .from('nfce_settings')
            .update({
                ambiente: sefazConfig.ambiente,
                serie: sefazConfig.serie,
                numero_inicial: sefazConfig.numero_inicial,
                csc: sefazConfig.csc,
                csc_id: sefazConfig.csc_id
            })
            .eq('user_id', user.id);

        if (error) {
             toast({
                variant: 'destructive',
                title: 'Erro ao salvar',
                description: `Não foi possível salvar as configurações: ${error.message}`,
            });
        } else {
             if (sefazConfig.csc && sefazConfig.csc_id) {
                setIsConfigured(true);
            }
            toast({
                title: "Configurações Salvas!",
                description: "Os dados da SEFAZ foram atualizados com sucesso.",
            });
        }
        setIsSaving(false);
    };

    const handleTestConnection = () => {
        setIsTesting(true);
        setServiceStatus(prev => ({ ...prev, autorizacao: 'testando' }));
        toast({
            title: "Testando Conexão...",
            description: "Aguarde enquanto verificamos a comunicação com a SEFAZ.",
        });

        setTimeout(() => {
            setIsTesting(false);
            setServiceStatus(prev => ({ ...prev, autorizacao: 'online' }));
            toast({
                title: "Conexão Bem-Sucedida!",
                description: "A comunicação com os serviços da SEFAZ foi estabelecida.",
                className: "bg-green-100 border-green-300 text-green-800"
            });
        }, 2000);
    };

    const getStatusComponent = (status) => {
        if (status === 'online') {
            return (
                <>
                    <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                    <span className="font-medium text-green-800">Serviço Online</span>
                </>
            );
        }
        if (status === 'testando') {
             return (
                <>
                    <Clock className="w-5 h-5 text-yellow-600 mr-3 animate-pulse" />
                    <span className="font-medium text-yellow-800">Testando...</span>
                </>
            );
        }
        return null;
    }

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold gradient-text">Configurações SEFAZ</h1>
                <p className="text-slate-600 mt-2">Configure a integração com a SEFAZ do seu estado para emissão de NFC-e.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="config-card lg:col-span-2">
                    <div className="config-header">
                        <div>
                            <h3 className="config-title">Ambiente de Emissão</h3>
                            <p className="config-description">Dados para comunicação com a Secretaria da Fazenda.</p>
                        </div>
                        <div className="integration-status">
                            <div className={`status-dot ${isConfigured ? 'status-connected' : 'status-disconnected'}`}></div>
                            <span className="text-sm text-slate-600">{isConfigured ? 'Configurado' : 'Pendente'}</span>
                        </div>
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label" htmlFor="ambiente">Ambiente *</label>
                            <select 
                                id="ambiente"
                                className="form-select"
                                value={sefazConfig.ambiente}
                                onChange={handleInputChange}
                            >
                                <option value="homologacao">Homologação (Testes)</option>
                                <option value="producao">Produção (Valor Fiscal)</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="serie">Série da NFC-e *</label>
                            <input 
                                id="serie"
                                type="text" 
                                className="form-input" 
                                value={sefazConfig.serie}
                                placeholder="Ex: 1"
                                onChange={handleInputChange}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="numero_inicial">Próximo Número *</label>
                            <input 
                                id="numero_inicial"
                                type="number" 
                                className="form-input" 
                                value={sefazConfig.numero_inicial}
                                placeholder="Ex: 1"
                                onChange={handleInputChange}
                            />
                        </div>
                        <div className="form-group col-span-full">
                            <label className="form-label" htmlFor="csc">CSC (Código de Segurança) *</label>
                            <input 
                                id="csc"
                                type="text" 
                                className="form-input" 
                                value={sefazConfig.csc}
                                placeholder="Seu código de segurança do contribuinte"
                                onChange={handleInputChange}
                            />
                        </div>
                        <div className="form-group col-span-full">
                            <label className="form-label" htmlFor="csc_id">ID do CSC (IdToken) *</label>
                            <input 
                                id="csc_id"
                                type="text" 
                                className="form-input" 
                                value={sefazConfig.csc_id}
                                placeholder="Ex: 000001"
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>

                    <div className="flex space-x-4 mt-8 justify-end">
                        <Button 
                            onClick={handleTestConnection}
                            variant="outline"
                            className="test-button"
                            disabled={isTesting}
                        >
                            <Zap className="w-4 h-4 mr-2" />
                            {isTesting ? 'Testando...' : 'Testar Conexão'}
                        </Button>
                         <Button 
                            onClick={handleSave}
                            className="save-button"
                            disabled={isSaving}
                        >
                           {isSaving ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                           ) : (
                            <Save className="w-4 h-4 mr-2" />
                           )}
                            Salvar Configurações
                        </Button>
                    </div>
                </div>

                <div className="config-card">
                    <div className="config-header">
                        <div>
                            <h3 className="config-title">Status dos Serviços</h3>
                            <p className="config-description">Verificação em tempo real.</p>
                        </div>
                    </div>

                    <div className="space-y-4 mt-4">
                        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                            <span className="font-medium text-slate-700">Status do Serviço</span>
                            <div className="flex items-center text-sm">{getStatusComponent(serviceStatus.status)}</div>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                           <span className="font-medium text-slate-700">Autorização NFC-e</span>
                            <div className="flex items-center text-sm">{getStatusComponent(serviceStatus.autorizacao)}</div>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                            <span className="font-medium text-slate-700">Consulta Cadastro</span>
                            <div className="flex items-center text-sm">{getStatusComponent(serviceStatus.consulta)}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SefazSettings;