import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Save, Loader2, ArrowLeft, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { logAction } from '@/lib/log';
import SelectSearchUnit from '@/components/SelectSearchUnit';

const initialProductState = {
    prod_cProd: '', prod_cEAN: '', prod_xProd: '', prod_NCM: '',
    prod_uCOM: '', prod_vUnCOM: 0.0,
    icms_pICMS: 0.0, icms_pRedBC: 0.0, icms_modBC: 0, icms_CST: '',
    pis_CST: '', pis_pPIS: 0.0, cofins_CST: '', cofins_pCOFINS: 0.0,
    IPI_CST: '', IPI_pIPI: 0.0, icms_orig: 0, prod_ativo: 'S',
    // Campos removidos do DB: prod_rastro, prod_indEscala, prod_CNPJFab, prod_cBenef, icms_pMVAST, prod_nivelm, prod_alert
};

const icmsModbcOptions = [
    { value: 0, label: '0 - Margem Valor Agregado (%)' },
    { value: 1, label: '1 - Pauta (Valor)' },
    { value: 2, label: '2 - Preço Tabelado Máx. (valor)' },
    { value: 3, label: '3 - Valor da Operação' },
    { value: 4, label: '4 - Custo Unitário' },
    { value: 5, label: '5 - Valor da Entrada' },
    { value: 6, label: '6 - Valor da Operação e Custo Unitário' },
];

const icmsOrigOptions = [
    { value: 0, label: '0 - Nacional, exceto as indicadas nos códigos 3, 4, 5 e 8' },
    { value: 1, label: '1 - Estrangeira - Importação direta, exceto a indicada no código 6' },
    { value: 2, label: '2 - Estrangeira - Adquirida no mercado interno, exceto a indicada no código 7' },
    { value: 3, label: '3 - Nacional, mercadoria ou bem com Conteúdo de Importação superior a 40% e inferior ou igual a 70%' },
    { value: 4, label: '4 - Nacional, cuja produção tenha sido feita em conformidade com os processos produtivos básicos de que tratam as legislações pertinentes' },
    { value: 5, label: '5 - Nacional, mercadoria ou bem com Conteúdo de Importação superior a 70%' },
    { value: 6, label: '6 - Estrangeira - Importação direta, sem similar nacional, constante em lista de Resolução CAMEX e gás natural' },
    { value: 7, label: '7 - Estrangeira - Adquirida no mercado interno, sem similar nacional, constante em lista de Resolução CAMEX e gás natural' },
    { value: 8, label: '8 - Nacional, mercadoria ou bem com Conteúdo de Importação inferior ou igual a 40%' },
];

const yesNoOptions = [
    { value: 'S', label: 'Sim' },
    { value: 'N', label: 'Não' },
];

const ProductEditorPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();
    const { activeCompanyId } = useOutletContext();

    const [product, setProduct] = useState(initialProductState);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const formatCurrency = (value) => {
        if (value === null || value === undefined) return '';
        return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };

    const fetchProduct = useCallback(async () => {
        if (!id) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('produtos')
                .select('*')
                .eq('id', id)
                .single();
            if (error) {
                console.error("Error fetching product (ProductEditorPage):", error);
                throw error;
            }
            if (data) setProduct(data);
        } catch (error) {
            console.error("Caught error fetching product (ProductEditorPage):", error);
            toast({ variant: 'destructive', title: 'Erro ao carregar produto', description: error.message || 'Ocorreu um erro inesperado ao carregar o produto.' });
        } finally {
            setLoading(false);
        }
    }, [id, toast]);

    useEffect(() => {
        fetchProduct();
    }, [fetchProduct]);

    const handleInputChange = (e) => {
        const { id, value, type } = e.target;
        let parsedValue = value;

        if (id === 'prod_vUnCOM') {
            const cleanedValue = value.replace(',', '.').replace(/[^\d.]/g, '');
            parsedValue = cleanedValue === '' ? null : parseFloat(cleanedValue);
            if (isNaN(parsedValue)) parsedValue = null;
        } else if (type === 'number') {
            parsedValue = parseFloat(value);
        }

        setProduct(prev => ({
            ...prev,
            [id]: parsedValue
        }));
    };

    const handleSelectChange = (id, value) => {
        setProduct(prev => ({
            ...prev,
            [id]: id === 'prod_uCOM' ? parseInt(value, 10) : value
        }));
    };

    const handleSave = async () => {
        if (!activeCompanyId) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Nenhuma empresa ativa selecionada para salvar o produto.' });
            return;
        }

        setSaving(true);
        try {
            const saveData = { 
                ...product, 
                id_emit: activeCompanyId, 
                updated_at: new Date().toISOString(),
                // Explicitly set removed fields to null or default if they exist in the DB schema
                // These fields were removed from the DB, so we ensure they are not sent.
                prod_rastro: null,
                prod_indEscala: null,
                prod_CNPJFab: null,
                prod_cBenef: null,
                icms_pMVAST: null,
                prod_nivelm: null,
                prod_alert: null,
                prod_CEST_Opc: null, // Already removed from UI, ensuring it's null
                prod_CFOP: null,     // Already removed from UI, ensuring it's null
            };
            let error;
            let actionType;
            let description;

            if (id) {
                const { error: updateError } = await supabase
                    .from('produtos')
                    .update(saveData)
                    .eq('id', id);
                error = updateError;
                actionType = 'product_update';
                description = `Produto "${product.prod_xProd}" (ID: ${id}) atualizado.`;
            } else {
                delete saveData.id; 
                const { data: newProductData, error: insertError } = await supabase
                    .from('produtos')
                    .insert([saveData])
                    .select();
                error = insertError;
                actionType = 'product_create';
                description = `Novo produto "${saveData.prod_xProd}" (ID: ${newProductData?.[0]?.id}) criado.`;
                if (newProductData && newProductData.length > 0) {
                    saveData.id = newProductData[0].id;
                }
            }

            if (error) {
                console.error("Error saving product (ProductEditorPage):", error);
                throw error;
            }

            if (user) {
                await logAction(user.id, actionType, description, activeCompanyId, null);
            }

            toast({ title: 'Sucesso!', description: `Produto ${id ? 'atualizado' : 'criado'} com sucesso.` });
            navigate('/app/products');
        } catch (error) {
            console.error("Caught error in handleSave (ProductEditorPage):", error);
            toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message || 'Ocorreu um erro inesperado ao salvar o produto.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
    }

    if (!activeCompanyId) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center bg-white/80 rounded-xl shadow-sm border border-white p-8">
                <Package className="w-16 h-16 text-blue-500 mb-4" />
                <h2 className="text-2xl font-bold text-slate-800">Nenhuma Empresa Ativa</h2>
                <p className="text-slate-600">Selecione uma empresa para adicionar ou editar produtos.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => navigate('/app/products')}>
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold gradient-text">{id ? 'Editar Produto' : 'Novo Produto'}</h1>
                    <p className="text-slate-600 mt-1">Gerencie os detalhes do produto ou serviço.</p>
                </div>
            </div>

            <div className="config-card max-w-5xl mx-auto">
                <div className="config-header">
                    <div className="flex items-center gap-3">
                        <Package className="w-6 h-6 text-blue-600" />
                        <div>
                            <h3 className="config-title">Dados Gerais do Produto</h3>
                            <p className="config-description">Informações básicas e de identificação do produto.</p>
                        </div>
                    </div>
                </div>
                <div className="form-grid pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
                    {/* Row 1: Código do Produto, GTIN/EAN, Unidade Comercial, Valor Unitário Comercial */}
                    <div className="form-group lg:col-span-3">
                        <Label htmlFor="prod_cProd" className="form-label">Código Interno</Label>
                        <Input id="prod_cProd" type="text" className="form-input" value={product.prod_cProd} onChange={handleInputChange} placeholder="Ex: PROD001" />
                    </div>
                    <div className="form-group lg:col-span-3">
                        <Label htmlFor="prod_cEAN" className="form-label">GTIN/EAN</Label>
                        <Input id="prod_cEAN" type="text" className="form-input" value={product.prod_cEAN} onChange={handleInputChange} placeholder="Ex: 7891234567890" />
                    </div>
                    <div className="form-group lg:col-span-3">
                        <Label htmlFor="prod_uCOM" className="form-label">Unidade Comercial *</Label>
                        <SelectSearchUnit
                            value={product.prod_uCOM?.toString()}
                            onValueChange={(value) => handleSelectChange('prod_uCOM', value)}
                            disabled={saving}
                            placeholder="Selecione a Unidade"
                            required
                        />
                    </div>
                    <div className="form-group lg:col-span-3">
                        <Label htmlFor="prod_vUnCOM" className="form-label">Valor Unitário Comercial</Label>
                        <Input
                            id="prod_vUnCOM"
                            type="text"
                            className="form-input"
                            value={product.prod_vUnCOM !== null ? formatCurrency(product.prod_vUnCOM) : ''}
                            onChange={handleInputChange}
                            placeholder="Ex: 10,50"
                        />
                    </div>

                    {/* Row 2: Nome do Produto (prod_xProd) */}
                    <div className="form-group lg:col-span-10"> {/* Ajustado para ocupar mais espaço */}
                        <Label htmlFor="prod_xProd" className="form-label">Nome do Produto *</Label>
                        <Input id="prod_xProd" type="text" className="form-input" value={product.prod_xProd} onChange={handleInputChange} required placeholder="Ex: Laje Treliçada H8" />
                    </div>

                    {/* Ativo agora ocupa 2 colunas */}
                    <div className="form-group lg:col-span-2"> 
                        <Label htmlFor="prod_ativo" className="form-label">Ativo</Label>
                        <Select onValueChange={(value) => handleSelectChange('prod_ativo', value)} value={product.prod_ativo}>
                            <SelectTrigger id="prod_ativo" className="form-select"><SelectValue /></SelectTrigger>
                            <SelectContent>{yesNoOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>

                    {/* NCM agora ocupa 2 colunas */}
                    <div className="form-group lg:col-span-12"> 
                        <Label htmlFor="prod_NCM" className="form-label">NCM</Label>
                        <Input id="prod_NCM" type="text" className="form-input" value={product.prod_NCM} onChange={handleInputChange} placeholder="Ex: 68101100" />
                    </div>
                </div>

                <h3 className="config-title mt-8 pt-6 border-t border-slate-200">ICMS</h3>
                <div className="form-grid pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
                    {/* Primeira linha */}
                    <div className="form-group lg:col-span-8">
                        <Label htmlFor="icms_orig" className="form-label">Origem da Mercadoria</Label>
                        <Select onValueChange={(value) => handleSelectChange('icms_orig', parseInt(value))} value={(product.icms_orig ?? 0).toString()}>
                            <SelectTrigger id="icms_orig" className="form-select">
                                <SelectValue placeholder="Selecione a origem" className="text-left flex-1" />
                            </SelectTrigger>
                            <SelectContent>{icmsOrigOptions.map(opt => <SelectItem key={opt.value} value={opt.value.toString()}>{opt.label}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="form-group lg:col-span-4">
                        <Label htmlFor="icms_modBC" className="form-label">Modalidade BC ICMS</Label>
                        <Select onValueChange={(value) => handleSelectChange('icms_modBC', parseInt(value))} value={(product.icms_modBC ?? 0).toString()}>
                            <SelectTrigger id="icms_modBC" className="form-select">
                                <SelectValue placeholder="Selecione a modalidade" className="text-left flex-1" />
                            </SelectTrigger>
                            <SelectContent>{icmsModbcOptions.map(opt => <SelectItem key={opt.value} value={opt.value.toString()}>{opt.label}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>

                    {/* Segunda linha */}
                    <div className="form-group lg:col-span-4">
                        <Label htmlFor="icms_pRedBC" className="form-label">% Redução BC ICMS</Label>
                        <Input id="icms_pRedBC" type="number" step="0.01" className="form-input" value={product.icms_pRedBC} onChange={handleInputChange} placeholder="Ex: 0.00" />
                    </div>
                    <div className="form-group lg:col-span-4">
                        <Label htmlFor="icms_pICMS" className="form-label">% Alíquota ICMS</Label>
                        <Input id="icms_pICMS" type="number" step="0.01" className="form-input" value={product.icms_pICMS} onChange={handleInputChange} placeholder="Ex: 17.00" />
                    </div>
                    <div className="form-group lg:col-span-4">
                        <Label htmlFor="icms_CST" className="form-label">CST ICMS</Label>
                        <Input id="icms_CST" type="text" className="form-input" value={product.icms_CST} onChange={handleInputChange} placeholder="Ex: 00" />
                    </div>
                </div>

                {/* Nova estrutura para PIS, COFINS, IPI em uma única linha */}
                <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Container PIS */}
                    <div className="config-card p-4">
                        <h3 className="config-title mb-4">PIS</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-group">
                                <Label htmlFor="pis_CST" className="form-label">CST PIS</Label>
                                <Input id="pis_CST" type="text" className="form-input" value={product.pis_CST} onChange={handleInputChange} placeholder="Ex: 01" />
                            </div>
                            <div className="form-group">
                                <Label htmlFor="pis_pPIS" className="form-label">% Alíquota PIS</Label>
                                <Input id="pis_pPIS" type="number" step="0.01" className="form-input" value={product.pis_pPIS} onChange={handleInputChange} placeholder="Ex: 0.65" />
                            </div>
                        </div>
                    </div>

                    {/* Container COFINS */}
                    <div className="config-card p-4">
                        <h3 className="config-title mb-4">COFINS</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-group">
                                <Label htmlFor="cofins_CST" className="form-label">CST COFINS</Label>
                                <Input id="cofins_CST" type="text" className="form-input" value={product.cofins_CST} onChange={handleInputChange} placeholder="Ex: 01" />
                            </div>
                            <div className="form-group">
                                <Label htmlFor="cofins_pCOFINS" className="form-label">% Alíquota COFINS</Label>
                                <Input id="cofins_pCOFINS" type="number" step="0.01" className="form-input" value={product.cofins_pCOFINS} onChange={handleInputChange} placeholder="Ex: 3.00" />
                            </div>
                        </div>
                    </div>

                    {/* Container IPI */}
                    <div className="config-card p-4">
                        <h3 className="config-title mb-4">IPI</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-group">
                                <Label htmlFor="IPI_CST" className="form-label">CST IPI</Label>
                                <Input id="IPI_CST" type="text" className="form-input" value={product.IPI_CST} onChange={handleInputChange} placeholder="Ex: 50" />
                            </div>
                            <div className="form-group">
                                <Label htmlFor="IPI_pIPI" type="number" step="0.01" className="form-input" value={product.IPI_pIPI} onChange={handleInputChange} placeholder="Ex: 0.00" />
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="flex justify-end mt-8">
                    <Button onClick={handleSave} className="save-button" disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Salvar Produto
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ProductEditorPage;