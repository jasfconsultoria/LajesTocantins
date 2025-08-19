import React, { useState, useEffect, useCallback } from 'react';
import { Save, Zap, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const CompanySettings = ({ handleNotImplemented }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [companyConfig, setCompanyConfig] = useState({
        razao_social: '',
        nome_fantasia: '',
        cnpj: '',
        inscricao_estadual: '',
        crt: '1',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        municipio: '',
        uf: '',
        cep: '',
        telefone: '',
        codigo_municipio: ''
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isConfigured, setIsConfigured] = useState(false);

    const fetchCompanyData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        const { data, error } = await supabase
            .from('emitente')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        if (data) {
            setCompanyConfig({
                razao_social: data.razao_social || '',
                nome_fantasia: data.nome_fantasia || '',
                cnpj: data.cnpj || '',
                inscricao_estadual: data.inscricao_estadual || '',
                crt: data.crt || '1',
                logradouro: data.logradouro || '',
                numero: data.numero || '',
                complemento: data.complemento || '',
                bairro: data.bairro || '',
                municipio: data.municipio || '',
                uf: data.uf || '',
                cep: data.cep || '',
                telefone: data.telefone || '',
                codigo_municipio: data.codigo_municipio || ''
            });
            setIsConfigured(true);
        } else if (error) {
            toast({
                variant: 'destructive',
                title: 'Erro ao buscar dados',
                description: 'Não foi possível carregar as informações da sua empresa.',
            });
        }
        setIsLoading(false);
    }, [user, toast]);

    useEffect(() => {
        fetchCompanyData();
    }, [fetchCompanyData]);

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);

        const upsertData = {
            ...companyConfig,
            user_id: user.id,
            crt: parseInt(companyConfig.crt, 10),
        };

        const { error } = await supabase
            .from('emitente')
            .upsert(upsertData, { onConflict: 'user_id' });

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
                description: "Os dados da sua empresa foram atualizados com sucesso.",
            });
        }
        setIsSaving(false);
    };

    const handleTest = () => {
        toast({
            title: "🚧 Funcionalidade em desenvolvimento",
            description: "O teste de validação de dados será implementado em breve.",
        });
    };
    
    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setCompanyConfig(prev => ({...prev, [id]: value}));
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
                <h1 className="text-3xl font-bold gradient-text">Configurações da Empresa</h1>
                <p className="text-slate-600 mt-2">Configure os dados da sua empresa para a emissão das notas fiscais.</p>
            </div>

            <div className="config-card max-w-4xl mx-auto">
                <div className="config-header">
                     <div className="flex items-center space-x-3">
                        <Building2 className="w-6 h-6 text-blue-600" />
                        <div>
                            <h3 className="config-title">Dados da Empresa</h3>
                            <p className="config-description">Estas informações aparecerão no DANFE da NFC-e.</p>
                        </div>
                    </div>
                    <div className="integration-status">
                        <div className={`status-dot ${isConfigured ? 'status-connected' : 'status-disconnected'}`}></div>
                        <span className="text-sm text-slate-600">{isConfigured ? 'Configurado' : 'Pendente'}</span>
                    </div>
                </div>

                <div className="form-grid-3">
                    <div className="form-group">
                        <label className="form-label" htmlFor="razao_social">Razão Social *</label>
                        <input id="razao_social" type="text" className="form-input" value={companyConfig.razao_social} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="nome_fantasia">Nome Fantasia</label>
                        <input id="nome_fantasia" type="text" className="form-input" value={companyConfig.nome_fantasia} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="cnpj">CNPJ *</label>
                        <input id="cnpj" type="text" className="form-input" value={companyConfig.cnpj} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="inscricao_estadual">Inscrição Estadual *</label>
                        <input id="inscricao_estadual" type="text" className="form-input" value={companyConfig.inscricao_estadual} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="telefone">Telefone</label>
                        <input id="telefone" type="text" className="form-input" value={companyConfig.telefone} onChange={handleInputChange} />
                    </div>
                     <div className="form-group">
                        <label className="form-label" htmlFor="crt">Regime Tributário (CRT) *</label>
                        <select id="crt" className="form-select" value={companyConfig.crt} onChange={handleInputChange}>
                            <option value="1">Simples Nacional</option>
                            <option value="2">Simples Nacional - excesso de sublimite</option>
                            <option value="3">Regime Normal</option>
                        </select>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-200">
                    <h4 className="text-md font-semibold text-slate-800 mb-4">Endereço Fiscal</h4>
                    <div className="form-grid-3">
                        <div className="form-group">
                            <label className="form-label" htmlFor="cep">CEP *</label>
                            <input id="cep" type="text" className="form-input" value={companyConfig.cep} onChange={handleInputChange} />
                        </div>
                         <div className="form-group">
                            <label className="form-label" htmlFor="codigo_municipio">Código do Município (IBGE) *</label>
                            <input id="codigo_municipio" type="text" className="form-input" value={companyConfig.codigo_municipio} onChange={handleInputChange} />
                        </div>
                        <div className="form-group col-span-2 lg:col-span-1">
                            <label className="form-label" htmlFor="logradouro">Logradouro *</label>
                            <input id="logradouro" type="text" className="form-input" value={companyConfig.logradouro} onChange={handleInputChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="numero">Número *</label>
                            <input id="numero" type="text" className="form-input" value={companyConfig.numero} onChange={handleInputChange} />
                        </div>
                        <div className="form-group col-span-2">
                            <label className="form-label" htmlFor="complemento">Complemento</label>
                            <input id="complemento" type="text" className="form-input" value={companyConfig.complemento} onChange={handleInputChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="bairro">Bairro *</label>
                            <input id="bairro" type="text" className="form-input" value={companyConfig.bairro} onChange={handleInputChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="municipio">Cidade *</label>
                            <input id="municipio" type="text" className="form-input" value={companyConfig.municipio} onChange={handleInputChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="uf">UF *</label>
                            <select id="uf" className="form-select" value={companyConfig.uf} onChange={handleInputChange}>
                                <option value="">Selecione</option>
                                <option value="AC">Acre</option>
                                <option value="AL">Alagoas</option>
                                <option value="AP">Amapá</option>
                                <option value="AM">Amazonas</option>
                                <option value="BA">Bahia</option>
                                <option value="CE">Ceará</option>
                                <option value="DF">Distrito Federal</option>
                                <option value="ES">Espírito Santo</option>
                                <option value="GO">Goiás</option>
                                <option value="MA">Maranhão</option>
                                <option value="MT">Mato Grosso</option>
                                <option value="MS">Mato Grosso do Sul</option>
                                <option value="MG">Minas Gerais</option>
                                <option value="PA">Pará</option>
                                <option value="PB">Paraíba</option>
                                <option value="PR">Paraná</option>
                                <option value="PE">Pernambuco</option>
                                <option value="PI">Piauí</option>
                                <option value="RJ">Rio de Janeiro</option>
                                <option value="RN">Rio Grande do Norte</option>
                                <option value="RS">Rio Grande do Sul</option>
                                <option value="RO">Rondônia</option>
                                <option value="RR">Roraima</option>
                                <option value="SC">Santa Catarina</option>
                                <option value="SP">São Paulo</option>
                                <option value="SE">Sergipe</option>
                                <option value="TO">Tocantins</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex space-x-4 mt-8 justify-end">
                    <Button onClick={handleTest} variant="outline" className="test-button">
                        <Zap className="w-4 h-4 mr-2" />
                        Testar
                    </Button>
                    <Button onClick={handleSave} className="save-button" disabled={isSaving}>
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        Salvar Configurações
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default CompanySettings;