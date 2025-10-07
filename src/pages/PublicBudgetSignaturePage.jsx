"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ClipboardList, PencilLine, CheckCircle, XCircle, Eraser, Save, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SignatureCanvas from 'react-signature-canvas'; // Importar SignatureCanvas
import { formatCurrency, formatCpfCnpj, capitalizeFirstLetter } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

const PublicBudgetSignaturePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [budget, setBudget] = useState(null);
  const [compositions, setCompositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unitsMap, setUnitsMap] = new Map(); // CORRIGIDO: Inicialização com useState(new Map())
  const [allMunicipalities, setAllMunicipalities] = useState([]);
  const [activeCompanyData, setActiveCompanyData] = useState(null);

  // Signature state
  const sigCanvas = useRef({});
  const [isSignatureEmpty, setIsSignatureEmpty] = useState(true);
  const [savingSignature, setSavingSignature] = useState(false);

  // Map numeric status to display string
  const statusMapDisplay = {
      '0': 'Pendente',
      '1': 'Aprovado',
      '2': 'Faturado',
      '3': 'Alterado',
      '4': 'NF-e Emitida',
  };

  const isPendente = budget?.status === '0';
  const isAprovado = budget?.status === '1';
  const isFaturado = budget?.status === '2';
  const hasSignature = budget?.signature_url && budget.signature_url.trim() !== '';

  // Log the ID received by this component
  useEffect(() => {
    console.log("PublicBudgetSignaturePage: Component mounted/updated.");
    console.log("PublicBudgetSignaturePage: ID from useParams:", id); // Log the ID here
  }, [id]);

  const fetchUfsAndMunicipalities = useCallback(async () => {
    console.log("PublicBudgetSignaturePage: fetchUfsAndMunicipalities called.");
    try {
      const { data: municipalitiesData, error: municipalitiesError } = await supabase
        .from('municipios')
        .select('codigo, municipio')
        .order('municipio');
      if (municipalitiesError) throw municipalitiesError;
      setAllMunicipalities(municipalitiesData);
      console.log("PublicBudgetSignaturePage: Municipalities fetched successfully.");
    } catch (error) {
      console.error("PublicBudgetSignaturePage: Error fetching Municipalities:", error);
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

  const fetchBudgetDetails = useCallback(async () => {
    console.log("PublicBudgetSignaturePage: fetchBudgetDetails called for ID:", id); // Log when fetch starts
    if (!id) {
      console.log("PublicBudgetSignaturePage: ID is null or undefined, skipping fetch.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Fetch budget
      const { data: budgetData, error: budgetError } = await supabase
        .from('orcamento')
        .select('*')
        .eq('id', parseInt(id, 10))
        .single();

      if (budgetError) {
        console.error("PublicBudgetSignaturePage: Supabase error fetching budget:", budgetError); // More specific error log
        throw new Error(`Orçamento não encontrado ou você não tem permissão para acessá-lo. Detalhes: ${budgetError.message}`);
      }
      if (!budgetData) {
        console.log("PublicBudgetSignaturePage: No budget data returned for ID:", id); // Log if no data
        throw new Error("Orçamento não encontrado.");
      }
      console.log("PublicBudgetSignaturePage: Budget data fetched:", budgetData);

      // Fetch client details
      let clientDetails = null;
      if (budgetData.cliente_id) {
        const { data: clientData, error: clientError } = await supabase
          .from('pessoas')
          .select('*')
          .eq('cpf_cnpj', budgetData.cliente_id)
          .single();
        if (clientError) console.error("PublicBudgetSignaturePage: Error fetching client for public budget:", clientError);
        clientDetails = clientData;
      }
      console.log("PublicBudgetSignaturePage: Client data fetched:", clientDetails);

      // Fetch active company details for display
      let companyDetails = null;
      if (budgetData.cnpj_empresa) {
        const { data: companyRes, error: companyError } = await supabase
          .from('emitente')
          .select('razao_social, nome_fantasia, cnpj, telefone, email, logo_sistema_url, logo_documentos_url, logradouro, numero, complemento, bairro, municipio, uf') // Adicionado mais campos
          .eq('cnpj', budgetData.cnpj_empresa)
          .single();
        if (companyError) console.error("PublicBudgetSignaturePage: Error fetching company for public budget:", companyError);
        companyDetails = companyRes;
      }
      setActiveCompanyData(companyDetails);
      console.log("PublicBudgetSignaturePage: Company data fetched:", companyDetails);

      const enrichedBudgetData = {
        ...budgetData,
        data_orcamento: budgetData.data_orcamento ? new Date(budgetData.data_orcamento).toLocaleDateString('pt-BR') : '',
        previsao_entrega: budgetData.previsao_entrega ? new Date(budgetData.previsao_entrega).toLocaleDateString('pt-BR') : '',
        nome_cliente: clientDetails ? (clientDetails.nome_fantasia && clientDetails.razao_social ? `${clientDetails.nome_fantasia} - ${clientDetails.razao_social}` : clientDetails.razao_social || clientDetails.nome_fantasia) : 'Cliente Não Informado',
        cliente_endereco_completo: clientDetails ? buildClientAddressString(clientDetails) : '',
        // Ensure signature_url is truly null if it's empty or whitespace
        signature_url: (budgetData.signature_url && budgetData.signature_url.trim() !== '') ? budgetData.signature_url : null,
      };
      setBudget(enrichedBudgetData);

      // Fetch compositions
      const { data: compData, error: compError } = await supabase
        .from('orcamento_composicao')
        .select('*, produtos!produto_id(prod_xProd, prod_uCOM)')
        .eq('orcamento_id', parseInt(id, 10));
      if (compError) throw compError;
      setCompositions(compData);
      console.log("PublicBudgetSignaturePage: Compositions data fetched:", compData);

      // Fetch units
      const { data: unitsData, error: unitsError } = await supabase
        .from('unidade')
        .select('codigo, unidade')
        .order('unidade', { ascending: true });
      if (unitsError) throw unitsError;
      const map = new Map(unitsData.map(unit => [unit.codigo, unit.unidade]));
      setUnitsMap(map);
      console.log("PublicBudgetSignaturePage: Units data fetched.");

    } catch (error) {
      console.error("PublicBudgetSignaturePage: Caught error in fetchBudgetDetails:", error); // Log caught error
      toast({ variant: 'destructive', title: 'Erro ao carregar orçamento', description: error.message || 'Ocorreu um erro inesperado ao carregar o orçamento.' });
      setBudget(null); // Ensure budget is null on error
    } finally {
      setLoading(false);
      // console.log("PublicBudgetSignaturePage: fetchBudgetDetails finished. Budget state (after setBudget):", budget); // Removed this log as it would show stale state
    }
  }, [id, toast, buildClientAddressString, allMunicipalities]); // Removed 'budget' from dependencies

  useEffect(() => {
    fetchUfsAndMunicipalities();
  }, [fetchUfsAndMunicipalities]);

  useEffect(() => {
    if (allMunicipalities.length > 0) {
      fetchBudgetDetails();
    }
  }, [allMunicipalities, fetchBudgetDetails]);

  const saveSignatureAndApprove = async () => {
    if (sigCanvas.current.isEmpty()) {
      toast({
        variant: 'destructive',
        title: 'Assinatura vazia',
        description: 'Por favor, assine no campo antes de salvar.',
      });
      return;
    }
    if (!budget?.id) {
      toast({ variant: 'destructive', title: 'Erro', description: 'ID do orçamento não disponível.' });
      return;
    }

    setSavingSignature(true);
    try {
      // Use getCanvas() instead of getTrimmedCanvas() to avoid internal module error
      const dataUrl = sigCanvas.current.getCanvas().toDataURL('image/png');
      const fileExt = 'png';
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `public/${budget.id}/${fileName}`; // Store in a public subfolder

      const response = await fetch(dataUrl);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('budget_signatures')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/png',
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('budget_signatures')
        .getPublicUrl(filePath);
      
      // Update budget status to '1' (Aprovado) and save signature URL
      const { error: updateError } = await supabase
        .from('orcamento')
        .update({ status: '1', signature_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', budget.id)
        .or('status.eq.0,signature_url.is.null,signature_url.eq.') // Only update if still '0' (Pendente) or no signature yet
        .select(); // Select the updated data to refresh state

      if (updateError) throw updateError;

      setBudget(prev => ({ ...prev, status: '1', signature_url: publicUrl }));
      toast({ title: 'Orçamento Aprovado!', description: 'Assinatura salva e status atualizado para Aprovado.' });
    } catch (error) {
      console.error("Error uploading signature:", error);
      toast({ variant: 'destructive', title: 'Erro ao salvar assinatura', description: error.message || 'Ocorreu um erro inesperado.' });
    } finally {
      setSavingSignature(false);
    }
  };

  const clearSignature = () => {
    sigCanvas.current.clear();
    setIsSignatureEmpty(true);
  };

  const handleCanvasChange = () => {
    setIsSignatureEmpty(sigCanvas.current.isEmpty());
  };

  const totalProdutosBruto = compositions.reduce((sum, item) => sum + (item.quantidade * item.valor_venda), 0);
  const totalServicosBruto = 0;
  const sumOfItemDiscounts = compositions.reduce((sum, item) => sum + (item.desconto_total || 0), 0);
  const totalDoPedido = totalProdutosBruto + totalServicosBruto;
  const totalDescontoDisplay = sumOfItemDiscounts;
  const totalLiquidoFinal = totalDoPedido - totalDescontoDisplay;

  // Para fins de teste, o campo de assinatura aparecerá SEMPRE.
  // Depois de confirmar que funciona, podemos reintroduzir as regras de status.
  const canShowSignatureField = true; 

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  // Log the budget state right before the conditional render
  console.log("PublicBudgetSignaturePage: Rendering. Current budget state:", budget);

  if (!budget) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 text-center">
        <XCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">Orçamento Não Encontrado</h2>
        <p className="text-slate-600">
          Verifique o link e tente novamente. Se o problema persistir, pode ser um problema de permissões.
          Certifique-se de que as políticas de RLS (Row Level Security) para as tabelas `orcamento`, `pessoas`, `emitente`, `municipios` e `unidade`
          permitam acesso de leitura para o papel `anon` (usuários não autenticados).
        </p>
        <Button onClick={() => navigate('/')} className="mt-6">Voltar para o Início</Button>
      </div>
    );
  }

  const companyAddress = [
    activeCompanyData?.logradouro,
    activeCompanyData?.numero,
    activeCompanyData?.complemento,
    activeCompanyData?.bairro,
    activeCompanyData?.municipio,
    activeCompanyData?.uf
  ].filter(Boolean).join(', ');

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-4xl bg-white/80 backdrop-blur-xl p-8 rounded-xl shadow-lg border border-white space-y-6">
        <div className="flex justify-between items-start border-b pb-4 mb-4">
          <div className="flex items-center space-x-3">
            {activeCompanyData?.logo_documentos_url ? ( // Usar logo_documentos_url
              <img src={activeCompanyData.logo_documentos_url} alt="Company Logo" className="h-16 object-contain" />
            ) : (
              <div className="h-16 w-16 flex items-center justify-center bg-slate-200 rounded-md">
                <ClipboardList className="w-8 h-8 text-slate-400" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{activeCompanyData?.razao_social || 'Sua Empresa'}</h1>
              {activeCompanyData?.nome_fantasia && <p className="text-sm text-slate-600">{activeCompanyData.nome_fantasia}</p>}
              <p className="text-sm text-slate-600">{activeCompanyData?.cnpj}</p>
              <p className="text-sm text-slate-600">{companyAddress}</p>
              <p className="text-sm text-slate-600">{activeCompanyData?.telefone} | {activeCompanyData?.email}</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-extrabold text-blue-600">ORÇAMENTO</h2>
            <p className="text-xl font-semibold text-slate-800">Nº {budget.numero_pedido || budget.id}</p>
            <p className="text-sm text-slate-600">Data: {budget.data_orcamento}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-semibold text-slate-700 mb-1">Cliente:</h3>
            <p className="text-slate-800">{budget.nome_cliente}</p>
            <p className="text-slate-600">{formatCpfCnpj(budget.cliente_id, budget.cliente_id?.length === 11 ? 1 : 2)}</p>
            <p className="text-slate-600">{budget.cliente_endereco_completo}</p>
            <p className="text-slate-600">Solicitante: {budget.solicitante} ({budget.telefone})</p>
          </div>
          <div className="md:text-right">
            <h3 className="font-semibold text-slate-700 mb-1">Condições:</h3>
            <p className="text-slate-800">Vendedor: {budget.vendedor}</p>
            <p className="text-slate-600">Forma de Pagamento: {budget.forma_pagamento === '0' ? 'À Vista' : budget.forma_pagamento === '1' ? 'À Prazo' : 'Outros'}</p>
            <p className="text-slate-600">Condição de Pagamento: {budget.condicao_pagamento || 'N/A'}</p>
            <p className="text-slate-600">Previsão de Entrega: {budget.previsao_entrega || 'N/A'}</p>
            <p className="text-slate-600">Validade da Proposta: {budget.validade} dias</p>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <ClipboardList className="w-4 h-4" /> Itens do Orçamento
          </h3>
          <div className="overflow-x-auto border rounded-md">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Item</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Unid.</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Qtde</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Unit. R$</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Total R$</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Desc. R$</th>
                  <th className="px-4 py-2 whitespace-nowrap text-sm text-right font-semibold text-slate-800">Líq. R$</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {compositions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-4 text-center text-slate-500">Nenhum item no orçamento.</td>
                  </tr>
                ) : (
                  compositions.map((comp, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-slate-900">{comp.produtos?.prod_xProd || `Produto ID: ${comp.produto_id}`}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-slate-500">{unitsMap.get(comp.produtos?.prod_uCOM) || 'N/A'}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-slate-500">{comp.quantidade}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-slate-500">{formatCurrency(comp.valor_venda)}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-slate-500">{formatCurrency(comp.quantidade * comp.valor_venda)}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-slate-500">{formatCurrency(comp.desconto_total || 0)}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-right font-semibold text-slate-800">{formatCurrency((comp.quantidade * comp.valor_venda) - (comp.desconto_total || 0))}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <div className="w-full md:w-1/2 space-y-1 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="font-semibold text-slate-700 mb-2">Resumo do Pedido</h3>
            <div className="flex justify-between text-slate-700"><span>Total dos Produtos R$</span><span>{formatCurrency(totalProdutosBruto)}</span></div>
            <div className="flex justify-between text-slate-700"><span>Total dos Serviços R$</span><span>{formatCurrency(totalServicosBruto)}</span></div>
            <div className="flex justify-between text-slate-700"><span>Total do Pedido R$</span><span>{formatCurrency(totalDoPedido)}</span></div>
            <div className="flex justify-between text-slate-700"><span>Total Desconto R$</span><span>{formatCurrency(totalDescontoDisplay)}</span></div>
            <div className="flex justify-between font-bold text-lg text-blue-700 border-t border-slate-300 pt-2 mt-2"><span>Total Líq. do Pedido R$</span><span>{formatCurrency(totalLiquidoFinal)}</span></div>
          </div>
        </div>

        {budget.observacao && (
          <div className="mt-6">
            <h3 className="font-semibold text-slate-700 mb-2">Observações:</h3>
            <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md border">{budget.observacao}</p>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-200 text-center">
          {canShowSignatureField ? (
            <>
              <h3 className="text-xl font-semibold text-slate-800 mb-4 flex items-center justify-center gap-2">
                <PencilLine className="w-6 h-6 text-blue-600" /> Sua Assinatura:
              </h3>
              <div className="border border-slate-300 rounded-md overflow-hidden bg-slate-50 max-w-md mx-auto">
                <SignatureCanvas
                  ref={sigCanvas}
                  canvasProps={{ width: 450, height: 200, className: 'signature-canvas bg-white' }}
                  penColor="black"
                  minWidth={1}
                  maxWidth={2}
                  onEnd={handleCanvasChange}
                  onBegin={handleCanvasChange}
                />
              </div>
              <p className="text-center text-sm text-slate-500 mt-2">Assine aqui</p>
              <div className="flex justify-center space-x-4 mt-6">
                <Button variant="destructive" onClick={() => navigate('/')}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
                <Button variant="outline" onClick={clearSignature} disabled={isSignatureEmpty || savingSignature}>
                  <Eraser className="mr-2 h-4 w-4" /> Limpar
                </Button>
                <Button onClick={saveSignatureAndApprove} disabled={isSignatureEmpty || savingSignature}>
                  {savingSignature && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" /> Assinar e Salvar
                </Button>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-xl font-semibold text-slate-800 mb-4 flex items-center justify-center gap-2">
                {isAprovado || isFaturado ? <CheckCircle className="w-6 h-6 text-green-600" /> : <XCircle className="w-6 h-6 text-red-600" />}
                Status do Orçamento: <span className={`ml-2 ${isAprovado || isFaturado ? 'text-green-600' : 'text-red-600'}`}>{statusMapDisplay[budget?.status] || 'Desconhecido'}</span>
              </h3>
              {budget.signature_url && (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 max-w-md mx-auto">
                  <img src={budget.signature_url} alt="Assinatura do Orçamento" className="max-w-full h-auto" />
                  <p className="text-sm text-slate-600 mt-2">Assinado digitalmente.</p>
                </div>
              )}
              {isFaturado && (
                <p className="text-lg font-medium text-slate-700 mt-4">Este orçamento já foi faturado.</p>
              )}
              <Button onClick={() => navigate('/')} className="mt-6">Voltar para o Início</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicBudgetSignaturePage;