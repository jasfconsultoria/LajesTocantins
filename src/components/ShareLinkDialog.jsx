"use client";

import React from 'react';
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
import { Share2, Copy } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const ShareLinkDialog = ({ isOpen, setIsOpen, shareLink, budgetNumber }) => {
  const { toast } = useToast();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      toast({ title: 'Link Copiado!', description: 'O link de compartilhamento foi copiado para a área de transferência.' });
    } catch (err) {
      console.error('Failed to copy: ', err);
      toast({ variant: 'destructive', title: 'Erro ao Copiar', description: 'Não foi possível copiar o link. Tente manualmente.' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-600" /> Compartilhar Orçamento {budgetNumber ? `Nº ${budgetNumber}` : ''}
          </DialogTitle>
          <DialogDescription>
            Copie o link abaixo para compartilhar este orçamento com o cliente para visualização e assinatura.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="share-link" className="sr-only">Link de Compartilhamento</Label>
          <div className="flex space-x-2">
            <Input
              id="share-link"
              type="text"
              value={shareLink}
              readOnly
              className="flex-1"
            />
            <Button onClick={handleCopyLink} className="shrink-0">
              <Copy className="w-4 h-4 mr-2" /> Copiar
            </Button>
          </div>
          <p className="text-sm text-slate-500 mt-2">
            O cliente poderá visualizar e assinar o orçamento através deste link.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareLinkDialog;