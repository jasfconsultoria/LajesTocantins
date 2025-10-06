"use client";

import React, { useRef, useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, PencilLine, Eraser, Save } from 'lucide-react'; // Changed SignatureIcon to PencilLine
import SignatureCanvas from 'react-signature-canvas';
import { useToast } from '@/components/ui/use-toast';

const SignatureDialog = ({ isOpen, setIsOpen, onSaveSignature, budgetNumber, isFaturado }) => {
  const sigCanvas = useRef({});
  const { toast } = useToast();
  const [isEmpty, setIsEmpty] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Clear canvas when dialog opens
      sigCanvas.current.clear();
      setIsEmpty(true);
    }
  }, [isOpen]);

  const clearSignature = () => {
    sigCanvas.current.clear();
    setIsEmpty(true);
  };

  const saveSignature = async () => {
    if (sigCanvas.current.isEmpty()) {
      toast({
        variant: 'destructive',
        title: 'Assinatura vazia',
        description: 'Por favor, assine no campo antes de salvar.',
      });
      return;
    }

    setSaving(true);
    try {
      const dataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
      await onSaveSignature(dataUrl);
      setIsOpen(false);
      toast({ title: 'Assinatura salva!', description: 'O orçamento foi aprovado e assinado.' });
    } catch (error) {
      console.error("Error saving signature:", error);
      toast({ variant: 'destructive', title: 'Erro ao salvar assinatura', description: error.message || 'Ocorreu um erro inesperado.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCanvasChange = () => {
    setIsEmpty(sigCanvas.current.isEmpty());
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PencilLine className="w-5 h-5 text-blue-600" /> Assinar Orçamento {budgetNumber ? `#${budgetNumber}` : ''}
          </DialogTitle>
          <DialogDescription>
            Por favor, assine digitalmente para aprovar este orçamento.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="border border-slate-300 rounded-md overflow-hidden bg-slate-50">
            <SignatureCanvas
              ref={sigCanvas}
              canvasProps={{ width: 450, height: 200, className: 'signature-canvas bg-white' }}
              penColor="black"
              minWidth={1}
              maxWidth={2}
              onEnd={handleCanvasChange}
              onBegin={handleCanvasChange}
            />
          </div>
          <p className="text-center text-sm text-slate-500 mt-2">Assine aqui</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={clearSignature} disabled={isEmpty || saving || isFaturado}>
            <Eraser className="mr-2 h-4 w-4" /> Limpar
          </Button>
          <Button onClick={saveSignature} disabled={isEmpty || saving || isFaturado}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" /> Salvar Assinatura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SignatureDialog;