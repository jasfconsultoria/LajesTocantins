import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import QRCode from 'qrcode.react';

const DanfeView = ({ order, company }) => {
    if (!order) return null;

    const qrCodeValue = order.xml?.match(/<qrCode><!\[CDATA\[(.*?)]]><\/qrCode>/)?.[1] || '';
    const urlChave = order.xml?.match(/<urlChave>(.*?)<\/urlChave>/)?.[1] || '';
    const companyName = company?.razao_social || 'Empresa não configurada';
    const companyCnpj = company?.cnpj || '00.000.000/0001-00';
    const companyAddress = `${company?.endereco || ''}, ${company?.numero || ''}`;
    const companyCity = `${company?.cidade || ''} - ${company?.uf || ''}`;

    const items = order.items || [];

    return (
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>DANFE NFC-e</DialogTitle>
                <DialogDescription>
                    Representação visual da sua nota fiscal eletrônica.
                </DialogDescription>
            </DialogHeader>
            <div className="p-4 border rounded-lg bg-white text-black font-mono text-xs overflow-auto" id="danfe-to-print">
                <div className="text-center">
                    <p className="font-bold">{companyName}</p>
                    <p>CNPJ: {companyCnpj}</p>
                    <p>{companyAddress}</p>
                    <p>{companyCity}</p>
                    <hr className="border-dashed border-black my-2"/>
                    <p className="font-bold">DANFE NFC-e</p>
                    <p>Nota Fiscal de Consumidor Eletrônica</p>
                    <p>Nº {order.nfeNumber} Série {order.xml?.match(/<serie>(.*?)<\/serie>/)?.[1] || 'N/A'}</p>
                    <hr className="border-dashed border-black my-2"/>
                </div>
                <div>
                    <p># | COD | DESC | QTD | UN | VL UN | VL TOTAL</p>
                    {items.map((item, index) => (
                         <p key={item.id || index}>{index+1} | {item.product_id || item.id} | {item.name} | {item.quantity || item.qty} | UN | {parseFloat(item.price).toFixed(2)} | {(parseFloat(item.price) * (item.quantity || item.qty)).toFixed(2)}</p>
                    ))}
                    <hr className="border-dashed border-black my-2"/>
                    <div className="flex justify-between">
                        <p>QTD. TOTAL DE ITENS</p><p>{items.reduce((acc, item) => acc + (item.quantity || item.qty), 0)}</p>
                    </div>
                    <div className="flex justify-between font-bold">
                        <p>VALOR TOTAL</p><p>{order.total}</p>
                    </div>
                    <hr className="border-dashed border-black my-2"/>
                </div>
                <div className="text-center mt-2">
                    {qrCodeValue && (
                        <div className="flex justify-center my-4">
                            <QRCode value={qrCodeValue} size={128} />
                        </div>
                    )}
                    <p className="text-xs">Consulte pela Chave de Acesso em:</p>
                    <p className="text-xs break-all">{urlChave}</p>
                    <p className="font-bold mt-1">CHAVE DE ACESSO</p>
                    <p className="text-xs break-all">{order.chaveAcesso?.replace(/(\d{4})/g, '$1 ').trim()}</p>
                </div>
            </div>
            <DialogFooter>
                <Button onClick={() => window.print()}>Imprimir</Button>
            </DialogFooter>
        </DialogContent>
    );
};

export default DanfeView;