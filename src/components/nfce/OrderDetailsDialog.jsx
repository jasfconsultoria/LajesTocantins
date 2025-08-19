import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

const OrderDetailsDialog = ({ order, isOpen, onClose }) => {
    if (!order) return null;

    const formatPrice = (price) => {
        const numericValue = parseFloat(String(price).replace('R$ ', '').replace(',', '.'));
        return isNaN(numericValue) ? 0 : numericValue;
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Detalhes do Pedido #{order.id}</DialogTitle>
                    <DialogDescription>
                        Cliente: {order.customer} | Data: {new Date(order.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                    <h3 className="font-semibold mb-2 text-slate-800">Itens do Pedido</h3>
                    <ul className="space-y-2 max-h-64 overflow-y-auto pr-2">
                        {order.items.map((item, index) => {
                            const itemPrice = formatPrice(item.price);
                            const itemTotal = itemPrice * item.quantity;
                            return (
                                <li key={index} className="flex justify-between items-center p-3 bg-slate-100 rounded-md">
                                    <div>
                                        <span className="font-medium text-slate-900">{item.name}</span>
                                        <span className="text-sm text-slate-600 block">{item.quantity} x {formatCurrency(itemPrice)}</span>
                                    </div>
                                    <span className="font-medium text-slate-900">{formatCurrency(itemTotal)}</span>
                                </li>
                            );
                        })}
                    </ul>
                    <div className="flex justify-between font-bold text-lg mt-4 pt-4 border-t-2 border-slate-200">
                        <span className="text-slate-900">Total:</span>
                        <span className="gradient-text">{formatCurrency(formatPrice(order.total_value))}</span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default OrderDetailsDialog;