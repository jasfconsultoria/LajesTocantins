import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Save, Loader2, ArrowLeft, ClipboardList, User, Building2, Package, PlusCircle, Trash2, Search, CalendarDays, Edit, Percent, Share2, PencilLine, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { logAction } from '@/lib/log';
import { normalizeCnpj, formatCpfCnpj, formatCurrency, normalizeString, capitalizeFirstLetter, formatDecimal, parseFormattedNumber } from '@/lib/utils';
import SelectSearchClient from '@/components/SelectSearchClient';
import SelectSearchProduct from '@/components/SelectSearchProduct';
import ProductSearchDialog from '@/components/ProductSearchDialog';
import SelectSearchNatureza from '@/components/SelectSearchNatureza';
import DiscountDialog from '@/components/DiscountDialog';
import { v4 as uuidv4 } from 'uuid';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

// Helper function to get date + N days in YYYY-MM-DD format
const getDatePlusDays = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
};

const initialBudgetState = {
    data_orcamento: new Date().toISOString().split('T')[0],
    cliente_id: null,
    usuario_id: null,
    endereco_entrega: '',
    historico: '',
    debito_credito: 'D',
    forma_pagamento: '',
    cnpj_empresa: '',
    cfop: '',
    natureza: '',
    status: '0', // Default to '0' (Pendente) - Changed from status_orcamento
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
    numero_pedido: '',
    acrescimo: 0.0,
    validade: 0,
    solicitante: '',
    telefone: '',
    codigo_antigo: null,
    previsao_entrega: getDatePlusDays(10),
    cliente_endereco_completo: '',
    signature_url: null,
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
    const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false);
    const [unitsMap, setUnitsMap] = useState(new Map());
    const [allProducts, setAllProducts] = useState([]);
    const [selectedClientData, setSelectedClientData] = useState(null);

    const [baseIcmsTotal, setBaseIcmsTotal] = useState(0);
    const [totalIcmsTotal, setTotalIcmsTotal] = useState(0);

    const isFaturado = budget.status === '2';
    const isAprovado = budget.status === '1';

    // Ref para armazenar as referências dos campos de quantidade dos itens de composição
    const itemQuantityInputRefs = useRef(new Map());

    // Log the ID when the component renders or updates
    useEffect(() => {
        console.log("BudgetEditorPage mounted/updated. Current ID from useParams:", id);
    }, [id]);

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
            console.error("Error fetching UFs or Municipalities:", error);
            toast({ variant: 'destructive', title: 'Erro', description: error.message || 'Não foi possível carregar dados de localização.' });
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
            console.error("Error fetching people:", error);
            toast({ variant: 'destructive', title: 'Erro', description: error.message || 'Não foi possível carregar a lista de pessoas.' });
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

            if (error) {
                console.error("Error fetching products (BudgetEditorPage):", error);
                throw error;
            }

            let currentUnitsMap = new Map();
            const { data: unitsData, error: unitsError } = await supabase
                .from('unidade')
                .select('codigo, unidade');

            if (unitsError) {
                console.error("Error fetching units (BudgetEditorPage - Products):", unitsError);
                toast({
                    variant: "destructive",
                    title: "Erro ao carregar unidades comerciais",
                    description: unitsError.message || 'Verifique as configurações do banco de dados ou permissões (RLS).',
                });
            } else {
                currentUnitsMap = new Map(unitsData.map(unit => [unit.codigo, unit.unidade]));
            }
            setUnitsMap(currentUnitsMap);

            const enrichedProducts = productsData.map(p => {
                const unitDescription = currentUnitsMap.get(p.prod_uCOM) || '';
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
            console.error("Caught error fetching products (BudgetEditorPage):", error);
            toast({ 
                variant: "destructive", 
                title: "Erro ao carregar produtos", 
                description: error.message || 'Ocorreu um erro inesperado ao carregar os produtos.'
            });
            setAllProducts([]);
            setUnitsMap(new Map());
        }
    }, [activeCompanyId, toast]);

    const fetchBudget = useCallback(async () => {
        if (!id) {
            setLoading(false);
            setBudget(prev => ({
                ...initialBudgetState,
                cnpj_empresa: activeCompany?.cnpj || '',
                usuario_id: user?.id || null,
                vendedor: user?.user_metadata?.full_name || user?.email || '',
                numero_pedido: '',
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
            if (error) {
                console.error("Error fetching budget (BudgetEditorPage):", error);
                throw error;
            }
            if (data) {
                const budgetData = {
                    ...data,
                    data_orcamento: data.data_orcamento ? data.data_orcamento.split('T')[0] : '',
                    data_venda: data.data_venda ? new Date(data.data_venda).toISOString().split('T')[0] : null,
                    previsao_entrega: data.previsao_entrega ? new Date(data.previsao_entrega).toISOString().split('T')[0] : null,
                };

                if (data.cliente_id) {
                    const { data: clientData, error: clientError } = await supabase
                        .from('pessoas')
                        .select('*')
                        .eq('cpf_cnpj', data.cliente_id)
                        .single();
                    if (clientError) {
                        console.error("Error fetching client for budget (BudgetEditorPage):", clientError);
                        throw clientError;
                    }

                    if (clientData) {
                        const clientName = clientData.nome_fantasia && clientData.razao_social 
                            ? `${clientData.nome_fantasia} - ${clientData.razao_social}` 
                            : clientData.razao_social || clientData.nome_fantasia;
                        
                        budgetData.nome_cliente = clientName;
                        budgetData.cliente_endereco_completo = buildClientAddressString(clientData);
                        setSelectedClientData(clientData);
                    }
                }
                setBudget(budgetData);
            }

            const { data: compData, error: compError } = await supabase
                .from('orcamento_composicao')
                .select('*, produtos!produto_id(prod_xProd, prod_uCOM)')
                .eq('orcamento_id', parseInt(id, 10));
            if (compError) {
                console.error("Error fetching compositions for budget (BudgetEditorPage):", compError);
                throw compError;
            }
            if (compData) {
                const compositionsWithBaseCalculo = await Promise.all(compData.map(async (comp) => {
                    const { data: baseCalculoData, error: baseCalculoError } = await supabase.rpc('get_base_calculo_details', { p_product_id: comp.produto_id });
                    if (baseCalculoError) {
                        console.error(`Error fetching base_calculo for product ${comp.produto_id}:`, baseCalculoError);
                        return { ...comp, base_calculo_entries: [] };
                    }
                    return { 
                        ...comp, 
                        base_calculo_entries: baseCalculoData || [],
                        // Initialize display fields
                        quantidade_display: formatDecimal(comp.quantidade),
                        valor_venda_display: formatDecimal(comp.valor_venda),
                        desconto_total_display: formatDecimal(comp.desconto_total || 0),
                    };
                }));
                setCompositions(compositionsWithBaseCalculo);
            }

        } catch (error) {
            console.error("Caught error fetching budget (BudgetEditorPage):", error);
            toast({ variant: 'destructive', title: 'Erro ao carregar orçamento', description: error.message || 'Ocorreu um erro inesperado ao carregar o orçamento.' });
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
            if (error) {
                console.error("Error fetching units (BudgetEditorPage):", error);
                throw error;
            }
            const map = new Map(data.map(unit => [unit.codigo, unit.unidade]));
            setUnitsMap(map);
        } catch (error) {
            console.error("Caught error fetching units (BudgetEditorPage):", error);
            toast({ 
                variant: 'destructive', 
                title: 'Erro ao carregar unidades comerciais', 
                description: error.message || 'Verifique as configurações do banco de dados ou permissões (RLS).' 
            });
            setUnitsMap(new Map());
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
                usuario_id: user?.id || null,
                vendedor: user?.user_metadata?.full_name || user?.email || '',
                numero_pedido: '',
            }));
        }
    }, [allUfs, allMunicipalities, fetchBudget, fetchPeople, id, activeCompany, user]);

    // Effect to calculate ICMS totals
    useEffect(() => {
        if (!activeCompany || !selectedClientData) {
            setBaseIcmsTotal(0);
            setTotalIcmsTotal(0);
            return;
        }

        const companyCrt = parseInt(activeCompany.crt, 10);

        if (companyCrt === 1 || companyCrt === 2) {
            setBaseIcmsTotal(0);
            setTotalIcmsTotal(0);
            return;
        }

        let currentBaseIcms = 0;
        let currentTotalIcms = 0;

        const companyUf = activeCompany.uf;
        const clientUf = selectedClientData.uf;
        

        compositions.forEach(comp => {
            const productSubtotal = (comp.quantidade * comp.valor_venda) - (comp.desconto_total || 0);

            const matchingBaseCalculo = comp.base_calculo_entries?.find(bc =>
                bc.aliquota_uf_origem === companyUf && bc.aliquota_uf_destino === clientUf
            );

            if (matchingBaseCalculo) {
                const aliquotaAplicada = (matchingBaseCalculo.aliquota_icms_value + matchingBaseCalculo.aliquota_fecp_value - matchingBaseCalculo.aliquota_reducao_value) / 100;
                currentBaseIcms += productSubtotal;
                currentTotalIcms += productSubtotal * aliquotaAplicada;
            }
        });

        setBaseIcmsTotal(currentBaseIcms);
        setTotalIcmsTotal(currentTotalIcms);

    }, [compositions, activeCompany, selectedClientData]);


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

    const handleSelectNatureza = async (selectedCfop) => {
        if (selectedCfop) {
            setBudget(prev => ({
                ...prev,
                cfop: selectedCfop.cfop,
                natureza: selectedCfop.descricao,
            }));
        } else {
            setBudget(prev => ({
                ...prev,
                cfop: '',
                natureza: '',
            }));
        }
        await handleSave(null, null, false);
    };

    const handleSelectClient = async (person) => {
        setSelectedClientData(person);

        if (!person) {
            setBudget(prev => ({
                ...prev,
                cliente_id: null,
                nome_cliente: '',
                cliente_endereco_completo: '',
                cfop: '',
                natureza: '',
            }));
            return;
        }

        const clientName = person.nome_fantasia && person.razao_social 
            ? `${person.nome_fantasia} - ${person.razao_social}` 
            : person.razao_social || person.nome_fantasia;
        
        let newNatureza = '';
        let newCfop = '';

        if (activeCompany?.uf === 'TO') { // Assuming 'TO' is the UF for Tocantins
            if (person.uf === 'TO') {
                newNatureza = "Venda Merc Adq ou Receb Terceiro";
                newCfop = "5102";
            } else {
                newNatureza = "Venda de mercadoria adquirida ou recebida de terceiros";
                newCfop = "6102";
            }
        } else { // If company is not in Tocantins, default to inter-state for any client
            if (person.uf === activeCompany?.uf) {
                newNatureza = "Venda Merc Adq ou Receb Terceiro"; // Intra-state for other UFs
                newCfop = "5102";
            } else {
                newNatureza = "Venda de mercadoria adquirida ou recebida de terceiros"; // Inter-state for other UFs
                newCfop = "6102";
            }
        }

        if (!id) {
            setSaving(true);
            try {
                const defaultBudget = {
                    ...initialBudgetState,
                    cnpj_empresa: normalizeCnpj(activeCompany.cnpj),
                    usuario_id: user?.id || null,
                    data_orcamento: budget.data_orcamento,
                    vendedor: user?.user_metadata?.full_name || user?.email || '',
                    cliente_id: person.cpf_cnpj,
                    nome_cliente: clientName,
                    natureza: newNatureza, // Set new nature
                    cfop: newCfop,       // Set new CFOP
                };

                delete defaultBudget.cliente_endereco_completo;

                let nextNumeroPedido = 1;
                try {
                    console.log("DEBUG: Fetching max numero_pedido for cnpj_empresa:", normalizeCnpj(activeCompany.cnpj));
                    const { data: maxBudgetNumberData, error: maxBudgetNumberError } = await supabase
                        .from('orcamento')
                        .select('numero_pedido')
                        .eq('cnpj_empresa', normalizeCnpj(activeCompany.cnpj))
                        .order('numero_pedido', { ascending: false })
                        .limit(1)
                        .single();

                    if (maxBudgetNumberError && maxBudgetNumberError.code !== 'PGRST116') {
                        console.error("DEBUG: Supabase error fetching max numero_pedido:", maxBudgetNumberError);
                        throw maxBudgetNumberError;
                    }
                    console.log("DEBUG: Max budget number data fetched:", maxBudgetNumberData);

                    if (maxBudgetNumberData && maxBudgetNumberData.numero_pedido !== null) {
                        const maxNumeric = parseInt(maxBudgetNumberData.numero_pedido, 10);
                        if (!isNaN(maxNumeric)) {
                            nextNumeroPedido = maxNumeric + 1;
                        } else {
                            console.log("DEBUG: Max numero_pedido is not a valid number, starting from 1.");
                        }
                    } else {
                        console.log("DEBUG: No previous budgets found for this company or max is null. Starting from 1.");
                    }
                } catch (numError) {
                    console.error("DEBUG: Error calculating next numero_pedido:", numError);
                    toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível gerar o próximo número de orçamento.' });
                    setSaving(false);
                    return;
                }
                console.log("DEBUG: Calculated nextNumeroPedido:", nextNumeroPedido);
                defaultBudget.numero_pedido = nextNumeroPedido;

                const { data: newBudgetData, error: insertError } = await supabase
                    .from('orcamento')
                    .insert([defaultBudget])
                    .select();

                if (insertError) {
                    console.error("Error inserting new budget (BudgetEditorPage):", insertError);
                    throw insertError;
                }

                const newBudgetId = newBudgetData[0].id;
                
                setBudget(prev => ({
                    ...prev,
                    ...newBudgetData[0],
                    data_orcamento: newBudgetData[0].data_orcamento.split('T')[0],
                    numero_pedido: defaultBudget.numero_pedido,
                    cliente_endereco_completo: buildClientAddressString(person),
                }));

                if (user) {
                    await logAction(user.id, 'budget_create', `Novo orçamento "${defaultBudget.numero_pedido}" (ID: ${newBudgetId}) criado ao selecionar cliente.`, activeCompanyId, null);
                }

                toast({ title: 'Orçamento Criado!', description: `Orçamento ${defaultBudget.numero_pedido} criado com sucesso.`, duration: 3000 });
                navigate(`/app/budgets/${newBudgetId}/edit`);
            } catch (error) {
                console.error("Caught error in handleSelectClient (new budget creation):", error);
                toast({ variant: 'destructive', title: 'Erro ao criar orçamento', description: error.message || 'Ocorreu um erro inesperado ao criar o orçamento.' });
            } finally {
                setSaving(false);
            }
        } else {
            setBudget(prev => ({
                ...prev,
                cliente_id: person.cpf_cnpj,
                nome_cliente: clientName,
                cliente_endereco_completo: buildClientAddressString(person),
                natureza: newNatureza, // Set new nature
                cfop: newCfop,       // Set new CFOP
            }));
        }
    };

    const handleSelectProduct = async (product) => {
        const { data: baseCalculoData, error: baseCalculoError } = await supabase.rpc('get_base_calculo_details', { p_product_id: product.id });
        if (baseCalculoError) {
            console.error("Error fetching base_calculo for product:", baseCalculoError);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar as bases de cálculo para o produto.' });
        }

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
            isNew: true, // Flag para identificar novo item
            base_calculo_entries: baseCalculoData || [],
            // Initialize display fields for new item
            quantidade_display: formatDecimal(1),
            valor_venda_display: formatDecimal(product.prod_vUnCOM || 0),
            desconto_total_display: formatDecimal(0),
        };
        setCompositions(prev => [...prev, newCompositionItem]);
        toast({ title: "Produto adicionado!", description: `${product.prod_xProd} foi adicionado ao orçamento.` });
        await handleSave(null, null, false);
    };

    const handleSelectProductFromSearch = (product) => {
        handleSelectProduct(product);
    };

    const handleCompositionInputChange = (compositionId, field, value) => {
        setCompositions(prev => 
            prev.map(comp => 
                comp.id === compositionId 
                    ? { ...comp, [`${field}_display`]: value }
                    : comp
            )
        );
    };

    const handleCompositionInputBlur = (compositionId, field) => {
        setCompositions(prev => 
            prev.map(comp => {
                if (comp.id === compositionId) {
                    const displayValue = comp[`${field}_display`] || '';
                    const parsedValue = parseFormattedNumber(displayValue);
                    const numericValue = parsedValue !== null ? parsedValue : 0;
                    return { 
                        ...comp, 
                        [field]: numericValue,
                        [`${field}_display`]: formatDecimal(numericValue)
                    };
                }
                return comp;
            })
        );
    };

    const handleApplyDiscount = useCallback(async (totalDiscountAmount, totalDiscountPercentage) => {
        if (totalDiscountAmount === 0 && totalDiscountPercentage === 0) {
            toast({ title: "Nenhum desconto aplicado", description: "O valor do desconto é zero." });
            return;
        }

        const currentTotalItemsValue = compositions.reduce((sum, item) => sum + (item.quantidade * item.valor_venda), 0);

        if (currentTotalItemsValue === 0) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não há itens no orçamento para aplicar o desconto.' });
            return;
        }

        let finalDiscountToApply = totalDiscountAmount;

        if (totalDiscountAmount === 0 && totalDiscountPercentage > 0) {
            finalDiscountToApply = (currentTotalItemsValue * totalDiscountPercentage) / 100;
        }

        if (finalDiscountToApply > currentTotalItemsValue) {
            toast({ variant: 'destructive', title: 'Erro', description: 'O desconto não pode ser maior que o valor total dos itens.' });
            return;
        }

        const updatedCompositions = compositions.map(comp => {
            const itemValue = comp.quantidade * comp.valor_venda;
            if (itemValue === 0) {
                return { ...comp, desconto_total: 0, desconto_total_display: formatDecimal(0) };
            }
            const proportionalDiscount = (itemValue / currentTotalItemsValue) * finalDiscountToApply;
            return { 
                ...comp, 
                desconto_total: proportionalDiscount,
                desconto_total_display: formatDecimal(proportionalDiscount)
            };
        });

        setCompositions(updatedCompositions);
        toast({ title: "Desconto Aplicado!", description: `Desconto de ${formatCurrency(finalDiscountToApply)} aplicado aos itens.` });
        await handleSave(null, null, false);
    }, [compositions, toast]);

    const handleSave = async (newStatus = null, signatureUrl = null, shouldNavigate = true) => {
        if (!activeCompanyId) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Nenhuma empresa ativa selecionada para salvar o orçamento.' });
            return;
        }

        if (!id) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Orçamento ainda não foi criado. Selecione um cliente primeiro.' });
            return;
        }

        setSaving(true);
        try {
            const saveData = {
                ...budget,
                cnpj_empresa: normalizeCnpj(activeCompany.cnpj),
                usuario_id: user?.id || null,
                data_orcamento: budget.data_orcamento ? new Date(budget.data_orcamento).toISOString() : null,
                data_venda: budget.data_venda ? new Date(budget.data_venda).toISOString() : null,
                previsao_entrega: budget.previsao_entrega ? new Date(budget.previsao_entrega).toISOString() : null,
                updated_at: new Date().toISOString(),
                status: newStatus || budget.status,
                signature_url: signatureUrl || budget.signature_url,
            };

            delete saveData.cliente_endereco_completo;

            let error;
            let actionType;
            let description;
            let budgetId = id;

            const { error: updateError } = await supabase
                .from('orcamento')
                .update(saveData)
                .eq('id', parseInt(id, 10));
            error = updateError;
            actionType = 'budget_update';
            description = `Orçamento "${budget.numero_pedido || id}" (ID: ${id}) atualizado.`;
            
            if (error) {
                console.error("Error updating budget (BudgetEditorPage):", error);
                throw error;
            }

            if (budgetId) {
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
                        if (compInsertError) {
                            console.error("Error inserting composition item (BudgetEditorPage):", compInsertError);
                            throw compInsertError;
                        }
                    } else {
                        const { error: compUpdateError } = await supabase
                            .from('orcamento_composicao')
                            .update({
                                quantidade: comp.quantidade,
                                valor_venda: comp.valor_venda,
                                desconto_total: comp.desconto_total,
                                updated_at: new Date().toISOString(),
                            })
                            .eq('id', comp.id);
                        if (compUpdateError) {
                            console.error("Error updating composition item (BudgetEditorPage):", compUpdateError);
                            throw compUpdateError;
                        }
                    }
                }
            }

            if (user) {
                await logAction(user.id, actionType, description, activeCompanyId, null);
            }

            toast({ title: 'Sucesso!', description: `Orçamento ${id ? 'atualizado' : 'criado'} com sucesso.` });
            if (shouldNavigate) {
                navigate('/app/budgets');
            }
        } catch (error) {
            console.error("Caught error in handleSave (BudgetEditorPage):", error);
            toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message || 'Ocorreu um erro inesperado ao salvar o orçamento.' });
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

                if (error) {
                    console.error("Error deleting composition item (BudgetEditorPage):", error);
                    throw error;
                }

                setCompositions(prev => prev.filter(c => c.id !== compositionId));
                toast({ title: 'Item excluído!', description: `"${productName}" foi removido(a) com sucesso.` });
                if (user) {
                    await logAction(user.id, 'budget_composition_delete', `Item "${productName}" (ID: ${compositionId}) excluído do orçamento (ID: ${id}).`, activeCompanyId, null);
                }
            }
        } catch (error) {
            console.error("Caught error in handleDeleteComposition (BudgetEditorPage):", error);
            toast({ variant: 'destructive', title: 'Erro ao excluir item', description: error.message || 'Ocorreu um erro inesperado ao excluir o item.' });
        } finally {
            setSaving(false);
        }
    };

    const handleShareBudgetDirectly = () => {
        console.log("handleShareBudgetDirectly called. Current ID:", id);
        if (!id) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Salve o orçamento primeiro para gerar o link de compartilhamento.' });
            return;
        }
        const baseUrl = window.location.origin; 
        const link = `${baseUrl}/public/budgets/${id}/sign`;
        console.log("Generated share link:", link);
        // Usar window.open para abrir em uma nova aba
        window.open(link, '_blank'); 
    };

    const displayTipo = useMemo(() => {
        if (budget.status === '2') return 'Pedido';
        if (budget.status === '1') return 'Orçamento Aprovado';
        return 'Orçamento';
    }, [budget.status]);

    const pageTitle = id ? `Editar ${displayTipo}` : `Novo ${displayTipo}`;
    const configTitle = `Dados do ${displayTipo}`;
    const numeroLabel = `Nº do ${displayTipo}`;

    const totalProdutosBruto = compositions.reduce((sum, item) => sum + (item.quantidade * item.valor_venda), 0);
    const totalServicosBruto = 0;
    const sumOfItemDiscounts = compositions.reduce((sum, item) => sum + (item.desconto_total || 0), 0);
    const totalDoPedido = totalProdutosBruto + totalServicosBruto;
    const totalDescontoDisplay = sumOfItemDiscounts;
    const totalLiquidoFinal = totalDoPedido - totalDescontoDisplay;

    // Efeito para focar no campo de quantidade do último item adicionado
    useEffect(() => {
        if (compositions.length > 0) {
            const lastItem = compositions[compositions.length - 1];
            // Apenas foca se for um item recém-adicionado (não carregado do banco de dados)
            if (lastItem && lastItem.isNew) {
                const inputElement = itemQuantityInputRefs.current.get(lastItem.id);
                if (inputElement) {
                    inputElement.focus();
                    inputElement.select(); // Adicionado .select() aqui
                    inputElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        }
    }, [compositions]);

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
                            value={selectedClientData}
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

                    {/* Natureza da Operação, CFOP */}
                    <div className="form-group lg:col-span-9">
                        <Label htmlFor="natureza" className="form-label">Natureza da Operação *</Label>
                        <SelectSearchNatureza
                            value={budget.natureza}
                            onValueChange={handleSelectNatureza}
                            disabled={isFaturado}
                            required
                            companyUf={activeCompany?.uf}
                            clientUf={selectedClientData?.uf}
                        />
                    </div>
                    <div className="form-group lg:col-span-3">
                        <Label htmlFor="cfop" className="form-label">CFOP</Label>
                        <Input id="cfop" type="text" className="form-input" value={budget.cfop || ''} readOnly disabled={true} />
                    </div>
                </div>

                <h3 className="config-title mt-8 pt-6 border-t border-slate-200 flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    Itens de Composição do Orçamento
                </h3>

                
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
                                                type="text"
                                                value={comp.quantidade_display}
                                                onChange={(e) => handleCompositionInputChange(comp.id, 'quantidade', e.target.value)}
                                                onBlur={() => handleCompositionInputBlur(comp.id, 'quantidade')}
                                                onFocus={(e) => e.target.select()} // Adicionado para selecionar o texto
                                                className="w-20 text-right"
                                                disabled={isFaturado}
                                                ref={(el) => itemQuantityInputRefs.current.set(comp.id, el)} // Atribui a ref aqui
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="text"
                                                value={comp.valor_venda_display}
                                                onChange={(e) => handleCompositionInputChange(comp.id, 'valor_venda', e.target.value)}
                                                onBlur={() => handleCompositionInputBlur(comp.id, 'valor_venda')}
                                                onFocus={(e) => e.target.select()} // Adicionado para selecionar o texto
                                                className="w-28 text-right"
                                                disabled={isFaturado}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatDecimal(comp.quantidade * comp.valor_venda)}
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="text"
                                                value={comp.desconto_total_display}
                                                onChange={(e) => handleCompositionInputChange(comp.id, 'desconto_total', e.target.value)}
                                                onBlur={() => handleCompositionInputBlur(comp.id, 'desconto_total')}
                                                onFocus={(e) => e.target.select()} // Adicionado para selecionar o texto
                                                className="w-24 text-right"
                                                disabled={isFaturado}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right font-bold">
                                            {formatDecimal((comp.quantidade * comp.valor_venda) - (comp.desconto_total || 0))}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {/* Botão de edição removido conforme solicitado */}
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

                <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <h3 className="config-title mb-4">Informações Tributárias ICMS</h3>
                        <div className="form-grid grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-group"><Label htmlFor="base_icms" className="form-label">Base de Cálculo ICMS R$</Label><Input id="base_icms" type="number" step="0.01" className="form-input" value={baseIcmsTotal.toFixed(2)} readOnly disabled={true} /></div>
                            <div className="form-group"><Label htmlFor="total_icms" className="form-label">Total ICMS R$</Label><Input id="total_icms" type="number" step="0.01" className="form-input" value={totalIcmsTotal.toFixed(2)} readOnly disabled={true} /></div>
                        </div>

                        <h3 className="config-title mt-8 mb-4">Condições</h3>
                        <div className="form-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
                            <div className="form-group lg:col-span-4">
                                <Label htmlFor="previsao_entrega" className="form-label">Previsão de Entrega</Label>
                                <Input id="previsao_entrega" type="date" className="form-input" value={budget.previsao_entrega || ''} onChange={handleInputChange} disabled={isFaturado} />
                            </div>
                            <div className="form-group lg:col-span-4">
                                <Label htmlFor="status" className="form-label">Status</Label>
                                <Select onValueChange={(value) => handleSelectChange('status', value)} value={budget.status?.toString()} disabled={isFaturado}>
                                    <SelectTrigger id="status" className="form-select"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">Pendente</SelectItem>
                                        <SelectItem value="1">Aprovado</SelectItem>
                                        <SelectItem value="2">Faturado</SelectItem>
                                        <SelectItem value="3">Alterado</SelectItem>
                                        <SelectItem value="4">NF-e Emitida</SelectItem>
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

                    <div className="lg:col-span-1 space-y-2 p-4 bg-slate-500 rounded-lg border border-slate-200">
                        <h3 className="config-title mb-2">Resumo do Pedido</h3>
                        <div className="flex justify-between text-slate-700"><span>Total dos Produtos R$</span><span>{formatCurrency(totalProdutosBruto)}</span></div>
                        <div className="flex justify-between text-slate-700"><span>Total dos Serviços R$</span><span>{formatCurrency(totalServicosBruto)}</span></div>
                        <div className="flex justify-between text-slate-700"><span>Total do Pedido R$</span><span>{formatCurrency(totalDoPedido)}</span></div>
                        <div className="flex justify-between text-slate-700"><span>Total Desconto R$</span><span>{formatCurrency(totalDescontoDisplay)}</span></div>
                        <div className="flex justify-between font-bold text-lg text-blue-700 border-t border-slate-300 pt-2 mt-2"><span>Total Líq. do Pedido R$</span><span>{formatCurrency(totalLiquidoFinal)}</span></div>
                    </div>
                </div>
                
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
                        <Button variant="outline" onClick={() => setIsDiscountDialogOpen(true)} disabled={isFaturado || !id || compositions.length === 0}>
                            <Percent className="w-4 h-4 mr-2" /> Desconto
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={handleShareBudgetDirectly} // Changed to direct navigation
                            disabled={!id || isFaturado}
                            className="bg-green-500 hover:bg-green-600 text-white"
                        >
                            <Share2 className="w-4 h-4 mr-2" /> Compartilhar Orçamento
                        </Button>
                        <Button onClick={() => handleSave()} className="save-button" disabled={saving || isFaturado}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Salvar Orçamento
                        </Button>
                    </div>
                </div>

                {budget.signature_url && (
                    <div className="mt-8 pt-6 border-t border-slate-200">
                        <h3 className="config-title mb-4 flex items-center gap-2">
                            <PencilLine className="w-5 h-5 text-blue-600" /> Assinatura do Orçamento
                        </h3>
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 max-w-md">
                            <img src={budget.signature_url} alt="Assinatura do Orçamento" className="max-w-full h-auto" />
                            <p className="text-sm text-slate-600 mt-2">Orçamento assinado digitalmente em {new Date(budget.updated_at).toLocaleDateString('pt-BR')}.</p>
                        </div>
                    </div>
                )}

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

            <DiscountDialog
                isOpen={isDiscountDialogOpen}
                setIsOpen={setIsDiscountDialogOpen}
                totalOrderValue={totalDoPedido}
                onApplyDiscount={handleApplyDiscount}
                isFaturado={isFaturado}
            />

            {/* Share Link Dialog (Removed from this page, but keeping the component definition for clarity if needed elsewhere) */}
            {/*
            <Dialog open={isShareLinkDialogOpen} onOpenChange={setIsShareLinkDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Share2 className="w-5 h-5 text-blue-600" /> Compartilhar Orçamento
                        </DialogTitle>
                        <DialogDescription>
                            Copie o link abaixo para compartilhar este orçamento com o cliente para assinatura.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="share-link" className="sr-only">Link de Compartilhamento</Label>
                        <div className="flex space-x-2">
                            <Input
                                id="share-link"
                                type="text"
                                value={shareLink}
                                readOnly
                                className="flex-1"
                            />
                            <Button onClick={handleCopyLink} className="shrink-0">
                                <Copy className="w-4 h-4 mr-2" /> Copiar
                            </Button>
                        </div>
                        <p className="text-sm text-slate-500 mt-2">
                            O cliente poderá visualizar e assinar o orçamento através deste link.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsShareLinkDialogOpen(false)}>
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            */}
        </div>
    );
};

export default BudgetEditorPage;