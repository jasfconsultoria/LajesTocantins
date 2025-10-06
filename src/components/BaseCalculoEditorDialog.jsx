"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, FileText, Percent } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import SelectSearchCstCsosn from '@/components/SelectSearchCstCsosn';
import SelectSearchCfop from '@/components/SelectSearchCfop';
import SelectSearchAliquota from '@/components/SelectSearchAliquota';
import { logAction } from '@/lib/log';

const initialBaseCalculoState = {
    id_produto: null,
    id_cst_csosn: null,
    id_cfop: null,
    id_aliquota: null,
    // Campos para exibir os detalhes dos objetos selecionados
    cst_csosn_obj: null,
    cfop_obj: null,
    aliquota_obj: null,
};

const BaseCalculoEditorDialog = ({ isOpen, setIsOpen, productId, activeCompanyCnpj, initialData, onSave }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [formData, setFormData] = useState(initialBaseCalculoState);
    const [loading, setLoading] = useState(false);
    const isEditing = !!initialData;

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    ...initialData,
                    cst_csosn_obj: initialData.cst_csosn_obj || null,
                    cfop_obj: initialData.cfop_obj || null,
                    aliquota_obj: initialData.aliquota_obj || null,
                });
            } else {
                setFormData({ ...initialBaseCalculoState, id_produto: productId });
            }
        }
    }, [isOpen, initialData, productId]);

    const handleSelectCstCsosn = (selected) => {
        setFormData(prev => ({
            ...prev,
            id_cst_csosn: selected ? selected.id : null,
            cst_csosn_obj: selected,
        }));
    };

    const handleSelectCfop = (selected) => {
        setFormData(prev => ({
            ...prev,
            id_cfop: selected ? selected.cfop : null, // CFOP é string
            cfop_obj: selected,
        }));
    };

    const handleSelectAliquota = (selected) => {
        setFormData(prev => ({
            ...prev,
            id_aliquota: selected ? selected.id : null,
            aliquota_obj: selected,
        }));
    };

    const handleSubmit = async () => {
        if (!formData.id_cst_csosn || !formData.id_cfop || !formData.id_aliquota) {
            toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Todos os campos de seleção são obrigatórios.' });
            return;
        }

        setLoading(true);
        try {
            const saveData = {
                id_produto: productId,
                id_cst_csosn: formData.id_cst_csosn,
                id_cfop: formData.id_cfop,
                id_aliquota: formData.id_aliquota,
                updated_at: new Date().toISOString(),
            };

            let error;
            let actionType;
            let description;

            if (isEditing) {
                const { error: updateError } = await supabase
                    .from('base_calculo')
                    .update(saveData)
                    .eq('id', initialData.id);
                error = updateError;
                actionType = 'base_calculo_update';
                description = `Base de Cálculo (ID: ${initialData.id}) para produto (ID: ${productId}) atualizada.`;
            } else {
                delete saveData.id; // Ensure ID is not sent for new records
                const { data: newEntryData, error: insertError } = await supabase
                    .from('base_calculo')
                    .insert([saveData])
                    .select();
                error = insertError;
                actionType = 'base_calculo_create';
                description = `Nova Base de Cálculo (ID: ${newEntryData?.[0]?.id}) para produto (ID: ${productId}) criada.`;
            }

            if (error) {
                if (error.code === '23505') { // Unique constraint violation
                    toast({ variant: 'destructive', title: 'Erro de Duplicidade', description: 'Já existe uma Base de Cálculo com esta combinação de CST/CFOP/Alíquota para este produto.' });
                } else {
                    toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message });
                }
                return;
            }

            if (user) {
                await logAction(user.id, actionType, description, activeCompanyCnpj, productId);
            }

            toast({ title: 'Sucesso!', description: `Base de Cálculo ${isEditing ? 'atualizada' : 'criada'} com sucesso.` });
            onSave();
            setIsOpen(false);
        } catch (error) {
            console.error("Caught error in handleSubmit (BaseCalculoEditorDialog):", error);
            toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message || 'Ocorreu um erro inesperado ao salvar a Base de Cálculo.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Editar Base de Cálculo' : 'Adicionar Base de Cálculo'}</DialogTitle>
                    <DialogDescription>
                        Configure os parâmetros fiscais para o cálculo de ICMS deste produto.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="form-group">
                        <Label htmlFor="cst_csosn" className="form-label">CST/CSOSN *</Label>
                        <SelectSearchCstCsosn
                            value={formData.cst_csosn_obj}
                            onValueChange={handleSelectCstCsosn}
                            disabled={loading}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <Label htmlFor="cfop" className="form-label">CFOP *</Label>
                        <SelectSearchCfop
                            value={formData.cfop_obj}
                            onValueChange={handleSelectCfop}
                            disabled={loading}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <Label htmlFor="aliquota" className="form-label">Alíquota ICMS *</Label>
                        <SelectSearchAliquota
                            value={formData.aliquota_obj}
                            onValueChange={handleSelectAliquota}
                            disabled={loading}
                            required
                            activeCompanyCnpj={activeCompanyCnpj}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading} className="save-button">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default BaseCalculoEditorDialog;