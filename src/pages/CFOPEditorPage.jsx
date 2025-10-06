"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Save, Loader2, ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Import Select components
import { logAction } from '@/lib/log';

const initialCfopState = {
    cfop: '',
    descricao: '',
    tipo_operacao: 'Saída', // Default value for new CFOPs
};

const CFOPEditorPage = () => {
    const { cfop: cfopCodeParam } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();
    const [cfopData, setCfopData] = useState(initialCfopState);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const isEditing = !!cfopCodeParam;

    const fetchCfop = useCallback(async () => {
        if (!isEditing) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('cfop')
                .select('*, tipo_operacao') // Select tipo_operacao
                .eq('cfop', cfopCodeParam)
                .single();
            if (error) throw error;
            if (data) setCfopData(data);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao carregar CFOP', description: error.message });
        } finally {
            setLoading(false);
        }
    }, [cfopCodeParam, isEditing, toast]);

    useEffect(() => {
        fetchCfop();
    }, [fetchCfop]);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setCfopData(prev => ({ ...prev, [id]: value }));
    };

    const handleSelectChange = (value) => { // For Select component
        setCfopData(prev => ({ ...prev, tipo_operacao: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            let error;
            let actionType;
            let description;

            if (isEditing) {
                const { error: updateError } = await supabase
                    .from('cfop')
                    .update(cfopData)
                    .eq('cfop', cfopCodeParam);
                error = updateError;
                actionType = 'cfop_update';
                description = `CFOP "${cfopData.cfop} - ${cfopData.descricao}" atualizado.`;
            } else {
                const { error: insertError } = await supabase
                    .from('cfop')
                    .insert([cfopData]);
                error = insertError;
                actionType = 'cfop_create';
                description = `Novo CFOP "${cfopData.cfop} - ${cfopData.descricao}" criado.`;
            }

            if (error) throw error;

            if (user) {
                await logAction(user.id, actionType, description, null, null);
            }

            toast({ title: 'Sucesso!', description: `CFOP ${isEditing ? 'atualizado' : 'criado'} com sucesso.` });
            navigate('/app/notas/cfop');
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
                <Button variant="outline" size="icon" onClick={() => navigate('/app/notas/cfop')}>
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold gradient-text">{isEditing ? 'Editar CFOP' : 'Novo CFOP'}</h1>
                    <p className="text-slate-600 mt-1">Gerencie os detalhes do Código Fiscal de Operações e Prestações.</p>
                </div>
            </div>

            <div className="config-card max-w-2xl mx-auto">
                <div className="config-header">
                    <div className="flex items-center gap-3">
                        <FileText className="w-6 h-6 text-blue-600" />
                        <div>
                            <h3 className="config-title">Dados do CFOP</h3>
                            <p className="config-description">Informações do código e sua descrição.</p>
                        </div>
                    </div>
                </div>
                <div className="form-grid pt-6">
                    <div className="form-group">
                        <Label htmlFor="cfop" className="form-label">CFOP *</Label>
                        <Input 
                            id="cfop" 
                            type="text" 
                            className="form-input" 
                            value={cfopData.cfop} 
                            onChange={handleInputChange} 
                            disabled={isEditing} // CFOP não pode ser editado após a criação
                            placeholder="Ex: 5102"
                            maxLength={4}
                        />
                    </div>
                    <div className="form-group">
                        <Label htmlFor="tipo_operacao" className="form-label">Tipo de Operação *</Label>
                        <Select onValueChange={handleSelectChange} value={cfopData.tipo_operacao}>
                            <SelectTrigger id="tipo_operacao" className="form-select">
                                <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Entrada">Entrada</SelectItem>
                                <SelectItem value="Saída">Saída</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="form-group md:col-span-2">
                        <Label htmlFor="descricao" className="form-label">Descrição *</Label>
                        <Textarea 
                            id="descricao" 
                            className="form-textarea" 
                            value={cfopData.descricao} 
                            onChange={handleInputChange} 
                            rows={3}
                            placeholder="Ex: Venda de mercadoria adquirida ou recebida de terceiros"
                        />
                    </div>
                </div>
                
                <div className="flex justify-end mt-8">
                    <Button onClick={handleSave} className="save-button" disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Salvar CFOP
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default CFOPEditorPage;