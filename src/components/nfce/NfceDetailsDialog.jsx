import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const NfceDetailsDialog = ({ order, isOpen, onClose }) => {
    const { toast } = useToast();
    const [copied, setCopied] = React.useState(false);

    if (!order) return null;

    const formatChaveAcesso = (chave) => {
        if (!chave) return 'N/A';
        return chave.replace(/(\d{4})/g, '$1 ').trim();
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(order.chaveAcesso);
        setCopied(true);
        toast({
            title: 'Copiado!',
            description: 'A chave de acesso foi copiada para a área de transferência.',
        });
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Detalhes da NFC-e</DialogTitle>
                    <DialogDescription>
                        Informações da nota fiscal eletrônica para o pedido #{order.id}.
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4 space-y-4">
                    <div className="flex flex-col p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <label className="text-sm font-medium text-slate-600">Número da Nota</label>
                        <p className="text-lg font-semibold text-slate-900">{order.nfeNumber || 'N/A'}</p>
                    </div>
                    <div className="flex flex-col p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <label className="text-sm font-medium text-slate-600">Chave de Acesso</label>
                        <div className="flex items-center justify-between gap-4">
                             <p className="text-sm font-mono text-slate-900 break-all">{formatChaveAcesso(order.chaveAcesso)}</p>
                             <Button variant="ghost" size="icon" onClick={handleCopy} className="h-8 w-8 flex-shrink-0">
                                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                             </Button>
                        </div>
                    </div>
                     <div className="flex flex-col p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <label className="text-sm font-medium text-slate-600">Protocolo de Autorização</label>
                        <p className="text-sm font-mono text-slate-900">{order.protocol || 'N/A'}</p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default NfceDetailsDialog;