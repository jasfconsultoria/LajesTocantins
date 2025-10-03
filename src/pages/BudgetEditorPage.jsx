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
import { normalizeCnpj, formatCpfCnpj, formatCurrency, normalizeString } from '@/lib/utils';
import SelectSearchClient from '@/components/SelectSearchClient';
import SelectSearchProduct from '@/components/SelectSearchProduct';
import ProductSearchDialog from '@/components/ProductSearchDialog';
import { v4 as uuidv4 } from 'uuid';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const initialBudgetState = {
    data_orcamento: new Date().toISOString().split('T')[0],
    cliente_id: null,
    funcionario_id: null,
    endereco_entrega: '',
    historico: '',
    debito_credito: 'D',
    forma_pagamento: '',
    cnpj_empresa: '',
    cfop: '',
    natureza: '',
    faturado: false,
    vendedor: '',
    desconto: 0.0,
    condicao_pagamento: '',
    endereco_entrega_completo: '',
    obra: '',
    observacao: '',
    prazo_entrega: 0,
    numero_nfe: '',
    numero_parcelas: 1,
    data_venda: null,
    total_venda: 0.0,
    total_fatura: 0.0,
    nome_cliente: '',
    numero_pedido: '', // Inicia vazio para novos orçamentos
    acrescimo: 0.0,
    validade: 0,
    solicitante: '',
    telefone: '',
    codigo_antigo: null,
    previsao_entrega: null,
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
    const [people, setPeople] = useState([]);
    const [allUfs, setAllUfs] = useState([]);
    const [allMunicipalities, setAllMunicipalities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isProductSearchDialogOpen, setIsProductSearchDialogOpen] = useState(false);
    const [unitsMap, setUnitsMap] = useState(new Map());
    const [allProducts, setAllProducts] = useState([]);

    const isFaturado = budget.faturado; // Determina se o orçamento está faturado e deve ser bloqueado

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
        
        const municipioNome = allMunicipalities.find(m => String(m.codigo) === String(clientData.municipio))?.municipio || '';
        const ufSigla = clientData.uf || '';

        if (municipioNome && ufSigla) {
            parts.push(`${municipioNome}/${ufSigla}`);
        } else if (municipioNome) {
            parts.push(municipioNome);
        } else if (ufSigla) {
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
                    .select('id, razao_social, nome_fantasia, pessoa_tipo, logradouro, numero, complemento, bairro, municipio, uf, cep, cpf_cnpj')
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

            const enrichedPeople = allPeople.map(p => {
                const municipioObj = allMunicipalities.find(m => String(m.codigo) === String(p.municipio));
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
    }, [toast, allMunicipalities, allUfs]);

    const fetchProducts = useCallback(async () => {
        if (!activeCompanyId) {
            setAllProducts([]);
            return;
        }
        
        try {
            const { data: productsData, error } = await supabase
                .from('produtos')
                .select('*')
                .eq('id_emit', activeCompanyId)
                .order('prod_xProd', { ascending: true });

            if (error) throw error;

            const { data: unitsData } = await supabase
                .from('unidade')
                .select('codigo, unidade');

            const unitsMap = new Map(unitsData?.map(unit => [unit.codigo, unit.unidade]) || []);

            const enrichedProducts = productsData.map(p => {
                const unitDescription = unitsMap.get(p.prod_uCOM) || '';
                const searchStringParts = [
                    p.prod_cProd,
                    p.prod_xProd,
                    p.prod_cEAN,
                    p.prod_NCM,
                    unitDescription
                ].filter(Boolean);
                const buscaCompleta = normalizeString(searchStringParts.join(' '));
                
                return {
                    ...p,
                    prod_uCOM_descricao: unitDescription,
                    busca_completa: buscaCompleta
                };
            });

            setAllProducts(enrichedProducts);
        } catch (error) {
            console.error("Error fetching products:", error.message);
            toast({ 
                variant: "destructive", 
                title: "Erro ao carregar produtos", 
                description: error.message 
            });
        }
    }, [activeCompanyId, toast]);

    const fetchBudget = useCallback(async () => {
        if (!id) {
            setLoading(false);
            // Para novos orçamentos, o numero_pedido começa vazio
            setBudget(prev => ({
                ...initialBudgetState, // Garante que todos os campos iniciem com o estado padrão
                cnpj_empresa: activeCompany?.cnpj || '',
                funcionario_id: user?.id || null,
                vendedor: user?.user_metadata?.full_name || user?.email || '',
                numero_pedido: '', // Explicitamente vazio para novos orçamentos
            }));
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('orcamento')
                .select('*')
                .eq('id', parseInt(id, 10))
                .single();
            if (error) throw error;
            if (data) {
                const budgetData = {
                    ...data,
                    data_orcamento: data.data_orcamento ? data.data_orcamento.split('T')[0] : '',
                    data_venda: data.data_venda ? data.data_venda.split('T')[0] : null,
                    previsao_entrega: data.previsao_entrega ? data.previsao_entrega.split('T')[0] : null,
                };

                if (data.cliente_id) {
                    const { data: clientData, error: clientError } = await supabase
                        .from('pessoas')
                        .select('*')
                        .eq('cpf_cnpj', data.cliente_id)
                        .single();
                    if (clientError) throw clientError;

                    if (clientData) {
                        const clientName = clientData.nome_fantasia && clientData.razao_social 
                            ? `${clientData.nome_fantasia} - ${clientData.razao_social}` 
                            : clientData.razao_social || clientData.nome_fantasia;
                        
                        budgetData.nome_cliente = clientName;
                        budgetData.cliente_endereco_completo = buildClientAddressString(clientData);
                    }
                }
                setBudget(budgetData);
            }

            const { data: compData, error: compError } = await supabase
                .from('orcamento_composicao')
                .select('*, produtos!produto_id(prod_xProd, prod_uCOM)')
                .eq('orcamento_id', parseInt(id, 10));
            if (compError) throw compError;
            if (compData) setCompositions(compData);

        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao carregar orçamento', description: error.message });
        } finally {
            setLoading(false);
        }
    }, [id, user, activeCompany, toast, buildClientAddressString, allMunicipalities]);

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
        if (activeCompanyId) {
            fetchProducts();
        }
    }, [activeCompanyId, fetchProducts]);

    useEffect(() => {
        if (allUfs.length > 0 && allMunicipalities.length > 0) {
            fetchBudget();
            fetchPeople();
        } else if (!id) {
            setLoading(false);
            setBudget(prev => ({
                ...initialBudgetState,
                cnpj_empresa: activeCompany?.cnpj || '',
                funcionario_id: user?.id || null,
                vendedor: user?.user_metadata?.full_name || user?.email || '',
                numero_pedido: '', // Garante que seja vazio para novos orçamentos
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

    const handleSelectClient = async (person) => { // Tornando a função assíncrona
        // Se person for null, significa que o campo foi limpo
        if (!person) {
            setBudget(prev => ({
                ...prev,
                cliente_id: null,
                nome_cliente: '',
                cliente_endereco_completo: '',
            }));
            return;
        }

        const clientName = person.nome_fantasia && person.razao_social 
            ? `${person.nome_fantasia} - ${person.razao_social}` 
            : person.razao_social || person.nome_fantasia;
        
        // Se for um novo orçamento (sem ID na URL), salva o orçamento no banco
        if (!id) {
            setSaving(true); // Indica que está salvando
            try {
                const defaultBudget = {
                    ...initialBudgetState, // Começa com o estado inicial
                    cnpj_empresa: normalizeCnpj(activeCompany.cnpj),
                    funcionario_id: 1, // HARDCODED para '1' conforme solicitado
                    data_orcamento: budget.data_orcamento, // Usa a data atual do estado
                    vendedor: user?.user_metadata?.full_name || user?.email || '',
                    cliente_id: person.cpf_cnpj,
                    nome_cliente: clientName,
                };

                // EXCLUIR O CAMPO cliente_endereco_completo ANTES DE INSERIR
                delete defaultBudget.cliente_endereco_completo;

                // Lógica para gerar o próximo numero_pedido
                let nextNumeroPedido = 1;
                try {
                    console.log("DEBUG: Fetching last numero_pedido for cnpj_empresa:", normalizeCnpj(activeCompany.cnpj));
                    const { data: lastBudget, error: lastBudgetError } = await supabase
                        .from('orcamento')
                        .select('numero_pedido')
                        .eq('cnpj_empresa', normalizeCnpj(activeCompany.cnpj))
                        .order('numero_pedido', { ascending: false }) 
                        .limit(1)
                        .single();

                    if (lastBudgetError && lastBudgetError.code !== 'PGRST116') { // PGRST116 means no rows found
                        console.error("DEBUG: Supabase error fetching last numero_pedido:", lastBudgetError);
                        throw lastBudgetError;
                    }
                    console.log("DEBUG: Last budget data from Supabase:", lastBudget);

                    if (lastBudget && lastBudget.numero_pedido) {
                        const lastNum = parseInt(lastBudget.numero_pedido, 10);
                        console.log("DEBUG: Parsed lastNum:", lastNum);
                        if (!isNaN(lastNum)) {
                            nextNumeroPedido = lastNum + 1;
                        } else {
                            console.warn("DEBUG: lastBudget.numero_pedido is not a valid number, defaulting to 1:", lastBudget.numero_pedido);
                        }
                    } else {
                        console.log("DEBUG: No previous budget found or numero_pedido is null/undefined for this company. Starting from 1.");
                    }
                } catch (numError) {
                    console.error("DEBUG: Error fetching last numero_pedido during initial save:", numError.message);
                    toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível gerar o próximo número de orçamento.' });
                    setSaving(false);
                    return;
                }
                console.log("DEBUG: Calculated nextNumeroPedido:", nextNumeroPedido);
                defaultBudget.numero_pedido = nextNumeroPedido.toString(); // Atribui o número gerado

                const { data: newBudgetData, error: insertError } = await supabase
                    .from('orcamento')
                    .insert([defaultBudget]) // Usa defaultBudget com funcionario_id hardcoded
                    .select(); // Seleciona os dados inseridos para obter o novo ID

                if (insertError) throw insertError;

                const newBudgetId = newBudgetData[0].id;
                
                // Atualiza o estado local com o novo ID do orçamento e numero_pedido
                setBudget(prev => ({
                    ...prev,
                    ...newBudgetData[0], // Atualiza todos os campos com a resposta do DB
                    data_orcamento: newBudgetData[0].data_orcamento.split('T')[0], // Formata a data
                    numero_pedido: defaultBudget.numero_pedido, // Garante que o número gerado seja definido
                    cliente_endereco_completo: buildClientAddressString(person), // Define o endereço do cliente
                }));

                if (user) {
                    await logAction(user.id, 'budget_create', `Novo orçamento "${defaultBudget.numero_pedido}" (ID: ${newBudgetId}) criado ao selecionar cliente.`, activeCompanyId, null);
                }

                toast({ title: 'Orçamento Criado!', description: `Orçamento ${defaultBudget.numero_pedido} criado com sucesso.`, duration: 3000 });
                navigate(`/app/budgets/${newBudgetId}/edit`); // Redireciona para a página de edição do orçamento salvo
            } catch (error) {
                toast({ variant: 'destructive', title: 'Erro ao criar orçamento', description: error.message });
            } finally {
                setSaving(false);
            }
        } else {
            // Orçamento existente: apenas atualiza o estado local
            setBudget(prev => ({
                ...prev,
                cliente_id: person.cpf_cnpj,
                nome_cliente: clientName,
                cliente_endereco_completo: buildClientAddressString(person),
            }));
        }
    };

    const handleSelectProduct = (product) => {
        const newCompositionItem = {
            id: uuidv4(),
            orcamento_id: id ? parseInt(id, 10) : null,
            produto_id: product.id,
            quantidade: 1,
            valor_venda: product.prod_vUnCOM || 0,
            desconto_total: 0,
            produtos: {
                prod_xProd: product.prod_xProd,
                prod_uCOM: product.prod_uCOM,
            },
            isNew: true,
        };
        setCompositions(prev => [...prev, newCompositionItem]);
        toast({ title: "Produto adicionado!", description: `${product.prod_xProd} foi adicionado ao orçamento.` });
    };

    const handleSelectProductFromSearch = (product) => {
        const newCompositionItem = {
            id: uuidv4(),
            orcamento_id: id ? parseInt(id, 10) : null,
            produto_id: product.id,
            quantidade: 1,
            valor_venda: product.prod_vUnCOM || 0,
            desconto_total: 0,
            produtos: {
                prod_xProd: product.prod_xProd,
                prod_uCOM: product.prod_uCOM,
            },
            isNew: true,
        };
        setCompositions(prev => [...prev, newCompositionItem]);
        toast({ 
            title: "Produto adicionado!", 
            description: `${product.prod_xProd} foi adicionado ao orçamento.`,
            duration: 2000 
        });
    };

    // Funções para editar os campos da composição
    const handleQuantityChange = (compositionId, newQuantity) => {
        setCompositions(prev => 
            prev.map(comp => 
                comp.id === compositionId 
                    ? { ...comp, quantidade: parseFloat(newQuantity) || 0 }
                    : comp
            )
        );
    };

    const handleValueChange = (compositionId, newValue) => {
        setCompositions(prev => 
            prev.map(comp => 
                comp.id === compositionId 
                    ? { ...comp, valor_venda: parseFloat(newValue) || 0 }
                    : comp
            )
        );
    };

    const handleDiscountChange = (compositionId, newDiscount) => {
        setCompositions(prev => 
            prev.map(comp => 
                comp.id === compositionId 
                    ? { ...comp, desconto_total: parseFloat(newDiscount) || 0 }
                    : comp
            )
        );
    };

    const handleSave = async () => {
        if (!activeCompanyId) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Nenhuma empresa ativa selecionada para salvar o orçamento.' });
            return;
        }

        // Se não há ID, significa que o orçamento ainda não foi criado (deveria ter sido em handleSelectClient)
        // Isso é um fallback ou um aviso, pois o fluxo esperado é que o ID já exista aqui.
        if (!id) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Orçamento ainda não foi criado. Selecione um cliente primeiro.' });
            return;
        }

        setSaving(true);
        try {
            const saveData = {
                ...budget,
                cnpj_empresa: normalizeCnpj(activeCompany.cnpj),
                funcionario_id: 1, // HARDCODED para '1' também no update, para consistência
                data_orcamento: budget.data_orcamento ? new Date(budget.data_orcamento).toISOString() : null,
                data_venda: budget.data_venda ? new Date(budget.data_venda).toISOString() : null,
                previsao_entrega: budget.previsao_entrega ? new Date(budget.previsao_entrega).toISOString() : null,
                updated_at: new Date().toISOString(),
            };

            delete saveData.cliente_endereco_completo;

            let error;
            let actionType;
            let description;
            let budgetId = id;

            // Este bloco agora só lida com a atualização de orçamentos existentes
            const { error: updateError } = await supabase
                .from('orcamento')
                .update(saveData)
                .eq('id', parseInt(id, 10));
            error = updateError;
            actionType = 'budget_update';
            description = `Orçamento "${budget.numero_pedido || id}" (ID: ${id}) atualizado.`;
            
            if (error) throw error;

            if (budgetId) {
                // Lógica para salvar as composições (itens do orçamento)
                for (const comp of compositions) {
                    if (comp.isNew) {
                        const { error: compInsertError } = await supabase
                            .from('orcamento_composicao')
                            .insert({
                                orcamento_id: budgetId,
                                produto_id: comp.produto_id,
                                quantidade: comp.quantidade,
                                valor_venda: comp.valor_venda,
                                desconto_total: comp.desconto_total,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                            });
                        if (compInsertError) throw compInsertError;
                    }
                    // TODO: Adicionar lógica para atualizar composições existentes e deletar as removidas
                }
            }

            if (user) {
                await logAction(user.id, actionType, description, activeCompanyId, null);
            }

            toast({ title: 'Sucesso!', description: `Orçamento ${id ? 'atualizado' : 'criado'} com sucesso.` });
            navigate('/app/budgets'); // Redireciona para a lista de orçamentos após a atualização
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message });
        } finally {
            setSaving(false);
        }
    };

    const handleEditComposition = (compositionId) => {
        toast({ title: "Em desenvolvimento", description: "A funcionalidade de editar itens de composição será adicionada em breve!" });
    };

    const handleDeleteComposition = async (compositionId, productName) => {
        if (!window.confirm(`Tem certeza que deseja remover "${productName}" da composição?`)) {
            return;
        }
        setSaving(true);
        try {
            const itemToDelete = compositions.find(c => c.id === compositionId);
            if (itemToDelete && itemToDelete.isNew) {
                setCompositions(prev => prev.filter(c => c.id !== compositionId));
                toast({ title: "Item removido!", description: `"${productName}" foi removido da lista.` });
            } else {
                const { error } = await supabase
                    .from('orcamento_composicao')
                    .delete()
                    .eq('id', compositionId);

                if (error) throw error;

                setCompositions(prev => prev.filter(c => c.id !== compositionId));
                toast({ title: 'Item excluído!', description: `"${productName}" foi removido(a) com sucesso.` });
                if (user) {
                    await logAction(user.id, 'budget_composition_delete', `Item "${productName}" (ID: ${compositionId}) excluído do orçamento (ID: ${id}).`, activeCompanyId, null);
                }
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao excluir item', description: error.message });
        } finally {
            setSaving(false);
        }
    };

    const displayTipo = useMemo(() => {
        return budget.faturado ? 'Pedido' : 'Orçamento';
    }, [budget.faturado]);

    const pageTitle = id ? `Editar ${displayTipo}` : `Novo ${displayTipo}`;
    const configTitle = `Dados do ${displayTipo}`;
    const numeroLabel = `Número do ${displayTipo}`;

    const totalProdutosBruto = compositions.reduce((sum, item) => sum + (item.quantidade * item.valor_venda), 0);
    const totalServicosBruto = 0;
    const sumOfItemDiscounts = compositions.reduce((sum, item) => sum + (item.desconto_total || 0), 0);
    const totalDoPedido = totalProdutosBruto + totalServicosBruto;
    const totalDescontoDisplay = sumOfItemDiscounts;
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
                        <Input id="numero_pedido" type="text" className="form-input" value={budget.numero_pedido || ''} disabled={true} />
                    </div>
                    <div className="form-group lg:col-span-2">
                        <Label htmlFor="data_orcamento" className="form-label">Data do Orçamento *</Label>
                        <Input id="data_orcamento" type="date" className="form-input" value={budget.data_orcamento} onChange={handleInputChange} required disabled={isFaturado} />
                    </div>
                    <div className="form-group lg:col-span-8">
                        <Label htmlFor="cliente_id" className="form-label">Cliente *</Label>
                        <SelectSearchClient
                            value={people.find(p => p.cpf_cnpj === budget.cliente_id) || null}
                            onValueChange={handleSelectClient}
                            people={people}
                            placeholder="Selecione um cliente..."
                            disabled={isFaturado}
                        />
                    </div>

                    {/* Row 2: Solicitante, Fone Solicitante, Vendedor */}
                    <div className="form-group lg:col-span-4">
                        <Label htmlFor="solicitante" className="form-label">Solicitante</Label>
                        <Input id="solicitante" type="text" className="form-input" value={budget.solicitante || ''} onChange={handleInputChange} disabled={isFaturado} />
                    </div>
                    <div className="form-group lg:col-span-4">
                        <Label htmlFor="telefone" className="form-label">Fone Solicitante</Label>
                        <Input id="telefone" type="text" className="form-input" value={budget.telefone || ''} onChange={handleInputChange} disabled={isFaturado} />
                    </div>
                    <div className="form-group lg:col-span-4">
                        <Label htmlFor="vendedor" className="form-label">Vendedor</Label>
                        <Input id="vendedor" type="text" className="form-input" value={budget.vendedor || ''} onChange={handleInputChange} disabled={isFaturado} />
                    </div>
                    
                    {/* Endereço do Cliente */}
                    <div className="form-group lg:col-span-12">
                        <Label htmlFor="cliente_endereco_completo" className="form-label">Endereço do Cliente</Label>
                        <Input 
                            id="cliente_endereco_completo" 
                            type="text" 
                            className="form-input" 
                            value={budget.cliente_endereco_completo || ''} 
                            readOnly 
                            disabled 
                        />
                    </div>

                    {/* Endereço de Entrega */}
                    <div className="form-group lg:col-span-12">
                        <Label htmlFor="endereco_entrega_completo" className="form-label">Endereço de Entrega</Label>
                        <Textarea id="endereco_entrega_completo" className="form-textarea" value={budget.endereco_entrega_completo || ''} onChange={handleInputChange} rows={2} disabled={isFaturado} />
                    </div>

                    {/* Natureza da Operação, NF-e Nº */}
                    <div className="form-group lg:col-span-9">
                        <Label htmlFor="natureza" className="form-label">Natureza da Operação *</Label>
                        <Input id="natureza" type="text" className="form-input" value={budget.natureza || ''} onChange={handleInputChange} disabled={isFaturado} />
                    </div>
                    <div className="form-group lg:col-span-3">
                        <Label htmlFor="numero_nfe" className="form-label">NF-e Nº</Label>
                        <Input id="numero_nfe" type="text" className="form-input" value={budget.numero_nfe || ''} onChange={handleInputChange} disabled={isFaturado} />
                    </div>
                </div>

                <h3 className="config-title mt-8 pt-6 border-t border-slate-200 flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    Itens de Composição do Orçamento
                </h3>

                
                {/* Desabilita se não houver ID de orçamento */}
                <div className="mt-4 mb-4">
                    <SelectSearchProduct
                        products={allProducts}
                        onSelect={handleSelectProductFromSearch}
                        placeholder="Digite para buscar e adicionar produto..."
                        className="w-full"
                        disabled={isFaturado || !id} 
                    />
                </div>

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
                            {/* Remover a linha de busca que estava aqui */}
                            
                            {/* Itens existentes */}
                            {compositions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-slate-500 py-8">
                                        Nenhum item adicionado. Use a busca acima para adicionar produtos.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                compositions.map(comp => (
                                    <TableRow key={comp.id} className="hover:bg-slate-50">
                                        <TableCell className="font-medium">
                                            {comp.produtos?.prod_xProd || `Produto ID: ${comp.produto_id}`}</TableCell>
                                        <TableCell>{unitsMap.get(comp.produtos?.prod_uCOM) || 'N/A'}</TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={comp.quantidade}
                                                onChange={(e) => handleQuantityChange(comp.id, e.target.value)}
                                                className="w-20 text-right"
                                                disabled={isFaturado}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={comp.valor_venda}
                                                onChange={(e) => handleValueChange(comp.id, e.target.value)}
                                                className="w-28 text-right"
                                                disabled={isFaturado}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatCurrency(comp.quantidade * comp.valor_venda)}
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={comp.desconto_total || 0}
                                                onChange={(e) => handleDiscountChange(comp.id, e.target.value)}
                                                className="w-24 text-right"
                                                disabled={isFaturado}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right font-bold">
                                            {formatCurrency((comp.quantidade * comp.valor_venda) - (comp.desconto_total || 0))}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleEditComposition(comp.id)} disabled={isFaturado}>
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" 
                                                    onClick={() => handleDeleteComposition(comp.id, comp.produtos?.prod_xProd || `Produto ID: ${comp.produto_id}`)}
                                                    disabled={isFaturado}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/*// ... resto do código mantido igual ...*/}


                <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <h3 className="config-title mb-4">Informações Tributárias ICMS</h3>
                        <div className="form-grid grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-group"><Label htmlFor="base_icms" className="form-label">Base de Cálculo ICMS R$</Label><Input id="base_icms" type="number" step="0.01" className="form-input" value="0.00" readOnly disabled={isFaturado} /></div>
                            <div className="form-group"><Label htmlFor="total_icms" className="form-label">Total ICMS R$</Label><Input id="total_icms" type="number" step="0.01" className="form-input" value="0.00" readOnly disabled={isFaturado} /></div>
                        </div>

                        <h3 className="config-title mt-8 mb-4">Condições</h3>
                        <div className="form-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
                            <div className="form-group lg:col-span-4">
                                <Label htmlFor="previsao_entrega" className="form-label">Previsão de Entrega</Label>
                                <Input id="previsao_entrega" type="date" className="form-input" value={budget.previsao_entrega || ''} onChange={handleInputChange} disabled={isFaturado} />
                            </div>
                            <div className="form-group lg:col-span-4">
                                <Label htmlFor="status_orcamento" className="form-label">Status</Label>
                                <Select onValueChange={(value) => handleSelectChange('faturado', value === 'true')} value={budget.faturado.toString()} disabled={isFaturado}>
                                    <SelectTrigger id="status_orcamento" className="form-select"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">FATURADO</SelectItem>
                                        <SelectItem value="false">PENDENTE</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="form-group lg:col-span-4">
                                <Label htmlFor="forma_pagamento" className="form-label">Forma de Pagamento *</Label>
                                <Select onValueChange={(value) => handleSelectChange('forma_pagamento', value)} value={budget.forma_pagamento} disabled={isFaturado}>
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
                        <div className="flex justify-between text-slate-700"><span>Total dos Produtos R$</span><span>{formatCurrency(totalProdutosBruto)}</span></div>
                        <div className="flex justify-between text-slate-700"><span>Total dos Serviços R$</span><span>{formatCurrency(totalServicosBruto)}</span></div>
                        <div className="flex justify-between text-slate-700"><span>Total do Pedido R$</span><span>{formatCurrency(totalDoPedido)}</span></div>
                        <div className="flex justify-between text-slate-700"><span>Total Desconto R$</span><span>{formatCurrency(totalDescontoDisplay)}</span></div>
                        <div className="flex justify-between font-bold text-lg text-blue-700 border-t border-slate-300 pt-2 mt-2"><span>Total Líq. do Pedido R$</span><span>{formatCurrency(totalLiquidoFinal)}</span></div>
                    </div>
                </div>
                
                {/* Nova linha para Condição de Pagamento, Validade e Botões de Ação */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
                    <div className="form-group lg:col-span-5">
                        <Label htmlFor="condicao_pagamento" className="form-label">Condição de Pagamento</Label>
                        <Input id="condicao_pagamento" type="text" className="form-input" value={budget.condicao_pagamento || ''} onChange={handleInputChange} disabled={isFaturado} />
                    </div>
                    <div className="form-group lg:col-span-2">
                        <Label htmlFor="validade" className="form-label">Validade Proposta (dias)</Label>
                        <Input id="validade" type="number" className="form-input" value={budget.validade} onChange={handleInputChange} disabled={isFaturado} />
                    </div>
                    <div className="lg:col-span-5 flex justify-end space-x-2">
                        <Select defaultValue="1_via" disabled={isFaturado}>
                            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tipo Impressão" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1_via">1ª Via</SelectItem>
                                <SelectItem value="2_via">2ª Via</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={() => toast({ title: "Em desenvolvimento", description: "Funcionalidade de Desconto será adicionada em breve!" })} disabled={isFaturado}>Desconto</Button>
                        <Button onClick={handleSave} className="save-button" disabled={saving || isFaturado}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Salvar Orçamento
                        </Button>
                    </div>
                </div>

                <h3 className="config-title mt-8 pt-6 border-t border-slate-200">Observação</h3>
                <div className="pt-6">
                    <div className="form-group col-span-full">
                        <Label htmlFor="observacao" className="form-label">Observação</Label>
                        <Textarea id="observacao" className="form-textarea" value={budget.observacao || ''} onChange={handleInputChange} rows={3} disabled={isFaturado} />
                    </div>
                </div>
            </div>

            <ProductSearchDialog
                isOpen={isProductSearchDialogOpen}
                setIsOpen={setIsProductSearchDialogOpen}
                onSelectProduct={handleSelectProduct}
                activeCompanyId={activeCompanyId}
            />
        </div>
    );
};

export default BudgetEditorPage;