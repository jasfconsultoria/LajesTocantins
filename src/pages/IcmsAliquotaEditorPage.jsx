"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Save, Loader2, ArrowLeft, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { logAction } from '@/lib/log';

const initialAliquotaState = {
    uf_origem: '',
    uf_destino: '',
    aliquota_icms: 0.00,
    aliquota_fecp: 0.00,
    aliquota_reducao: 0.00,
};

const IcmsAliquotaEditorPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, activeCompany } = useAuth();
    const { toast } = useToast();
    const { activeCompanyId } = useOutletContext();

    const [aliquota, setAliquota] = useState(initialAliquotaState);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [ufs, setUfs] = useState([]);
    const isEditing = !!id;

    const fetchUfs = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('estados')
                .select('sigla, estado')
                .order('sigla');
            if (error) throw error;
            setUfs(data);
        } catch (error) {
            console.error("Error fetching UFs:", error.message);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar as UFs.' });
        }
    }, [toast]);

    const fetchAliquota = useCallback(async () => {
        if (!activeCompany?.cnpj) { // Ensure activeCompany is loaded
            setLoading(false);
            return;
        }

        if (!isEditing) {
            setAliquota(prev => ({ ...prev, uf_origem: activeCompany.uf || '' })); // Pre-fill uf_origem for new entries
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('aliquota_interestadual')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            if (data) setAliquota(data);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao carregar alíquota', description: error.message });
        } finally {
            setLoading(false);
        }
    }, [id, isEditing, toast, activeCompany]); // Added activeCompany to dependencies

    useEffect(() => {
        fetchUfs();
    }, [fetchUfs]);

    useEffect(() => {
        if (ufs.length > 0 || !isEditing) {
            fetchAliquota();
        }
    }, [fetchAliquota, ufs, isEditing]);

    const handleInputChange = (e) => {
        const { id, value, type } = e.target;
        let parsedValue = value;

        if (type === 'number') {
            parsedValue = parseFloat(value);
            if (isNaN(parsedValue)) parsedValue = 0.00;
        }

        setAliquota(prev => ({
            ...prev,
            [id]: parsedValue
        }));
    };

    const handleSelectChange = (id, value) => {
        setAliquota(prev => ({ ...prev, [id]: value }));
    };

    const handleSave = async () => {
        if (!activeCompany?.cnpj) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Nenhuma empresa ativa selecionada.' });
            return;
        }
        if (!aliquota.uf_origem || !aliquota.uf_destino) {
            toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'UF de Origem e UF de Destino são obrigatórios.' });
            return;
        }

        setSaving(true);
        try {
            const saveData = {
                ...aliquota,
                cnpj_empresa: activeCompany.cnpj,
                updated_at: new Date().toISOString(),
            };

            let error;
            let actionType;
            let description;

            if (isEditing) {
                const { error: updateError } = await supabase
                    .from('aliquota_interestadual')
                    .update(saveData)
                    .eq('id', id);
                error = updateError;
                actionType = 'icms_aliquota_update';
                description = `Alíquota ICMS (ID: ${id}) de ${aliquota.uf_origem} para ${aliquota.uf_destino} atualizada.`;
            } else {
                delete saveData.id; // Ensure ID is not sent for new records
                const { data: newAliquotaData, error: insertError } = await supabase
                    .from('aliquota_interestadual')
                    .insert([saveData])
                    .select();
                error = insertError;
                actionType = 'icms_aliquota_create';
                description = `Nova alíquota ICMS de ${saveData.uf_origem} para ${saveData.uf_destino} (ID: ${newAliquotaData?.[0]?.id}) criada.`;
                if (newAliquotaData && newAliquotaData.length > 0) {
                    saveData.id = newAliquotaData[0].id;
                }
            }

            if (error) {
                // Check for unique constraint violation
                if (error.code === '23505') { // PostgreSQL unique_violation error code
                    toast({ variant: 'destructive', title: 'Erro de Duplicidade', description: 'Já existe uma alíquota configurada para esta combinação de UF de Origem e UF de Destino.' });
                } else {
                    toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message });
                }
                return;
            }

            if (user) {
                await logAction(user.id, actionType, description, activeCompanyId, null);
            }

            toast({ title: 'Sucesso!', description: `Alíquota ${isEditing ? 'atualizada' : 'criada'} com sucesso.` });
            navigate('/app/notas/icms-aliquotas');
        } catch (error) {
            console.error("Caught error in handleSave (IcmsAliquotaEditorPage):", error);
            toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message || 'Ocorreu um erro inesperado ao salvar a alíquota.' });
        } finally {
            setSaving(false);
        }
    };

    const aliquotaAplicada = useMemo(() => {
        const icms = aliquota.aliquota_icms || 0;
        const fecp = aliquota.aliquota_fecp || 0;
        const reducao = aliquota.aliquota_reducao || 0;
        return (icms + fecp - reducao).toFixed(2);
    }, [aliquota.aliquota_icms, aliquota.aliquota_fecp, aliquota.aliquota_reducao]);

    if (loading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
    }

    if (!activeCompany?.cnpj) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center bg-white/80 rounded-xl shadow-sm border border-white p-8">
                <Percent className="w-16 h-16 text-blue-500 mb-4" />
                <h2 className="text-2xl font-bold text-slate-800">Nenhuma Empresa Ativa</h2>
                <p className="text-slate-600">Selecione uma empresa para configurar as alíquotas ICMS.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => navigate('/app/notas/icms-aliquotas')}>
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold gradient-text">{isEditing ? 'Editar Alíquota ICMS' : 'Nova Alíquota ICMS'}</h1>
                    <p className="text-slate-600 mt-1">Gerencie as alíquotas de ICMS e FCP para operações interestaduais.</p>
                </div>
            </div>

            <div className="config-card max-w-2xl mx-auto">
                <div className="config-header">
                    <div className="flex items-center gap-3">
                        <Percent className="w-6 h-6 text-blue-600" />
                        <div>
                            <h3 className="config-title">Dados da Alíquota</h3>
                            <p className="config-description">Defina as alíquotas de ICMS, FECOP e redução da Base de Cálculo.</p>
                        </div>
                    </div>
                </div>
                <div className="form-grid pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-group">
                        <Label htmlFor="uf_origem" className="form-label">UF de Origem *</Label>
                        <Select onValueChange={(value) => handleSelectChange('uf_origem', value)} value={aliquota.uf_origem} disabled={isEditing || true}>
                            <SelectTrigger id="uf_origem" className="form-select">
                                <SelectValue placeholder="Selecione a UF" />
                            </SelectTrigger>
                            <SelectContent>
                                {ufs.map(uf => (
                                    <SelectItem key={uf.sigla} value={uf.sigla}>{uf.sigla} - {uf.estado}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="form-group">
                        <Label htmlFor="uf_destino" className="form-label">UF de Destino *</Label>
                        <Select onValueChange={(value) => handleSelectChange('uf_destino', value)} value={aliquota.uf_destino} disabled={isEditing}>
                            <SelectTrigger id="uf_destino" className="form-select">
                                <SelectValue placeholder="Selecione a UF" />
                            </SelectTrigger>
                            <SelectContent>
                                {ufs.map(uf => (
                                    <SelectItem key={uf.sigla} value={uf.sigla}>{uf.sigla} - {uf.estado}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="form-group">
                        <Label htmlFor="aliquota_icms" className="form-label">Alíquota ICMS (%) *</Label>
                        <Input 
                            id="aliquota_icms" 
                            type="number" 
                            step="0.01" 
                            className="form-input" 
                            value={aliquota.aliquota_icms} 
                            onChange={handleInputChange} 
                            placeholder="Ex: 12.00"
                        />
                    </div>
                    <div className="form-group">
                        <Label htmlFor="aliquota_fecp" className="form-label">Alíquota FECOP (%) *</Label>
                        <Input 
                            id="aliquota_fecp" 
                            type="number" 
                            step="0.01" 
                            className="form-input" 
                            value={aliquota.aliquota_fecp} 
                            onChange={handleInputChange} 
                            placeholder="Ex: 1.00"
                        />
                    </div>
                    <div className="form-group">
                        <Label htmlFor="aliquota_reducao" className="form-label">Alíquota Redução BC (%) *</Label>
                        <Input 
                            id="aliquota_reducao" 
                            type="number" 
                            step="0.01" 
                            className="form-input" 
                            value={aliquota.aliquota_reducao} 
                            onChange={handleInputChange} 
                            placeholder="Ex: 0.00"
                        />
                    </div>
                    <div className="form-group">
                        <Label htmlFor="aliquota_aplicada" className="form-label">Alíquota Aplicada (%)</Label>
                        <Input 
                            id="aliquota_aplicada" 
                            type="text" 
                            className="form-input" 
                            value={aliquotaAplicada} 
                            readOnly 
                            disabled 
                        />
                    </div>
                </div>
                
                <div className="flex justify-end mt-8">
                    <Button onClick={handleSave} className="save-button" disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Salvar Alíquota
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default IcmsAliquotaEditorPage;