import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Save, UserCheck, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const TechRespSettings = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [techRespConfig, setTechRespConfig] = useState({
        tech_resp_cnpj: '',
        tech_resp_contact: '',
        tech_resp_email: '',
        tech_resp_phone: '',
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isConfigured, setIsConfigured] = useState(false);

    const fetchTechRespData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        const { data, error } = await supabase
            .from('nfce_settings')
            .select('tech_resp_cnpj, tech_resp_contact, tech_resp_email, tech_resp_phone')
            .eq('user_id', user.id)
            .single();

        if (data) {
            setTechRespConfig({
                tech_resp_cnpj: data.tech_resp_cnpj || '',
                tech_resp_contact: data.tech_resp_contact || '',
                tech_resp_email: data.tech_resp_email || '',
                tech_resp_phone: data.tech_resp_phone || '',
            });
            if (data.tech_resp_cnpj && data.tech_resp_contact) {
                setIsConfigured(true);
            }
        } else if (error && error.code !== 'PGRST116') {
             toast({
                variant: 'destructive',
                title: 'Erro ao buscar dados',
                description: 'Não foi possível carregar as informações do responsável técnico.',
            });
        } else {
             const mockTechRespConfig = {
                tech_resp_cnpj: '02.340.319/0001-91',
                tech_resp_contact: 'Jose Alves',
                tech_resp_email: 'jasfconsultoria@gmail.com',
                tech_resp_phone: '(63) 99238-9218',
            };
            setTechRespConfig(mockTechRespConfig);
        }
        setIsLoading(false);
    }, [user, toast]);

    useEffect(() => {
        fetchTechRespData();
    }, [fetchTechRespData]);
    
    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setTechRespConfig(prev => ({...prev, [id]: value}));
    };

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        const { error } = await supabase
            .from('nfce_settings')
            .update(techRespConfig)
            .eq('user_id', user.id);

        if (error) {
             toast({
                variant: 'destructive',
                title: 'Erro ao salvar',
                description: `Não foi possível salvar as configurações: ${error.message}`,
            });
        } else {
            setIsConfigured(true);
            toast({
                title: "Configurações Salvas!",
                description: "Os dados do responsável técnico foram atualizados com sucesso.",
            });
        }
        setIsSaving(false);
    };

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
                <h1 className="text-3xl font-bold gradient-text">Responsável Técnico</h1>
                <p className="text-slate-600 mt-2">Configure os dados do responsável técnico que constarão na NFC-e.</p>
            </div>

            <div className="config-card max-w-2xl mx-auto">
                <div className="config-header">
                     <div className="flex items-center space-x-3">
                        <UserCheck className="w-6 h-6 text-blue-600" />
                        <div>
                            <h3 className="config-title">Dados do Responsável Técnico</h3>
                            <p className="config-description">Informações para a tag `infRespTec` do XML.</p>
                        </div>
                    </div>
                    <div className="integration-status">
                        <div className={`status-dot ${isConfigured ? 'status-connected' : 'status-disconnected'}`}></div>
                        <span className="text-sm text-slate-600">{isConfigured ? 'Configurado' : 'Pendente'}</span>
                    </div>
                </div>

                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label" htmlFor="tech_resp_cnpj">CNPJ *</label>
                        <input 
                            id="tech_resp_cnpj"
                            type="text" 
                            className="form-input" 
                            value={techRespConfig.tech_resp_cnpj}
                            placeholder="00.000.000/0001-00"
                            onChange={handleInputChange}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="tech_resp_contact">Nome de Contato *</label>
                        <input 
                            id="tech_resp_contact"
                            type="text" 
                            className="form-input" 
                            value={techRespConfig.tech_resp_contact}
                            placeholder="Nome do responsável"
                            onChange={handleInputChange}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="tech_resp_email">Email *</label>
                        <input 
                            id="tech_resp_email"
                            type="email" 
                            className="form-input" 
                            value={techRespConfig.tech_resp_email}
                            placeholder="contato@empresa.com"
                            onChange={handleInputChange}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="tech_resp_phone">Telefone *</label>
                        <input 
                            id="tech_resp_phone"
                            type="text" 
                            className="form-input" 
                            value={techRespConfig.tech_resp_phone}
                            placeholder="(00) 00000-0000"
                            onChange={handleInputChange}
                        />
                    </div>
                </div>

                <div className="flex justify-end mt-8">
                    <Button 
                        onClick={handleSave}
                        className="save-button"
                        disabled={isSaving}
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Salvar Configurações
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default TechRespSettings;