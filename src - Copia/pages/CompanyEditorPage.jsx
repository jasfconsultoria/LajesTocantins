import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Save, Loader2, ArrowLeft, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LogoUploader from '@/components/LogoUploader';
import { logAction } from '@/lib/log';
import { normalizeCnpj } from '@/lib/utils'; // Importar a função de normalização

const initialCompanyState = {
    razao_social: '', nome_fantasia: '', cnpj: '', inscricao_estadual: '',
    telefone: '', crt: '1', cep: '', codigo_municipio: '', logradouro: '',
    numero: '', complemento: '', bairro: '', municipio: '', uf: '',
    logo_sistema_url: null, logo_documentos_url: null,
};

const CompanyEditorPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();
    const [company, setCompany] = useState(initialCompanyState);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const fetchCompany = useCallback(async () => {
        if (!id || !user) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('emitente')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            if (data) setCompany(data);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao carregar empresa', description: error.message });
        } finally {
            setLoading(false);
        }
    }, [id, user, toast]);

    useEffect(() => {
        fetchCompany();
    }, [fetchCompany]);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setCompany(prev => ({ ...prev, [id]: value }));
    };

    const handleLogoUpload = (type, url) => {
        setCompany(prev => ({ ...prev, [type]: url }));
    };
    
    const handleLogoRemove = (type) => {
        setCompany(prev => ({ ...prev, [type]: null }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const saveData = { 
                ...company, 
                cnpj: normalizeCnpj(company.cnpj), // Normaliza o CNPJ antes de salvar
                updated_at: new Date().toISOString() 
            };
            let error;
            let actionType;
            let description;

            if (id) {
                const { error: updateError } = await supabase
                    .from('emitente')
                    .update(saveData)
                    .eq('id', id);
                error = updateError;
                actionType = 'company_update';
                description = `Empresa ${company.razao_social} (ID: ${id}) atualizada.`;
            } else {
                delete saveData.id;
                const { data: newCompanyData, error: insertError } = await supabase
                    .from('emitente')
                    .insert([saveData])
                    .select(); // Select the inserted data to get the new ID
                error = insertError;
                actionType = 'company_create';
                description = `Nova empresa ${saveData.razao_social} (ID: ${newCompanyData?.[0]?.id}) criada.`;
                if (newCompanyData && newCompanyData.length > 0) {
                    saveData.id = newCompanyData[0].id; // Set the ID for logging
                }
            }

            if (error) throw error;

            if (user) {
                await logAction(user.id, actionType, description, saveData.id);
            }

            toast({ title: 'Sucesso!', description: `Empresa ${id ? 'atualizada' : 'criada'} com sucesso.` });
            navigate('/app/companies');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => navigate('/app/companies')}>
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold gradient-text">{id ? 'Editar Empresa' : 'Nova Empresa'}</h1>
                    <p className="text-slate-600 mt-1">Gerencie as informações e logos da sua empresa.</p>
                </div>
            </div>

            <div className="config-card max-w-5xl mx-auto">
                <div className="config-header">
                    <div className="flex items-center gap-3">
                        <Building className="w-6 h-6 text-blue-600" />
                        <div>
                            <h3 className="config-title">Informações Cadastrais</h3>
                            <p className="config-description">Dados principais do emitente da NFC-e.</p>
                        </div>
                    </div>
                </div>
                <div className="form-grid pt-6">
                    <div className="form-group"><label className="form-label" htmlFor="razao_social">Razão Social *</label><input id="razao_social" type="text" className="form-input" value={company.razao_social} onChange={handleInputChange} /></div>
                    <div className="form-group"><label className="form-label" htmlFor="nome_fantasia">Nome Fantasia</label><input id="nome_fantasia" type="text" className="form-input" value={company.nome_fantasia} onChange={handleInputChange} /></div>
                    <div className="form-group"><label className="form-label" htmlFor="cnpj">CNPJ *</label><input id="cnpj" type="text" className="form-input" value={company.cnpj} onChange={handleInputChange} /></div>
                    <div className="form-group"><label className="form-label" htmlFor="inscricao_estadual">Inscrição Estadual *</label><input id="inscricao_estadual" type="text" className="form-input" value={company.inscricao_estadual} onChange={handleInputChange} /></div>
                    <div className="form-group"><label className="form-label" htmlFor="telefone">Telefone</label><input id="telefone" type="text" className="form-input" value={company.telefone} onChange={handleInputChange} /></div>
                    <div className="form-group"><label className="form-label" htmlFor="crt">Regime Tributário (CRT) *</label><select id="crt" className="form-select" value={company.crt} onChange={handleInputChange}><option value="1">Simples Nacional</option><option value="2">Simples Nacional - excesso</option><option value="3">Regime Normal</option></select></div>
                </div>

                <h3 className="config-title mt-8 pt-6 border-t border-slate-200">Endereço Fiscal</h3>
                <div className="form-grid pt-6">
                    <div className="form-group"><label className="form-label" htmlFor="cep">CEP *</label><input id="cep" type="text" className="form-input" value={company.cep} onChange={handleInputChange} /></div>
                    <div className="form-group"><label className="form-label" htmlFor="logradouro">Logradouro *</label><input id="logradouro" type="text" className="form-input" value={company.logradouro} onChange={handleInputChange} /></div>
                    <div className="form-group"><label className="form-label" htmlFor="numero">Número *</label><input id="numero" type="text" className="form-input" value={company.numero} onChange={handleInputChange} /></div>
                    <div className="form-group"><label className="form-label" htmlFor="complemento">Complemento</label><input id="complemento" type="text" className="form-input" value={company.complemento} onChange={handleInputChange} /></div>
                    <div className="form-group"><label className="form-label" htmlFor="bairro">Bairro *</label><input id="bairro" type="text" className="form-input" value={company.bairro} onChange={handleInputChange} /></div>
                    <div className="form-group"><label className="form-label" htmlFor="codigo_municipio">Cód. Município (IBGE) *</label><input id="codigo_municipio" type="text" className="form-input" value={company.codigo_municipio} onChange={handleInputChange} /></div>
                    <div className="form-group"><label className="form-label" htmlFor="municipio">Cidade *</label><input id="municipio" type="text" className="form-input" value={company.municipio} onChange={handleInputChange} /></div>
                    <div className="form-group"><label className="form-label" htmlFor="uf">UF *</label><select id="uf" className="form-select" value={company.uf} onChange={handleInputChange}><option value="">Selecione</option><option value="AC">AC</option><option value="AL">AL</option><option value="AP">AP</option><option value="AM">AM</option><option value="BA">BA</option><option value="CE">CE</option><option value="DF">DF</option><option value="ES">ES</option><option value="GO">GO</option><option value="MA">MA</option><option value="MT">MT</option><option value="MS">MS</option><option value="MG">MG</option><option value="PA">PA</option><option value="PB">PB</option><option value="PR">PR</option><option value="PE">PE</option><option value="PI">PI</option><option value="RJ">RJ</option><option value="RN">RN</option><option value="RS">RS</option><option value="RO">RO</option><option value="RR">RR</option><option value="SC">SC</option><option value="SP">SP</option><option value="SE">SE</option><option value="TO">TO</option></select></div>
                </div>

                <h3 className="config-title mt-8 pt-6 border-t border-slate-200">Logos da Empresa</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                    <LogoUploader
                        label="Logo do Sistema"
                        description="Usada na página inicial e no topo do sistema."
                        currentLogoUrl={company.logo_sistema_url}
                        onUpload={(url) => handleLogoUpload('logo_sistema_url', url)}
                        onRemove={() => handleLogoRemove('logo_sistema_url')}
                    />
                    <LogoUploader
                        label="Logo para Documentos"
                        description="Usada em recibos, certificados e outros documentos."
                        currentLogoUrl={company.logo_documentos_url}
                        onUpload={(url) => handleLogoUpload('logo_documentos_url', url)}
                        onRemove={() => handleLogoRemove('logo_documentos_url')}
                    />
                </div>
                
                <div className="flex justify-end mt-8">
                    <Button onClick={handleSave} className="save-button" disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Salvar Alterações
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default CompanyEditorPage;