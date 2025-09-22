import React, { useState, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Upload, Loader2, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { v4 as uuidv4 } from 'uuid';

const LogoUploader = ({ label, description, currentLogoUrl, onUpload, onRemove }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [uploading, setUploading] = useState(false);
    const [logoUrl, setLogoUrl] = useState(currentLogoUrl);
    const fileInputRef = useRef(null);

    const handleUploadClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = async (event) => {
        try {
            setUploading(true);
            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('Você deve selecionar uma imagem para fazer upload.');
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${uuidv4()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('company_logos')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('company_logos')
                .getPublicUrl(filePath);

            setLogoUrl(publicUrl);
            onUpload(publicUrl);
            toast({ title: 'Logo enviado com sucesso!' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro no upload', description: error.message });
        } finally {
            setUploading(false);
        }
    };
    
    const handleRemoveLogo = () => {
        setLogoUrl(null);
        onRemove();
    }

    return (
        <div className="config-card p-4">
            <div className="flex flex-col lg:flex-row gap-4">
                <div className={`w-full lg:w-48 h-32 rounded-lg flex items-center justify-center ${logoUrl ? 'bg-slate-100 p-2' : 'bg-slate-200'}`}>
                    {uploading ? (
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    ) : logoUrl ? (
                        <img src={logoUrl} alt="Preview do logo" className="max-w-full max-h-full object-contain" />
                    ) : (
                        <ImageIcon className="w-10 h-10 text-slate-400" />
                    )}
                </div>
                <div className="flex-1">
                    <h4 className="font-semibold text-slate-800">{label}</h4>
                    <p className="text-sm text-slate-500 mt-1">{description}</p>
                    <div className="flex items-center gap-2 mt-3">
                        <Button variant="outline" onClick={handleUploadClick} disabled={uploading}>
                            <Upload className="w-4 h-4 mr-2" />
                            {logoUrl ? 'Trocar Logo' : 'Enviar Logo'}
                        </Button>
                        {logoUrl && (
                             <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={handleRemoveLogo}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/png, image/jpeg, image/svg+xml"
                        onChange={handleFileChange}
                        disabled={uploading}
                    />
                </div>
            </div>
        </div>
    );
};

export default LogoUploader;