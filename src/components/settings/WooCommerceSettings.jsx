import React, { useState, useEffect, useCallback } from 'react';
import { Globe, Save, Zap, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const WooCommerceSettings = ({ isWooConnected, onWooConnectionChange }) => {
    const { toast } = useToast();
    const { user, session } = useAuth();
    
    const [wooConfig, setWooConfig] = useState({
        url: '',
        consumerKey: '',
        consumerSecret: '',
        emissionTrigger: 'processing',
    });
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

    const fetchWooCredentials = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        const { data, error } = await supabase
            .from('woo_credentials')
            .select('site_url, consumer_key, consumer_secret, emission_trigger')
            .eq('user_id', user.id)
            .single();

        if (data) {
            setWooConfig({
                url: data.site_url,
                consumerKey: data.consumer_key,
                consumerSecret: data.consumer_secret,
                emissionTrigger: data.emission_trigger || 'processing',
            });
            onWooConnectionChange(true);
        } else if (error && error.code !== 'PGRST116') {
            toast({ variant: 'destructive', title: 'Erro ao buscar credenciais', description: error.message });
            onWooConnectionChange(false);
        } else {
            onWooConnectionChange(false);
        }
        setIsLoading(false);
    }, [user, toast, onWooConnectionChange]);

    useEffect(() => {
        fetchWooCredentials();
    }, [fetchWooCredentials]);
    
    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setWooConfig(prev => ({...prev, [id]: value }));
    };

    const handleRadioChange = (e) => {
        setWooConfig(prev => ({...prev, emissionTrigger: e.target.value }));
    };

    const handleSave = async (showSuccessToast = true) => {
        if (!wooConfig.url || !wooConfig.consumerKey || !wooConfig.consumerSecret) {
            toast({ variant: 'destructive', title: "Campos Incompletos", description: "Preencha todos os campos para salvar." });
            return false;
        }

        setIsSaving(true);
        toast({ title: "Salvando configurações..." });

        const { error } = await supabase
            .from('woo_credentials')
            .upsert({
                user_id: user.id,
                site_url: wooConfig.url,
                consumer_key: wooConfig.consumerKey,
                consumer_secret: wooConfig.consumerSecret,
                emission_trigger: wooConfig.emissionTrigger,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        setIsSaving(false);

        if (error) {
            toast({ variant: 'destructive', title: "Erro ao Salvar", description: error.message });
            onWooConnectionChange(false);
            return false;
        }

        if (showSuccessToast) {
            toast({ title: "Configurações Salvas com Sucesso!", description: "Suas credenciais e preferências de emissão foram armazenadas." });
        }
        onWooConnectionChange(true);
        return true;
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        toast({ title: "Testando Conexão...", description: `Tentando conectar à sua loja.` });

        const savedSuccessfully = await handleSave(false);
        if (!savedSuccessfully) {
            setIsTesting(false);
            return;
        }
        
        try {
            const { data, error } = await supabase.functions.invoke('sync-woo-orders', {
                 method: 'POST',
                 body: JSON.stringify({ test_connection: true }),
                 headers: {
                     'Content-Type': 'application/json',
                     Authorization: `Bearer ${session.access_token}`
                }
            });
            
            if (error) {
                throw error;
            }

            if (data.error) {
                throw new Error(data.error);
            }

            toast({ title: "Conexão Bem-Sucedida!", description: "A comunicação com sua loja WooCommerce foi estabelecida.", className: "bg-green-100 border-green-300 text-green-800" });
            onWooConnectionChange(true);

        } catch (error) {
            toast({ variant: 'destructive', title: "Falha na Conexão", description: `Não foi possível conectar: ${error.message}` });
            onWooConnectionChange(false);
        } finally {
            setIsTesting(false);
        }
    };

    const handleCopy = () => {
        const webhookUrl = `https://nwccezmpzqoohiachjje.supabase.co/functions/v1/woo-webhook`;
        navigator.clipboard.writeText(webhookUrl);
        toast({ title: "Copiado!", description: "A URL do webhook foi copiada para a área de transferência." });
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold gradient-text">Integração WooCommerce</h1>
                <p className="text-slate-600 mt-2">Conecte sua loja para sincronizar pedidos e automatizar a emissão de NFC-e.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="config-card lg:col-span-2">
                    <div className="config-header">
                        <div>
                            <h3 className="config-title">Configurações da Loja</h3>
                            <p className="config-description">Conecte sua loja WooCommerce ao sistema de NFC-e.</p>
                        </div>
                        <div className="integration-status">
                            {isWooConnected ? (
                                <div className="flex items-center space-x-2 text-green-600">
                                    <CheckCircle className="w-4 h-4" />
                                    <span className="text-sm font-medium">Conectado</span>
                                </div>
                            ) : (
                                <div className="flex items-center space-x-2 text-red-600">
                                    <XCircle className="w-4 h-4" />
                                    <span className="text-sm font-medium">Desconectado</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label" htmlFor="url">URL da Loja *</label>
                            <input 
                                id="url"
                                type="url" 
                                className="form-input" 
                                placeholder="https://sua-loja.com"
                                value={wooConfig.url}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="consumerKey">Consumer Key *</label>
                            <input 
                                id="consumerKey"
                                type="text" 
                                className="form-input" 
                                placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxx"
                                value={wooConfig.consumerKey}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="consumerSecret">Consumer Secret *</label>
                            <input 
                                id="consumerSecret"
                                type="password" 
                                className="form-input" 
                                placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxx"
                                value={wooConfig.consumerSecret}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>

                    <div className="mt-6 webhook-url">
                        <label className="form-label mb-2">URL do Webhook para Emissão Automática</label>
                        <div className="flex items-center space-x-2">
                            <code className="flex-1 p-2 bg-slate-100 rounded text-sm">
                                https://nwccezmpzqoohiachjje.supabase.co/functions/v1/woo-webhook
                            </code>
                            <Button 
                                onClick={handleCopy}
                                variant="outline"
                                size="sm"
                                className="copy-button"
                            >
                                Copiar
                            </Button>
                        </div>
                    </div>

                    <div className="flex space-x-4 mt-8 justify-end">
                        <Button 
                            onClick={handleTestConnection}
                            variant="outline"
                            className="test-button"
                            disabled={isTesting || isSaving}
                        >
                            {isTesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                            {isTesting ? 'Testando...' : 'Testar Conexão'}
                        </Button>
                        <Button 
                            onClick={() => handleSave()}
                            className="save-button"
                            disabled={isSaving || isTesting}
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            {isSaving ? 'Salvando...' : 'Salvar e Conectar'}
                        </Button>
                    </div>
                </div>

                <div className="config-card">
                    <div className="config-header">
                        <div>
                            <h3 className="config-title">Configurações de Emissão</h3>
                            <p className="config-description">Defina quando as notas serão emitidas.</p>
                        </div>
                    </div>

                    <div className="space-y-6 pt-4">
                        <div className="form-group">
                            <label className="form-label">Emitir NFC-e automaticamente quando o status do pedido mudar para:</label>
                            <div className="space-y-3 mt-3">
                                <label className="flex items-center">
                                    <input 
                                        type="radio" 
                                        name="emission-trigger" 
                                        value="processing"
                                        checked={wooConfig.emissionTrigger === 'processing'}
                                        onChange={handleRadioChange}
                                        className="form-radio mr-3" 
                                    />
                                    <span className="text-sm">Processando</span>
                                </label>
                                <label className="flex items-center">
                                    <input 
                                        type="radio" 
                                        name="emission-trigger" 
                                        value="completed"
                                        checked={wooConfig.emissionTrigger === 'completed'}
                                        onChange={handleRadioChange}
                                        className="form-radio mr-3"
                                    />
                                    <span className="text-sm">Concluído</span>
                                </label>
                                <label className="flex items-center">
                                    <input 
                                        type="radio" 
                                        name="emission-trigger" 
                                        value="manual"
                                        checked={wooConfig.emissionTrigger === 'manual'}
                                        onChange={handleRadioChange}
                                        className="form-radio mr-3"
                                    />
                                    <span className="text-sm">Nunca (somente manual)</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WooCommerceSettings;