import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Save, Loader2, ArrowLeft, ClipboardList, User, Building2, Package, PlusCircle, Trash2, Search, CalendarDays, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { logAction } from '@/lib/log';
import { normalizeCnpj } from '@/lib/utils';
import ClientSearchDialog from '@/components/ClientSearchDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    desconto: 0.0, // Desconto global do orçamento (mantido no estado, mas não usado nos cálculos do resumo)
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
    previsao_entrega: null, // Novo campo

    // Campo de endereço do cliente concatenado (somente leitura)
    cliente_endereco_completo: '',
};

const BudgetEditorPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, activeCompany } = useAuth();
    const { toast } = useToast();
    const { activeCompanyId } = useOutletContext();

    const [budget, setBudget] = useState(initialBudgetState);
    const [compositions, setCompositions] = useState([]);
    const [people, setPeople] = useState([]); // All people for search dialog
    const [allUfs, setAllUfs] = useState([]); // All UFs for mapping
    const [allMunicipalities, setAllMunicipalities] = useState([]); // All municipalities for mapping
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isClientSearchDialogOpen, setIsClientSearchDialogOpen] = useState(false);
    const [unitsMap, setUnitsMap] = useState(new Map()); // Novo estado para o mapa de unidades

    const fetchUfsAndMunicipalities = useCallback(async () => {
        try {
            const { data: ufsData, error: ufsError } = await supabase
                .from('estados')
                .select('uf, sigla, estado')
                .order('sigla');
            if (ufsError) throw ufsError;
            setAllUfs(ufsData);

            const { data: municipalitiesData, error: municipalitiesError } = await supabase
                .from('municipios')
                .select('codigo, municipio')
                .order('municipio');
            if (municipalitiesError) throw municipalitiesError;
            setAllMunicipalities(municipalitiesData);
        } catch (error) {
            console.error("Error fetching UFs or Municipalities:", error.message);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar dados de localização.' });
        }
    }, [toast]);

    const buildClientAddressString = useCallback((clientData) => {
        if (!clientData) return '';
        const parts = [];
        if (clientData.logradouro) parts.push(clientData.logradouro);
        if (clientData.numero) parts.push(clientData.numero);
        if (clientData.complemento) parts.push(clientData.complemento);
        if (clientData.bairro) parts.push(clientData.bairro);
        
        const municipioNome = allMunicipalities.find(m => m.codigo === clientData.municipio)?.municipio || '';
        const ufSigla = clientData.uf || '';

        // Adiciona Município/UF se ambos existirem
        if (municipioNome && ufSigla) {
            parts.push(`${municipioNome}/${ufSigla}`);
        } else if (municipioNome) { // Adiciona apenas município se UF não existir
            parts.push(municipioNome);
        } else if (ufSigla) { // Adiciona apenas UF se município não existir
            parts.push(ufSigla);
        }

        if (clientData.cep) parts.push(`CEP: ${clientData.cep}`);
        
        return parts.filter(Boolean).join(', ');
    }, [allMunicipalities]);

    const fetchPeople = useCallback(async () => {
        try {
            let allPeople = [];
            let offset = 0;
            const limit = 1000;
            while (true) {
                const { data, error } = await supabase
                    .from('pessoas')
                    .select('id, razao_social, nome_fantasia, pessoa_tipo, logradouro, numero, complemento, bairro, municipio, uf, cep, cpf_cnpj') // Adicionado cpf_cnpj
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

            // Enriquecer dados de pessoas com nome do município e nome completo do estado para exibição
            const enrichedPeople = allPeople.map(p => {
                const municipioObj = allMunicipalities.find(m => m.codigo === p.municipio);
                const ufObj = allUfs.find(u => u.sigla === p.uf);
                return {
                    ...p,
                    municipio_nome: municipioObj?.municipio || '',
                    uf_estado_nome: ufObj?.estado || '',
                };
            });
            setPeople(enrichedPeople);
        } catch (error) {
            console.error("Error fetching people:", error.message);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar a lista de pessoas.' });
        }
    }, [toast, allMunicipalities, allUfs]); // Adicionado allMunicipalities e allUfs às dependências

    const fetchBudget = useCallback(async () => {
        if (!id) {
            setLoading(false);
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
                .eq('id', parseInt(id, 10)) // Convertendo o ID para inteiro aqui
                .single();
            if (error) throw error;
            if (data) {
                const budgetData = {
                    ...data,
                    data_orcamento: data.data_orcamento ? data.data_orcamento.split('T')[0] : '',
                    data_venda: data.data_venda ? data.data_venda.split('T')[0] : null,
                    previsao_entrega: data.previsao_entrega ? data.previsao_entrega.split('T')[0] : null,
                };

                // Fetch client details if cliente_id exists
                if (data.cliente_id) {
                    const { data: clientData, error: clientError } = await supabase
                        .from('pessoas')
                        .select('*')
                        .eq('id', data.cliente_id)
                        .single();
                    if (clientError) throw clientError;

                    if (clientData) {
                        budgetData.nome_cliente = clientData.razao_social || clientData.nome_fantasia;
                        budgetData.cliente_endereco_completo = buildClientAddressString(clientData);
                    }
                }
                setBudget(budgetData);
            }

            const { data: compData, error: compError } = await supabase
                .from('orcamento_composicao')
                .select('*, produtos!produto_id(prod_xProd, prod_uCOM)')
                .eq('orcamento_id', parseInt(id, 10)); // Convertendo o ID para inteiro aqui também
            if (compError) throw compError;
            if (compData) setCompositions(compData);

        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao carregar orçamento', description: error.message });
        } finally {
            setLoading(false);
        }
    }, [id, user, activeCompany, toast, buildClientAddressString]);

    const fetchUnits = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('unidade')
                .select('codigo, unidade')
                .order('unidade', { ascending: true });
            if (error) throw error;
            const map = new Map(data.map(unit => [unit.codigo, unit.unidade]));
            setUnitsMap(map);
        } catch (error) {
            console.error("Error fetching units:", error.message);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar as unidades comerciais.' });
        }
    }, [toast]);

    useEffect(() => {
        fetchUfsAndMunicipalities();
        fetchUnits();
    }, [fetchUfsAndMunicipalities, fetchUnits]);

    useEffect(() => {
        // Somente busca orçamento e pessoas depois que UFs e Municípios são carregados
        if (allUfs.length > 0 && allMunicipalities.length > 0) {
            fetchBudget();
            fetchPeople(); // Chamar fetchPeople aqui
        } else if (!id) { // Se for um novo orçamento, e sem ID, podemos prosseguir sem esperar pelos dados de localização
            setLoading(false);
            setBudget(prev => ({
                ...prev,
                cnpj_empresa: activeCompany?.cnpj || '',
                funcionario_id: user?.id || null,
                vendedor: user?.user_metadata?.full_name || user?.email || '',
            }));
        }
    }, [allUfs, allMunicipalities, fetchBudget, fetchPeople, id, activeCompany, user]);


    const handleInputChange = (e) => {
        const { id, value, type, checked } = e.target;
        setBudget(prev => ({
            ...prev,
            [id]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) : value)
        }));
    };

    const handleSelectChange = (id, value) => {
        setBudget(prev => ({ ...prev, [id]: value }));
    };

    const handleSelectClient = (person) => { // Agora recebe o objeto completo da pessoa
        setBudget(prev => ({
            ...prev,
            cliente_id: person.id,
            nome_cliente: person.razao_social || person.nome_fantasia,
            cliente_endereco_completo: buildClientAddressString(person),
        }));
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
                cnpj_empresa: normalizeCnpj(activeCompany.cnpj),
                funcionario_id: user?.id,
                data_orcamento: budget.data_orcamento ? new Date(budget.data_orcamento).toISOString() : null,
                data_venda: budget.data_venda ? new Date(budget.data_venda).toISOString() : null,
                previsao_entrega: budget.previsao_entrega ? new Date(budget.previsao_entrega).toISOString() : null,
                updated_at: new Date().toISOString(),
            };

            // Remove client address fields before saving to 'orcamento' table
            delete saveData.cliente_endereco_completo;

            let error;
            let actionType;
            let description;
            let budgetId = id;

            if (id) {
                const { error: updateError } = await supabase
                    .from('orcamento')
                    .update(saveData)
                    .eq('id', parseInt(id, 10)); // Convertendo o ID para inteiro aqui
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

    // Derivar o tipo e os títulos/rótulos dinamicamente
    const displayTipo = useMemo(() => {
        return budget.faturado ? 'Pedido' : 'Orçamento';
    }, [budget.faturado]);

    const pageTitle = id ? `Editar ${displayTipo}` : `Novo ${displayTipo}`;
    const configTitle = `Dados do ${displayTipo}`;
    const numeroLabel = `Número do ${displayTipo}`;

    // Cálculos de totais conforme a lógica do usuário
    const totalProdutosBruto = compositions.reduce((sum, item) => sum + (item.quantidade * item.valor_venda), 0);
    const totalServicosBruto = 0; // Placeholder para serviços

    // Soma dos descontos de cada item
    const sumOfItemDiscounts = compositions.reduce((sum, item) => sum + (item.desconto_total || 0), 0);
    
    // Total do Pedido R$ (total dos produtos + total servicos)
    const totalDoPedido = totalProdutosBruto + totalServicosBruto;

    // Total Desconto R$ (apenas a soma dos descontos dos itens, para exibição)
    const totalDescontoDisplay = sumOfItemDiscounts;
    
    // Total Líq. do Pedido R$ (Total do Pedido - Total Desconto)
    const totalLiquidoFinal = totalDoPedido - totalDescontoDisplay;

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
                    <h1 className="text-3xl font-bold gradient-text">{pageTitle}</h1>
                    <p className="text-slate-600 mt-1">Gerencie os detalhes do orçamento ou pedido.</p>
                </div>
            </div>

            <div className="config-card max-w-5xl mx-auto">
                <div className="config-header">
                    <div className="flex items-center gap-3">
                        <ClipboardList className="w-6 h-6 text-blue-600" />
                        <div>
                            <h3 className="config-title">{configTitle}</h3>
                            <p className="config-description">Informações gerais e financeiras do orçamento.</p>
                        </div>
                    </div>
                </div>
                <div className="form-grid pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
                    {/* Row 1: Número do Pedido, Data do Orçamento, Cliente */}
                    <div className="form-group lg:col-span-2">
                        <Label htmlFor="numero_pedido" className="form-label">{numeroLabel}</Label>
                        <Input id="numero_pedido" type="text" className="form-input" value={budget.numero_pedido || ''} onChange={handleInputChange} />
                    </div>
                    <div className="form-group lg:col-span-2">
                        <Label htmlFor="data_orcamento" className="form-label">Data do Orçamento *</Label>
                        <Input id="data_orcamento" type="date" className="form-input" value={budget.data_orcamento} onChange={handleInputChange} required />
                    </div>
                    <div className="form-group lg:col-span-8">
                        <Label htmlFor="cliente_id" className="form-label">Cliente *</Label>
                        <div className="flex items-center space-x-2">
                            <Input
                                id="nome_cliente_display"
                                type="text"
                                className="form-input flex-1"
                                value={budget.nome_cliente || ''}
                                readOnly
                                placeholder="Selecione um cliente"
                            />
                            <Button variant="outline" size="icon" onClick={() => setIsClientSearchDialogOpen(true)}>
                                <Search className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Row 2: Solicitante, Fone Solicitante, Vendedor */}
                    <div className="form-group lg:col-span-4">
                        <Label htmlFor="solicitante" className="form-label">Solicitante</Label>
                        <Input id="solicitante" type="text" className="form-input" value={budget.solicitante || ''} onChange={handleInputChange} />
                    </div>
                    <div className="form-group lg:col-span-4">
                        <Label htmlFor="telefone" className="form-label">Fone Solicitante</Label>
                        <Input id="telefone" type="text" className="form-input" value={budget.telefone || ''} onChange={handleInputChange} />
                    </div>
                    <div className="form-group lg:col-span-4">
                        <Label htmlFor="vendedor" className="form-label">Vendedor</Label>
                        <Input id="vendedor" type="text" className="form-input" value={budget.vendedor || ''} onChange={handleInputChange} />
                    </div>
                    
                    {/* Endereço do Cliente Selecionado (campo concatenado desabilitado) */}
                    <div className="lg:col-span-12 pt-4 border-t border-slate-200 mt-4">
                        <h4 className="config-title mb-4 text-base font-semibold text-slate-700">Endereço do Cliente Selecionado</h4>
                        <div className="form-group col-span-full">
                            <Label htmlFor="cliente_endereco_completo" className="form-label">Endereço do Cliente</Label>
                            <Input 
                                id="cliente_endereco_completo" 
                                type="text"
                                className="form-input" 
                                value={budget.cliente_endereco_completo} 
                                readOnly 
                                disabled 
                            />
                        </div>
                    </div>

                    {/* Endereço de Entrega (mantido como editável) */}
                    <div className="form-group lg:col-span-12 pt-4 border-t border-slate-200 mt-4">
                        <Label htmlFor="endereco_entrega_completo" className="form-label">Endereço de Entrega</Label>
                        <Textarea id="endereco_entrega_completo" className="form-textarea" value={budget.endereco_entrega_completo || ''} onChange={handleInputChange} rows={2} />
                    </div>

                    {/* Natureza da Operação, NF-e Nº */}
                    <div className="form-group lg:col-span-9">
                        <Label htmlFor="natureza" className="form-label">Natureza da Operação *</Label>
                        <Input id="natureza" type="text" className="form-input" value={budget.natureza || ''} onChange={handleInputChange} />
                    </div>
                    <div className="form-group lg:col-span-3">
                        <Label htmlFor="numero_nfe" className="form-label">NF-e Nº</Label>
                        <Input id="numero_nfe" type="text" className="form-input" value={budget.numero_nfe || ''} onChange={handleInputChange} />
                    </div>
                </div>

                <h3 className="config-title mt-8 pt-6 border-t border-slate-200 flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    Itens de Composição do Orçamento
                </h3>
                <div className="mt-4 data-table-container">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Composição</TableHead>
                                <TableHead>Unidade</TableHead>
                                <TableHead>Qtde</TableHead>
                                <TableHead className="text-right">Unitário R$</TableHead>
                                <TableHead className="text-right">Total R$</TableHead>
                                <TableHead className="text-right">Desc. R$</TableHead>
                                <TableHead className="text-right">Total Geral R$</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {compositions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-slate-500 py-4">
                                        Nenhum item de composição adicionado.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                compositions.map(comp => (
                                    <TableRow key={comp.id}>
                                        <TableCell className="font-medium">{comp.produtos?.prod_xProd || `Produto ID: ${comp.produto_id}`}</TableCell>
                                        <TableCell>{unitsMap.get(comp.produtos?.prod_uCOM) || 'N/A'}</TableCell>
                                        <TableCell className="text-right">{comp.quantidade}</TableCell>
                                        <TableCell className="text-right">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(comp.valor_venda)}</TableCell>
                                        <TableCell className="text-right">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(comp.quantidade * comp.valor_venda)}</TableCell>
                                        <TableCell className="text-right">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(comp.desconto_total || 0)}</TableCell>
                                        <TableCell className="text-right">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((comp.quantidade * comp.valor_venda) - (comp.desconto_total || 0))}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => toast({ title: "Em desenvolvimento", description: "A funcionalidade de editar itens de composição será adicionada em breve!" })}>
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => toast({ title: "Em desenvolvimento", description: "A funcionalidade de excluir itens de composição será adicionada em breve!" })}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    <div className="flex justify-center mt-4">
                        <Button variant="outline" onClick={() => toast({ title: "Em desenvolvimento", description: "A funcionalidade de adicionar itens de composição será adicionada em breve!" })}>
                            <PlusCircle className="w-4 h-4 mr-2" /> Adicionar Item
                        </Button>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <h3 className="config-title mb-4">Informações Tributárias ICMS</h3>
                        <div className="form-grid grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-group"><Label htmlFor="base_icms" className="form-label">Base de Cálculo ICMS R$</Label><Input id="base_icms" type="number" step="0.01" className="form-input" value="0.00" readOnly /></div>
                            <div className="form-group"><Label htmlFor="total_icms" className="form-label">Total ICMS R$</Label><Input id="total_icms" type="number" step="0.01" className="form-input" value="0.00" readOnly /></div>
                        </div>

                        <h3 className="config-title mt-8 mb-4">Condições</h3>
                        <div className="form-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
                            <div className="form-group lg:col-span-4">
                                <Label htmlFor="previsao_entrega" className="form-label">Previsão de Entrega</Label>
                                <Input id="previsao_entrega" type="date" className="form-input" value={budget.previsao_entrega || ''} onChange={handleInputChange} />
                            </div>
                            <div className="form-group lg:col-span-4">
                                <Label htmlFor="status_orcamento" className="form-label">Status</Label>
                                <Select onValueChange={(value) => handleSelectChange('faturado', value === 'true')} value={budget.faturado.toString()}>
                                    <SelectTrigger id="status_orcamento" className="form-select"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">FATURADO</SelectItem>
                                        <SelectItem value="false">PENDENTE</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="form-group lg:col-span-4">
                                <Label htmlFor="forma_pagamento" className="form-label">Forma de Pagamento *</Label>
                                <Select onValueChange={(value) => handleSelectChange('forma_pagamento', value)} value={budget.forma_pagamento}>
                                    <SelectTrigger id="forma_pagamento" className="form-select">
                                        <SelectValue placeholder="Selecione a forma" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">A Vista</SelectItem>
                                        <SelectItem value="1">A Prazo</SelectItem>
                                        <SelectItem value="2">Outros</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-1 space-y-2 p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <h3 className="config-title mb-2">Resumo do Pedido</h3>
                        <div className="flex justify-between text-slate-700"><span>Total dos Produtos R$</span><span>{new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalProdutosBruto)}</span></div>
                        <div className="flex justify-between text-slate-700"><span>Total dos Serviços R$</span><span>{new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalServicosBruto)}</span></div>
                        <div className="flex justify-between text-slate-700"><span>Total do Pedido R$</span><span>{new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalDoPedido)}</span></div>
                        <div className="flex justify-between text-slate-700"><span>Total Desconto R$</span><span>{new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalDescontoDisplay)}</span></div>
                        <div className="flex justify-between font-bold text-lg text-blue-700 border-t border-slate-300 pt-2 mt-2"><span>Total Líq. do Pedido R$</span><span>{new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalLiquidoFinal)}</span></div>
                    </div>
                </div>
                
                {/* Nova linha para Condição de Pagamento, Validade e Botões de Ação */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
                    <div className="form-group lg:col-span-5">
                        <Label htmlFor="condicao_pagamento" className="form-label">Condição de Pagamento</Label>
                        <Input id="condicao_pagamento" type="text" className="form-input" value={budget.condicao_pagamento || ''} onChange={handleInputChange} />
                    </div>
                    <div className="form-group lg:col-span-2">
                        <Label htmlFor="validade" className="form-label">Validade Proposta (dias)</Label>
                        <Input id="validade" type="number" className="form-input" value={budget.validade} onChange={handleInputChange} />
                    </div>
                    <div className="lg:col-span-5 flex justify-end space-x-2">
                        <Select defaultValue="1_via">
                            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tipo Impressão" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1_via">1ª Via</SelectItem>
                                <SelectItem value="2_via">2ª Via</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={() => toast({ title: "Em desenvolvimento", description: "Funcionalidade de Desconto será adicionada em breve!" })}>Desconto</Button>
                        <Button onClick={handleSave} className="save-button" disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Salvar Orçamento
                        </Button>
                    </div>
                </div>

                <h3 className="config-title mt-8 pt-6 border-t border-slate-200">Observação</h3>
                <div className="pt-6">
                    <div className="form-group col-span-full">
                        <Label htmlFor="observacao" className="form-label">Observação</Label>
                        <Textarea id="observacao" className="form-textarea" value={budget.observacao || ''} onChange={handleInputChange} rows={3} />
                    </div>
                </div>
            </div>

            <ClientSearchDialog
                isOpen={isClientSearchDialogOpen}
                setIsOpen={setIsClientSearchDialogOpen}
                people={people}
                onSelectClient={handleSelectClient}
            />
        </div>
    );
};

export default BudgetEditorPage;