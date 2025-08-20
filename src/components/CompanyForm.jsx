import React, { useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const initialCompanyState = {
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    inscricao_estadual: '',
    telefone: '',
    crt: '1',
    cep: '',
    codigo_municipio: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    municipio: '',
    uf: '',
};

const CompanyForm = ({ isOpen, setIsOpen, onSave }) => {
    const { toast } = useToast();
    const [companyConfig, setCompanyConfig] = useState(initialCompanyState);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase.functions.invoke('create-company', {
                body: companyConfig,
            });

            if (error) throw error;

            toast({
                title: "Empresa Criada!",
                description: "A nova empresa foi adicionada com sucesso.",
            });
            onSave();
            setIsOpen(false);
            setCompanyConfig(initialCompanyState);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro ao criar empresa',
                description: error.message,
            });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setCompanyConfig(prev => ({...prev, [id]: value}));
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Nova Empresa</DialogTitle>
                    <DialogDescription>
                        Preencha os dados da empresa (emitente) para a emissão das notas fiscais.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="form-grid-3 py-4">
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
                                <option value="AC">Acre</option><option value="AL">Alagoas</option><option value="AP">Amapá</option><option value="AM">Amazonas</option><option value="BA">Bahia</option><option value="CE">Ceará</option><option value="DF">Distrito Federal</option><option value="ES">Espírito Santo</option><option value="GO">Goiás</option><option value="MA">Maranhão</option><option value="MT">Mato Grosso</option><option value="MS">Mato Grosso do Sul</option><option value="MG">Minas Gerais</option><option value="PA">Pará</option><option value="PB">Paraíba</option><option value="PR">Paraná</option><option value="PE">Pernambuco</option><option value="PI">Piauí</option><option value="RJ">Rio de Janeiro</option><option value="RN">Rio Grande do Norte</option><option value="RS">Rio Grande do Sul</option><option value="RO">Rondônia</option><option value="RR">Roraima</option><option value="SC">Santa Catarina</option><option value="SP">São Paulo</option><option value="SE">Sergipe</option><option value="TO">Tocantins</option>
                            </select>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSave} className="save-button" disabled={isSaving}>
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Salvar Empresa
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CompanyForm;