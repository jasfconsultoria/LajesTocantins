import React, { useState, useEffect, useCallback } from 'react';
import { Upload, FileCheck2, Save, Loader2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { v4 as uuidv4 } from 'uuid';
import { logAction } from '@/lib/log'; // Import logAction

const CertificateSettings = ({ companyId }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    
    const [certificateFile, setCertificateFile] = useState(null);
    const [password, setPassword] = useState('');
    const [isConfigured, setIsConfigured] = useState(false);
    const [fileName, setFileName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const fetchCertificateData = useCallback(async () => {
        if (!companyId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);

        const { data, error } = await supabase
            .from('digital_certificates')
            .select('file_name, password_encrypted')
            .eq('emitente_id', companyId)
            .limit(1)
            .single();

        if (data) {
            setFileName(data.file_name);
            setPassword(data.password_encrypted || '');
            setIsConfigured(true);
        } else if (error && error.code !== 'PGRST116') {
             toast({
                variant: 'destructive',
                title: 'Erro ao buscar certificado',
                description: 'Não foi possível carregar os dados do certificado digital.',
            });
        }
        setIsLoading(false);
    }, [companyId, toast]);

    useEffect(() => {
        fetchCertificateData();
    }, [fetchCertificateData]);

    const handleFileChange = (event) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            if (file.name.endsWith('.pfx')) {
                setCertificateFile(file);
                setFileName(file.name);
                setIsConfigured(true);
            } else {
                toast({
                    variant: "destructive",
                    title: "Formato de arquivo inválido!",
                    description: "Por favor, selecione um arquivo com a extensão .pfx.",
                });
            }
        }
    };

    const handleUploadClick = () => {
        document.getElementById('certificate-input').click();
    };

    const handleSaveCertificate = async () => {
        if (!companyId) {
            toast({ variant: "destructive", title: "Erro", description: "Nenhuma empresa selecionada para salvar o certificado." });
            return;
        }
        if (!fileName || !password) {
            toast({ variant: "destructive", title: "Campos obrigatórios", description: "É necessário um arquivo e uma senha." });
            return;
        }

        setIsSaving(true);
        
        let newStoragePath = null;
        if (certificateFile) {
            const filePath = `company_certificates/${companyId}/${uuidv4()}.pfx`; 
            const { error: uploadError } = await supabase.storage
                .from('certificates')
                .upload(filePath, certificateFile, { upsert: true });

            if (uploadError) {
                toast({ variant: 'destructive', title: "Erro no Upload", description: uploadError.message });
                setIsSaving(false);
                return;
            }
            newStoragePath = filePath;
        }

        const { data: existingData, error: fetchError } = await supabase
            .from('digital_certificates')
            .select('id, storage_path')
            .eq('emitente_id', companyId)
            .limit(1)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            toast({ variant: 'destructive', title: "Erro ao verificar dados existentes", description: fetchError.message });
            setIsSaving(false);
            return;
        }

        const upsertData = {
            emitente_id: companyId,
            file_name: fileName,
            password_encrypted: password, 
            storage_path: newStoragePath || (existingData ? existingData.storage_path : undefined),
            updated_at: new Date().toISOString(),
        };

        if (existingData) {
            upsertData.id = existingData.id;
        } else {
            upsertData.created_at = new Date().toISOString();
        }
        
        if (!upsertData.storage_path) {
            toast({ variant: 'destructive', title: "Arquivo não encontrado", description: "É necessário fazer o upload de um certificado antes de salvar." });
            setIsSaving(false);
            return;
        }
        
        const { error: dbError } = await supabase
            .from('digital_certificates')
            .upsert(upsertData, { onConflict: 'emitente_id' });

        if (dbError) {
            toast({ variant: 'destructive', title: "Erro ao Salvar", description: dbError.message });
        } else {
            setIsConfigured(true);
            setCertificateFile(null);
            toast({ title: "Certificado Salvo!", description: "As configurações foram salvas com sucesso." });
            
            if (user) {
                const actionType = existingData ? 'certificate_update' : 'certificate_upload';
                const description = `Certificado digital para empresa (ID: ${companyId}) ${existingData ? 'atualizado' : 'enviado'}.`;
                await logAction(user.id, actionType, description, companyId);
            }

            await fetchCertificateData();
        }
        
        setIsSaving(false);
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold gradient-text">Certificado Digital A1</h1>
                <p className="text-sm text-slate-600 mt-1">Faça o upload e gerencie seu certificado digital para emissão de notas.</p>
            </div>

            <div className="config-card max-w-3xl mx-auto">
                <div className="config-header">
                    <div>
                        <h3 className="config-title">Upload do Certificado (.pfx)</h3>
                        <p className="config-description">O certificado é armazenado de forma segura e usado apenas para assinar as NFC-e.</p>
                    </div>
                     <div className="integration-status">
                        <div className={`status-dot ${isConfigured ? 'status-connected' : 'status-disconnected'}`}></div>
                        <span className="text-sm text-slate-600">{isConfigured ? 'Configurado' : 'Não Configurado'}</span>
                    </div>
                </div>

                <div 
                    className={`certificate-upload ${fileName ? 'has-file' : ''} p-5`}
                    onClick={handleUploadClick}
                >
                    <input type="file" id="certificate-input" className="hidden" accept=".pfx" onChange={handleFileChange} />
                    {fileName ? (
                        <>
                            <FileCheck2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                            <h4 className="font-semibold text-base text-slate-900 mb-1">Arquivo Carregado</h4>
                            <p className="text-sm text-slate-700 font-mono bg-green-100 px-2 py-0.5 rounded-md inline-block">{fileName}</p>
                            <p className="text-xs text-slate-600 mt-2">Clique aqui para selecionar outro arquivo.</p>
                        </>
                    ) : (
                        <>
                            <Upload className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                            <h4 className="font-semibold text-base text-slate-900 mb-1">Clique para Fazer Upload</h4>
                            <p className="text-xs text-slate-600">Arraste e solte ou clique para selecionar o arquivo .pfx</p>
                        </>
                    )}
                </div>

                <div className="form-group mt-6">
                    <label className="form-label" htmlFor="cert-password">
                        <KeyRound className="w-4 h-4 mr-2 inline-block" />
                        Senha do Certificado *
                    </label>
                    <input 
                        id="cert-password"
                        type="password" 
                        className="form-input" 
                        placeholder="Digite a senha do seu arquivo .pfx"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                <div className="mt-6 flex justify-end">
                    <Button onClick={handleSaveCertificate} className="save-button" disabled={isSaving || !isConfigured || !password}>
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Salvar Certificado
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default CertificateSettings;