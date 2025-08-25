import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Save, Loader2, ArrowLeft, ClipboardList, User, Building2, Package, PlusCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { logAction } from '@/lib/log';

const initialBudgetState = {
    data_orcamento: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    cliente_id: null,
    funcionario_id: null,
    endereco_entrega: '',
    historico: '',
    debito_credito: 'D', // Default to Débito
    forma_pagamento: '',
    cnpj_empresa: '',
    cfop: '',
    natureza: '',
    faturado: false,
    vendedor: '',
    desconto: 0.0,
    tipo: 'Orçamento', // Default to Orçamento
    condicao_pagamento: '',
    endereco_entrega_completo: '',
    obra: '',
    observacao: '',
    prazo_entrega: 0,
    numero_nfe: '',
    numero_parcelas: 1,
    data_venda: null, // Can be null initially
    total_venda: 0.0,
    total_fatura: 0.0,
    nome_cliente: '',
    numero_pedido: '',
    acrescimo: 0.0,
    validade: 0,
    solicitante: '',
    telefone: '',
    codigo_antigo: null,
};

const BudgetEditorPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, activeCompany } = useAuth();
    const { toast } = useToast();
    const { activeCompanyId } = useOutletContext();

    const [budget, setBudget] = useState(initialBudgetState);
    const [compositions, setCompositions] = useState([]); // State for composition items
    const [people, setPeople] = useState([]); // For cliente_id dropdown
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Fetch existing budget data for editing
    const fetchBudget = useCallback(async () => {
        if (!id) {
            setLoading(false);
            // Set default values for new budget
            setBudget(prev => ({
                ...prev,
                cnpj_empresa: activeCompany?.cnpj || '',
                funcionario_id: user?.id || null,
                vendedor: user?.user_metadata?.full_name || user?.email || '',
            }));
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('orcamento')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            if (data) {
                setBudget({
                    ...data,
                    data_orcamento: data.data_orcamento ? data.data_orcamento.split('T')[0] : '',
                    data_venda: data.data_venda ? data.data_venda.split('T')[0] : null,
                });
            }

            // Fetch compositions for this budget
            const { data: compData, error: compError } = await supabase
                .from('orcamento_composicao')
                .select('*')
                .eq('orcamento_id', id);
            if (compError) throw compError;
            if (compData) setCompositions(compData);

        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao carregar orçamento', description: error.message });
        } finally {
            setLoading(false);
        }
    }, [id, user, activeCompany, toast]);

    // Fetch people for client dropdown
    const fetchPeople = useCallback(async () => {
        try {
            let allPeople = [];
            let offset = 0;
            const limit = 1000;
            while (true) {
                const { data, error } = await supabase
                    .from('pessoas')
                    .select('id, razao_social, nome_fantasia')
                    .order('razao_social', { ascending: true })
                    .range(offset, offset + limit - 1);
                if (error) throw error;
                if (data && data.length > 0) {
                    allPeople = allPeople.concat(data);
                    offset += data.length;
                    if (data.length < limit) break;
                } else {
                    break;
                }
            }
            setPeople(allPeople);
        } catch (error) {
            console.error("Error fetching people:", error.message);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar a lista de pessoas.' });
        }
    }, [toast]);

    useEffect(() => {
        fetchBudget();
        fetchPeople();
    }, [fetchBudget, fetchPeople]);

    const handleInputChange = (e) => {
        const { id, value, type, checked } = e.target;
        setBudget(prev => ({
            ...prev,
            [id]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) : value)
        }));
    };

    const handleSelectChange = (id, value) => {
        setBudget(prev => ({ ...prev, [id]: value }));
        if (id === 'cliente_id') {
            const selectedPerson = people.find(p => p.id.toString() === value);
            setBudget(prev => ({ ...prev, nome_cliente: selectedPerson ? (selectedPerson.razao_social || selectedPerson.nome_fantasia) : '' }));
        }
    };

    const handleSave = async () => {
        if (!activeCompanyId) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Nenhuma empresa ativa selecionada para salvar o orçamento.' });
            return;
        }

        setSaving(true);
        try {
            const saveData = {
                ...budget,
                cnpj_empresa: activeCompany.cnpj, // Ensure current active company CNPJ is used
                funcionario_id: user?.id, // Ensure current user is set as func
                data_orcamento: budget.data_orcamento ? new Date(budget.data_orcamento).toISOString() : null,
                data_venda: budget.data_venda ? new Date(budget.data_venda).toISOString() : null,
                updated_at: new Date().toISOString(),
            };

            let error;
            let actionType;
            let description;
            let budgetId = id;

            if (id) {
                const { error: updateError } = await supabase
                    .from('orcamento')
                    .update(saveData)
                    .eq('id', id);
                error = updateError;
                actionType = 'budget_update';
                description = `Orçamento "${budget.numero_pedido || id}" (ID: ${id}) atualizado.`;
            } else {
                delete saveData.id; 
                const { data: newBudgetData, error: insertError } = await supabase
                    .from('orcamento')
                    .insert([saveData])
                    .select();
                error = insertError;
                actionType = 'budget_create';
                description = `Novo orçamento "${saveData.numero_pedido || newBudgetData?.[0]?.id}" (ID: ${newBudgetData?.[0]?.id}) criado.`;
                if (newBudgetData && newBudgetData.length > 0) {
                    budgetId = newBudgetData[0].id;
                }
            }

            if (error) throw error;

            // Log action
            if (user) {
                await logAction(user.id, actionType, description, activeCompanyId, null);
            }

            toast({ title: 'Sucesso!', description: `Orçamento ${id ? 'atualizado' : 'criado'} com sucesso.` });
            navigate('/app/budgets');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message });
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
                <ClipboardList className="w-16 h-16 text-blue-500 mb-4" />
                <h2 className="text-2xl font-bold text-slate-800">Nenhuma Empresa Ativa</h2>
                <p className="text-slate-600">Selecione uma empresa para adicionar ou editar orçamentos.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => navigate('/app/budgets')}>
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold gradient-text">{id ? 'Editar Orçamento' : 'Novo Orçamento'}</h1>
                    <p className="text-slate-600 mt-1">Gerencie os detalhes do orçamento ou pedido.</p>
                </div>
            </div>

            <div className="config-card max-w-5xl mx-auto">
                <div className="config-header">
                    <div className="flex items-center gap-3">
                        <ClipboardList className="w-6 h-6 text-blue-600" />
                        <div>
                            <h3 className="config-title">Dados do Orçamento</h3>
                            <p className="config-description">Informações gerais e financeiras do orçamento.</p>
                        </div>
                    </div>
                </div>
                <div className="form-grid pt-6">
                    <div className="form-group"><Label htmlFor="numero_pedido" className="form-label">Número do Pedido</Label><Input id="numero_pedido" type="text" className="form-input" value={budget.numero_pedido || ''} onChange={handleInputChange} /></div>
                    <div className="form-group"><Label htmlFor="data_orcamento" className="form-label">Data do Orçamento *</Label><Input id="data_orcamento" type="date" className="form-input" value={budget.data_orcamento} onChange={handleInputChange} required /></div>
                    <div className="form-group"><Label htmlFor="cliente_id" className="form-label">Cliente *</Label>
                        <Select onValueChange={(value) => handleSelectChange('cliente_id', value)} value={budget.cliente_id?.toString() || ''}>
                            <SelectTrigger id="cliente_id" className="form-select"><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                            <SelectContent>
                                {people.map(p => (
                                    <SelectItem key={p.id} value={p.id.toString()}>{p.razao_social || p.nome_fantasia}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="form-group"><Label htmlFor="vendedor" className="form-label">Vendedor</Label><Input id="vendedor" type="text" className="form-input" value={budget.vendedor || ''} onChange={handleInputChange} /></div>
                    <div className="form-group"><Label htmlFor="tipo" className="form-label">Tipo</Label>
                        <Select onValueChange={(value) => handleSelectChange('tipo', value)} value={budget.tipo}>
                            <SelectTrigger id="tipo" className="form-select"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Orçamento">Orçamento</SelectItem>
                                <SelectItem value="Pedido">Pedido</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="form-group"><Label htmlFor="forma_pagamento" className="form-label">Forma de Pagamento</Label><Input id="forma_pagamento" type="text" className="form-input" value={budget.forma_pagamento || ''} onChange={handleInputChange} /></div>
                    <div className="form-group"><Label htmlFor="condicao_pagamento" className="form-label">Condição de Pagamento</Label><Input id="condicao_pagamento" type="text" className="form-input" value={budget.condicao_pagamento || ''} onChange={handleInputChange} /></div>
                    <div className="form-group"><Label htmlFor="numero_parcelas" className="form-label">Número de Parcelas</Label><Input id="numero_parcelas" type="number" className="form-input" value={budget.numero_parcelas} onChange={handleInputChange} /></div>
                    <div className="form-group"><Label htmlFor="prazo_entrega" className="form-label">Prazo de Entrega (dias)</Label><Input id="prazo_entrega" type="number" className="form-input" value={budget.prazo_entrega} onChange={handleInputChange} /></div>
                    <div className="form-group"><Label htmlFor="validade" className="form-label">Validade (dias)</Label><Input id="validade" type="number" className="form-input" value={budget.validade} onChange={handleInputChange} /></div>
                    <div className="form-group"><Label htmlFor="solicitante" className="form-label">Solicitante</Label><Input id="solicitante" type="text" className="form-input" value={budget.solicitante || ''} onChange={handleInputChange} /></div>
                    <div className="form-group"><Label htmlFor="telefone" className="form-label">Telefone</Label><Input id="telefone" type="text" className="form-input" value={budget.telefone || ''} onChange={handleInputChange} /></div>
                    <div className="form-group"><Label htmlFor="obra" className="form-label">Obra</Label><Input id="obra" type="text" className="form-input" value={budget.obra || ''} onChange={handleInputChange} /></div>
                    <div className="form-group"><Label htmlFor="debito_credito" className="form-label">Débito/Crédito</Label>
                        <Select onValueChange={(value) => handleSelectChange('debito_credito', value)} value={budget.debito_credito}>
                            <SelectTrigger id="debito_credito" className="form-select"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="D">Débito</SelectItem>
                                <SelectItem value="C">Crédito</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="form-group"><Label htmlFor="faturado" className="form-label">Faturado</Label>
                        <div className="flex items-center h-10">
                            <Checkbox id="faturado" checked={budget.faturado} onCheckedChange={(checked) => handleSelectChange('faturado', checked)} />
                            <Label htmlFor="faturado" className="ml-2 text-sm font-medium text-slate-700">Marcar como faturado</Label>
                        </div>
                    </div>
                    <div className="form-group"><Label htmlFor="data_venda" className="form-label">Data da Venda</Label><Input id="data_venda" type="date" className="form-input" value={budget.data_venda || ''} onChange={handleInputChange} /></div>
                    <div className="form-group"><Label htmlFor="numero_nfe" className="form-label">Número da NFE</Label><Input id="numero_nfe" type="text" className="form-input" value={budget.numero_nfe || ''} onChange={handleInputChange} /></div>
                    <div className="form-group"><Label htmlFor="total_venda" className="form-label">Total da Venda</Label><Input id="total_venda" type="number" step="0.01" className="form-input" value={budget.total_venda} onChange={handleInputChange} /></div>
                    <div className="form-group"><Label htmlFor="total_fatura" className="form-label">Total da Fatura</Label><Input id="total_fatura" type="number" step="0.01" className="form-input" value={budget.total_fatura} onChange={handleInputChange} /></div>
                    <div className="form-group"><Label htmlFor="desconto" className="form-label">Desconto</Label><Input id="desconto" type="number" step="0.01" className="form-input" value={budget.desconto} onChange={handleInputChange} /></div>
                    <div className="form-group"><Label htmlFor="acrescimo" className="form-label">Acréscimo</Label><Input id="acrescimo" type="number" step="0.01" className="form-input" value={budget.acrescimo} onChange={handleInputChange} /></div>
                    <div className="form-group"><Label htmlFor="cfop" className="form-label">CFOP</Label><Input id="cfop" type="text" className="form-input" value={budget.cfop || ''} onChange={handleInputChange} /></div>
                    <div className="form-group"><Label htmlFor="natureza" className="form-label">Natureza da Operação</Label><Input id="natureza" type="text" className="form-input" value={budget.natureza || ''} onChange={handleInputChange} /></div>
                    <div className="form-group"><Label htmlFor="codigo_antigo" className="form-label">Código Antigo</Label><Input id="codigo_antigo" type="number" className="form-input" value={budget.codigo_antigo || ''} onChange={handleInputChange} /></div>
                </div>

                <h3 className="config-title mt-8 pt-6 border-t border-slate-200">Endereço de Entrega</h3>
                <div className="form-grid pt-6">
                    <div className="form-group col-span-full"><Label htmlFor="endereco_entrega" className="form-label">Endereço de Entrega</Label><Input id="endereco_entrega" type="text" className="form-input" value={budget.endereco_entrega || ''} onChange={handleInputChange} /></div>
                    <div className="form-group col-span-full"><Label htmlFor="endereco_entrega_completo" className="form-label">Endereço de Entrega Completo</Label><Textarea id="endereco_entrega_completo" className="form-textarea" value={budget.endereco_entrega_completo || ''} onChange={handleInputChange} rows={3} /></div>
                </div>

                <h3 className="config-title mt-8 pt-6 border-t border-slate-200">Histórico e Observações</h3>
                <div className="form-grid pt-6">
                    <div className="form-group col-span-full"><Label htmlFor="historico" className="form-label">Histórico</Label><Textarea id="historico" className="form-textarea" value={budget.historico || ''} onChange={handleInputChange} rows={3} /></div>
                    <div className="form-group col-span-full"><Label htmlFor="observacao" className="form-label">Observação</Label><Textarea id="observacao" className="form-textarea" value={budget.observacao || ''} onChange={handleInputChange} rows={3} /></div>
                </div>

                <h3 className="config-title mt-8 pt-6 border-t border-slate-200 flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    Itens de Composição do Orçamento
                </h3>
                <p className="config-description mt-2">
                    Esta seção será desenvolvida para gerenciar os produtos e serviços que compõem este orçamento.
                    Por enquanto, é um placeholder.
                </p>
                <div className="mt-4 p-4 border border-dashed border-slate-300 rounded-lg text-center text-slate-500">
                    <p>Funcionalidade de gerenciamento de itens de composição (orcamento_composicao) será implementada aqui.</p>
                    <Button variant="outline" className="mt-3" onClick={() => toast({ title: "Em desenvolvimento", description: "A funcionalidade de adicionar itens de composição será adicionada em breve!" })}>
                        <PlusCircle className="w-4 h-4 mr-2" /> Adicionar Item
                    </Button>
                    {compositions.length > 0 && (
                        <div className="mt-4 text-left">
                            <h4 className="font-semibold text-slate-700 mb-2">Itens Existentes:</h4>
                            <ul className="list-disc list-inside space-y-1">
                                {compositions.map(comp => (
                                    <li key={comp.id} className="flex justify-between items-center">
                                        <span>Composição ID: {comp.composicao_id} - Qtd: {comp.quantidade} - Valor: {comp.valor_venda}</span>
                                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => toast({ title: "Em desenvolvimento", description: "A funcionalidade de excluir itens de composição será adicionada em breve!" })}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                
                <div className="flex justify-end mt-8">
                    <Button onClick={handleSave} className="save-button" disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Salvar Orçamento
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default BudgetEditorPage;