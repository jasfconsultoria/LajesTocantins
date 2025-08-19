import React from 'react';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Loader, Eye, Download, Printer, Trash2, AlertTriangle, FileText, ClipboardList } from 'lucide-react';
import DanfeView from './DanfeView';

const NfceActions = ({ order, isProcessing, onView, onGenerate, onDownload, onCancel, onViewNfceDetails }) => {
  if (isProcessing) {
    return (
      <div className="flex items-center justify-center text-blue-600">
        <Loader className="w-4 h-4 mr-2 animate-spin" />
        <span>Gerando...</span>
      </div>
    );
  }

  const showDownloadAndDetails = order.nfceStatus === 'authorized' || (order.nfceStatus === 'rejected' && order.xml);

  return (
    <div className="flex justify-center items-center space-x-1">
      <Button variant="ghost" size="icon" className="h-8 w-8" title="Visualizar Detalhes do Pedido" onClick={() => onView(order)}>
        <Eye className="w-4 h-4" />
      </Button>

      {['not_issued', 'rejected', 'pending'].includes(order.nfceStatus) && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-blue-600 hover:text-blue-700"
          title={order.nfceStatus === 'rejected' ? 'Tentar Gerar Novamente' : 'Gerar NFC-e'}
          onClick={() => onGenerate(order.id)}
        >
          <FileText className="w-4 h-4" />
        </Button>
      )}
      
      {showDownloadAndDetails && (
        <>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Detalhes da Nota" onClick={() => onViewNfceDetails(order)}>
            <ClipboardList className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Baixar XML" onClick={() => onDownload(order)}>
            <Download className="w-4 h-4" />
          </Button>
        </>
      )}

      {order.nfceStatus === 'authorized' && (
        <>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Imprimir DANFE"><Printer className="w-4 h-4" /></Button>
            </DialogTrigger>
            <DanfeView order={order}/>
          </Dialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Cancelar NFC-e"><Trash2 className="w-4 h-4 text-red-500" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  <AlertTriangle className="inline-block mr-2 text-yellow-500" />
                  Tem certeza?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação irá simular o cancelamento da NFC-e para o pedido #{order.id}. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction onClick={() => onCancel(order.id)} className="bg-red-600 hover:bg-red-700">Sim, cancelar nota</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
};

export default NfceActions;