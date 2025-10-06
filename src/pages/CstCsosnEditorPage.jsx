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
import { logAction } from '@/lib/log';

const initialCstCsosnState = {
    cst_csosn: '',
    descricao: '',
    origem: '',
    resumo: '',
};

const CstCsosnEditorPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();

    const [cstCsosnData, setCstCsosnData] = useState(initialCstCsosnState);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const isEditing = !!id;

    const fetchCstCsosn = useCallback(async () => {
        if (!isEditing) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('cst_csosn')
                .select('*')
                .eq('id', id)
                .single();
            if (error) throw error;
            if (data) setCstCsosnData(data);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao carregar CST/CSOSN', description: error.message });
        } finally {
            setLoading(false);
        }
    }, [id, isEditing, toast]);

    useEffect(() => {
        fetchCstCsosn();
    }, [fetchCstCsosn]);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setCstCsosnData(prev => ({ ...prev, [id]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const saveData = {
                ...cstCsosnData,
                updated_at: new Date().toISOString(),
            };

            let error;
            let actionType;
            let description;

            if (isEditing) {
                const { error: updateError } = await supabase
                    .from('cst_csosn')
                    .update(saveData)
                    .eq('id', id);
                error = updateError;
                actionType = 'cst_csosn_update';
                description = `CST/CSOSN "${cstCsosnData.cst_csosn}" (ID: ${id}) atualizado.`;
            } else {
                delete saveData.id; // Ensure ID is not sent for new records
                const { data: newCstCsosnData, error: insertError } = await supabase
                    .from('cst_csosn')
                    .insert([saveData])
                    .select();
                error = insertError;
                actionType = 'cst_csosn_create';
                description = `Novo CST/CSOSN "${saveData.cst_csosn}" (ID: ${newCstCsosnData?.[0]?.id}) criado.`;
                if (newCstCsosnData && newCstCsosnData.length > 0) {
                    saveData.id = newCstCsosnData[0].id;
                }
            }

            if (error) {
                // Check for unique constraint violation if applicable (e.g., cst_csosn code)
                if (error.code === '23505') { // PostgreSQL unique_violation error code
                    toast({ variant: 'destructive', title: 'Erro de Duplicidade', description: 'Já existe um CST/CSOSN com este código.' });
                } else {
                    toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message });
                }
                return;
            }

            if (user) {
                await logAction(user.id, actionType, description, null, null);
            }

            toast({ title: 'Sucesso!', description: `CST/CSOSN ${isEditing ? 'atualizado' : 'criado'} com sucesso.` });
            navigate('/app/notas/cst');
        } catch (error) {
            console.error("Caught error in handleSave (CstCsosnEditorPage):", error);
            toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message || 'Ocorreu um erro inesperado ao salvar o CST/CSOSN.' });
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
                <Button variant="outline" size="icon" onClick={() => navigate('/app/notas/cst')}>
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold gradient-text">{isEditing ? 'Editar CST/CSOSN' : 'Novo CST/CSOSN'}</h1>
                    <p className="text-slate-600 mt-1">Gerencie os detalhes do Código de Situação Tributária.</p>
                </div>
            </div>

            <div className="config-card max-w-2xl mx-auto">
                <div className="config-header">
                    <div className="flex items-center gap-3">
                        <FileText className="w-6 h-6 text-blue-600" />
                        <div>
                            <h3 className="config-title">Dados do CST/CSOSN</h3>
                            <p className="config-description">Informações do código e sua descrição.</p>
                        </div>
                    </div>
                </div>
                <div className="form-grid pt-6">
                    <div className="form-group">
                        <Label htmlFor="cst_csosn" className="form-label">CST/CSOSN *</Label>
                        <Input 
                            id="cst_csosn" 
                            type="text" 
                            className="form-input" 
                            value={cstCsosnData.cst_csosn} 
                            onChange={handleInputChange} 
                            disabled={isEditing} // CST/CSOSN code should not be editable after creation
                            placeholder="Ex: 00"
                            maxLength={3}
                        />
                    </div>
                    <div className="form-group">
                        <Label htmlFor="origem" className="form-label">Origem</Label>
                        <Input 
                            id="origem" 
                            type="text" 
                            className="form-input" 
                            value={cstCsosnData.origem} 
                            onChange={handleInputChange} 
                            placeholder="Ex: Nacional"
                        />
                    </div>
                    <div className="form-group md:col-span-2">
                        <Label htmlFor="descricao" className="form-label">Descrição *</Label>
                        <Textarea 
                            id="descricao" 
                            className="form-textarea" 
                            value={cstCsosnData.descricao} 
                            onChange={handleInputChange} 
                            rows={3}
                            placeholder="Ex: Tributada integralmente"
                        />
                    </div>
                    <div className="form-group md:col-span-2">
                        <Label htmlFor="resumo" className="form-label">Resumo</Label>
                        <Textarea 
                            id="resumo" 
                            className="form-textarea" 
                            value={cstCsosnData.resumo} 
                            onChange={handleInputChange} 
                            rows={2}
                            placeholder="Breve resumo do CST/CSOSN"
                        />
                    </div>
                </div>
                
                <div className="flex justify-end mt-8">
                    <Button onClick={handleSave} className="save-button" disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Salvar CST/CSOSN
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default CstCsosnEditorPage;