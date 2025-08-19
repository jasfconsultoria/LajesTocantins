import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2, CheckCircle, XCircle, FileText, Fingerprint, Send, Server, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

const progressSteps = [
    { key: 'init', text: 'Preparando Dados', icon: FileText },
    { key: 'xml', text: 'Gerando XML', icon: FileText },
    { key: 'signing', text: 'Assinando XML', icon: Fingerprint },
    { key: 'transmitting', text: 'Transmitindo para SEFAZ', icon: Send },
    { key: 'receiving', text: 'Aguardando Resposta', icon: Server },
    { key: 'done', text: 'Concluído', icon: ShieldCheck },
];

const ProgressStep = ({ text, icon: Icon, status }) => {
    return (
        <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center
                ${status === 'active' && 'bg-blue-100 text-blue-600 animate-pulse'}
                ${status === 'completed' && 'bg-green-100 text-green-600'}
                ${status === 'pending' && 'bg-slate-100 text-slate-400'}
                ${status === 'error' && 'bg-red-100 text-red-600'}
            `}>
                {status === 'active' && <Loader2 className="w-5 h-5 animate-spin" />}
                {status === 'completed' && <CheckCircle className="w-5 h-5" />}
                {status === 'pending' && <Icon className="w-5 h-5" />}
                {status === 'error' && <XCircle className="w-5 h-5" />}
            </div>
            <span className={`font-medium ${status === 'pending' ? 'text-slate-500' : 'text-slate-800'}`}>{text}</span>
        </div>
    );
}

const EmissionProgressModal = ({ order, isOpen, onClose }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [emissionStatus, setEmissionStatus] = useState('processing');
    const [finalMessage, setFinalMessage] = useState('');
    const { toast } = useToast();
    const { session } = useAuth();

    const handleClose = () => {
        if (order?.isBatch && order?.onBatchComplete) {
            order.onBatchComplete();
        }
        onClose();
    };

    useEffect(() => {
        if (!isOpen || !order || !session) return;

        const performEmission = async () => {
            setCurrentStep(0);
            setEmissionStatus('processing');
            setFinalMessage('');

            try {
                const advanceStep = (step) => {
                    setCurrentStep(step);
                    return new Promise(resolve => setTimeout(resolve, 300));
                };

                await advanceStep(1);
                await advanceStep(2);
                await advanceStep(3);
                await advanceStep(4);

                const { data, error } = await supabase.functions.invoke('generate-nfce', {
                    body: JSON.stringify({ order_id: order.id }),
                    headers: { Authorization: `Bearer ${session.access_token}` },
                });
                
                if (error) {
                    const errorBody = error.context?.body;
                    if(typeof errorBody === 'string' && errorBody.includes("Function not found")){
                         throw new Error("A função de emissão (generate-nfce) não foi encontrada no servidor. A implantação pode ter falhado.");
                    }
                    const errorMessage = errorBody?.error || error.message || "Erro desconhecido na função.";
                    throw new Error(errorMessage);
                }
                
                if (data.status === 'rejected' || data.error) {
                     throw new Error(data.message || data.error || 'NFC-e foi rejeitada pela SEFAZ.');
                }
                
                await advanceStep(5);

                setEmissionStatus('success');
                setFinalMessage(data.message || 'NFC-e autorizada com sucesso!');
                if (!order.isBatch) {
                  toast({ title: '✅ Sucesso!', description: data.message });
                }

            } catch (error) {
                setEmissionStatus('error');
                const errorMessage = error.message || 'Ocorreu um erro desconhecido durante a emissão.';
                setFinalMessage(errorMessage);
                if (!order.isBatch) {
                  toast({ variant: 'destructive', title: 'Falha na Emissão', description: errorMessage });
                }
                setCurrentStep(5);
            }
        };

        performEmission();

    }, [isOpen, order, toast, session]);

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Emissão de NFC-e em Andamento</DialogTitle>
                    <DialogDescription>
                        Pedido #{order?.id}. Por favor, aguarde a conclusão do processo.
                    </DialogDescription>
                </DialogHeader>
                <div className="my-6">
                    <div className="space-y-4">
                        {progressSteps.map((step, index) => (
                             <ProgressStep
                                key={step.key}
                                text={step.text}
                                icon={step.icon}
                                status={
                                    index < currentStep ? 'completed' :
                                    index === currentStep && emissionStatus === 'processing' ? 'active' :
                                    (emissionStatus === 'error' && index <= 4) ? 'error' :
                                    (emissionStatus === 'success') ? 'completed' :
                                    'pending'
                                }
                            />
                        ))}
                    </div>

                    {emissionStatus !== 'processing' && (
                        <div className={`mt-6 p-4 rounded-lg text-center ${emissionStatus === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
                            <h4 className={`font-bold ${emissionStatus === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                                {emissionStatus === 'success' ? 'Emissão Concluída!' : 'Falha na Emissão'}
                            </h4>
                            <p className="text-sm mt-1">{finalMessage}</p>
                        </div>
                    )}
                </div>
                 {emissionStatus !== 'processing' && (
                    <div className="flex justify-end">
                        <Button onClick={handleClose}>Fechar</Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default EmissionProgressModal;