"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, PlusCircle, Edit, Trash2, FileText, Percent, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import BaseCalculoEditorDialog from '@/components/BaseCalculoEditorDialog';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { logAction } from '@/lib/log';
import { isValidUuid } from '@/lib/utils'; // Importa a função de validação de UUID

const BaseCalculoList = ({ productId, activeCompanyCnpj }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [baseCalculoEntries, setBaseCalculoEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState(null);

    const fetchBaseCalculoEntries = useCallback(async () => {
        if (!productId || !isValidUuid(productId)) { // Valida o productId como UUID
            console.warn("BaseCalculoList: productId is missing or not a valid UUID. Skipping fetch.");
            setBaseCalculoEntries([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            // Using an RPC function to fetch base_calculo with joined data
            const { data, error } = await supabase.rpc('get_base_calculo_details', { p_product_id: productId });
            
            if (error) throw error;
            setBaseCalculoEntries(data || []);
        } catch (error) {
            console.error("Error fetching Base de Cálculo entries:", error);
            toast({
                variant: "destructive",
                title: "Erro ao carregar Bases de Cálculo",
                description: error.message || 'Ocorreu um erro inesperado ao carregar as bases de cálculo.',
            });
            setBaseCalculoEntries([]);
        } finally {
            setLoading(false);
        }
    }, [productId, toast]);

    useEffect(() => {
        fetchBaseCalculoEntries();
    }, [fetchBaseCalculoEntries]);

    const handleAddEntry = () => {
        setSelectedEntry(null);
        setIsEditorOpen(true);
    };

    const handleEditEntry = (entry) => {
        setSelectedEntry(entry);
        setIsEditorOpen(true);
    };

    const handleDeleteEntry = async (entryId, cstCsosnCode, cfopCode) => {
        if (!window.confirm(`Tem certeza que deseja excluir a Base de Cálculo para CST/CSOSN ${cstCsosnCode} e CFOP ${cfopCode}?`)) {
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase
                .from('base_calculo')
                .delete()
                .eq('id', entryId);

            if (error) throw error;

            toast({ title: 'Base de Cálculo excluída!', description: `A entrada para CST/CSOSN ${cstCsosnCode} e CFOP ${cfopCode} foi removida com sucesso.` });
            if (user) {
                await logAction(user.id, 'base_calculo_delete', `Base de Cálculo (ID: ${entryId}) para produto (ID: ${productId}) excluída.`, activeCompanyCnpj, productId);
            }
            fetchBaseCalculoEntries();
        } catch (error) {
            console.error("Error deleting Base de Cálculo entry:", error);
            toast({ variant: 'destructive', title: 'Erro ao excluir', description: error.message || 'Ocorreu um erro inesperado ao excluir a base de cálculo.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="config-title flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-blue-600" />
                    Bases de Cálculo ICMS
                </h3>
                <Button onClick={handleAddEntry} className="save-button" size="sm" disabled={!productId || !isValidUuid(productId)}>
                    <PlusCircle className="w-4 h-4 mr-2" /> Adicionar Base
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-32"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
            ) : (
                <div className="data-table-container">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>CST/CSOSN</TableHead>
                                <TableHead>CFOP</TableHead>
                                <TableHead className="text-right">Alíquota ICMS (%)</TableHead>
                                <TableHead className="text-right">FECOP (%)</TableHead>
                                <TableHead className="text-right">Redução BC (%)</TableHead>
                                <TableHead className="text-right">Alíquota Aplicada (%)</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {baseCalculoEntries.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-slate-500 py-4">
                                        Nenhuma base de cálculo configurada para este produto.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                baseCalculoEntries.map((entry) => {
                                    const aliquotaAplicada = (entry.aliquota_icms_value + entry.aliquota_fecp_value - entry.aliquota_reducao_value).toFixed(2);
                                    return (
                                        <TableRow key={entry.id}>
                                            <TableCell className="font-medium">{entry.cst_csosn_code}</TableCell>
                                            <TableCell>{entry.cfop_code}</TableCell>
                                            <TableCell className="text-right">{entry.aliquota_icms_value.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">{entry.aliquota_fecp_value.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">{entry.aliquota_reducao_value.toFixed(2)}</TableCell>
                                            <TableCell className="text-right font-bold">{aliquotaAplicada}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEditEntry(entry)}>
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" 
                                                        onClick={() => handleDeleteEntry(entry.id, entry.cst_csosn_code, entry.cfop_code)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            <BaseCalculoEditorDialog
                isOpen={isEditorOpen}
                setIsOpen={setIsEditorOpen}
                productId={productId}
                activeCompanyCnpj={activeCompanyCnpj}
                initialData={selectedEntry}
                onSave={fetchBaseCalculoEntries}
            />
        </div>
    );
};

export default BaseCalculoList;