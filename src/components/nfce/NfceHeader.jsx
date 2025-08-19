import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, FileText, Loader, CheckCircle, XCircle } from 'lucide-react';

const NfceHeader = ({
  selectedOrdersCount,
  onSync,
  onBatchGenerate,
  isSyncing,
  isBatchProcessing,
  isWooConnected
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold gradient-text">Pedidos para Emissão</h1>
          {isWooConnected ? (
              <div className="flex items-center text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                  Conectado
              </div>
          ) : (
              <div className="flex items-center text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">
                  <XCircle className="w-3.5 h-3.5 mr-1.5" />
                  Desconectado
              </div>
          )}
        </div>
        <p className="text-slate-600 mt-1">
          Selecione um ou mais pedidos para gerar as NFC-e correspondentes.
        </p>
      </div>
      {selectedOrdersCount > 0 ? (
        <Button
          onClick={onBatchGenerate}
          disabled={isBatchProcessing}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg text-white"
        >
          {isBatchProcessing ? (
            <Loader className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <FileText className="w-4 h-4 mr-2" />
          )}
          {isBatchProcessing
            ? `Gerando ${selectedOrdersCount}...`
            : `Gerar ${selectedOrdersCount} NFC-e em Lote`}
        </Button>
      ) : (
        <Button onClick={onSync} variant="outline" disabled={isSyncing}>
          {isSyncing ? (
            <Loader className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          {isSyncing ? 'Sincronizando...' : 'Sincronizar Pedidos'}
        </Button>
      )}
    </div>
  );
};

export default NfceHeader;