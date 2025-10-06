"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
import { Loader2, Percent, DollarSign, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const DiscountDialog = ({ isOpen, setIsOpen, totalOrderValue, onApplyDiscount, isFaturado }) => {
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [calculatedLiquidValue, setCalculatedLiquidValue] = useState(totalOrderValue);
  const [loading, setLoading] = useState(false);

  // Reset state when dialog opens or totalOrderValue changes
  useEffect(() => {
    if (isOpen) {
      setDiscountAmount('');
      setDiscountPercentage('');
      setCalculatedLiquidValue(totalOrderValue);
    }
  }, [isOpen, totalOrderValue]);

  const parseNumericInput = (value) => {
    const cleaned = value.replace(',', '.').replace(/[^\d.]/g, '');
    return cleaned === '' ? null : parseFloat(cleaned);
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    setDiscountAmount(value);
    const amount = parseNumericInput(value);

    if (amount !== null && !isNaN(amount)) {
      const newLiquid = totalOrderValue - amount;
      setCalculatedLiquidValue(newLiquid);
      if (totalOrderValue > 0) {
        const newPercentage = (amount / totalOrderValue) * 100;
        setDiscountPercentage(newPercentage.toFixed(4).replace('.', ','));
      } else {
        setDiscountPercentage('0,0000');
      }
    } else {
      setDiscountPercentage('');
      setCalculatedLiquidValue(totalOrderValue);
    }
  };

  const handlePercentageChange = (e) => {
    const value = e.target.value;
    setDiscountPercentage(value);
    const percentage = parseNumericInput(value);

    if (percentage !== null && !isNaN(percentage)) {
      const amount = (totalOrderValue * percentage) / 100;
      const newLiquid = totalOrderValue - amount;
      setDiscountAmount(amount.toFixed(2).replace('.', ','));
      setCalculatedLiquidValue(newLiquid);
    } else {
      setDiscountAmount('');
      setCalculatedLiquidValue(totalOrderValue);
    }
  };

  const handleApply = async () => {
    setLoading(true);
    const finalDiscountAmount = parseNumericInput(discountAmount) || 0;
    const finalDiscountPercentage = parseNumericInput(discountPercentage) || 0;

    await onApplyDiscount(finalDiscountAmount, finalDiscountPercentage);
    setLoading(false);
    setIsOpen(false);
  };

  const handleClearDiscount = () => {
    setDiscountAmount('');
    setDiscountPercentage('');
    setCalculatedLiquidValue(totalOrderValue);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-600" /> Aplicar Desconto
          </DialogTitle>
          <DialogDescription>
            Insira o desconto em valor (R$) ou em porcentagem (%).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="form-group">
            <Label htmlFor="totalVenda" className="form-label">Total Venda R$</Label>
            <Input
              id="totalVenda"
              type="text"
              value={formatCurrency(totalOrderValue)}
              readOnly
              disabled
              className="text-right font-semibold"
            />
          </div>
          <div className="form-group relative">
            <Label htmlFor="discountAmount" className="form-label">Desconto R$</Label>
            <Input
              id="discountAmount"
              type="text"
              value={discountAmount}
              onChange={handleAmountChange}
              placeholder="0,00"
              className="text-right pr-8"
              disabled={isFaturado || loading}
            />
            {discountAmount && !isFaturado && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 flex items-center justify-center text-slate-500 hover:text-slate-700 rounded-full"
                    onClick={handleClearDiscount}
                    tabIndex={-1}
                >
                    <X className="w-3 h-3" />
                </Button>
            )}
          </div>
          <div className="form-group relative">
            <Label htmlFor="discountPercentage" className="form-label">Desconto %</Label>
            <Input
              id="discountPercentage"
              type="text"
              value={discountPercentage}
              onChange={handlePercentageChange}
              placeholder="0,0000"
              className="text-right pr-8"
              disabled={isFaturado || loading}
            />
            {discountPercentage && !isFaturado && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 flex items-center justify-center text-slate-500 hover:text-slate-700 rounded-full"
                    onClick={handleClearDiscount}
                    tabIndex={-1}
                >
                    <X className="w-3 h-3" />
                </Button>
            )}
          </div>
          <div className="form-group">
            <Label htmlFor="liquidValue" className="form-label">Líquido R$</Label>
            <Input
              id="liquidValue"
              type="text"
              value={formatCurrency(calculatedLiquidValue)}
              readOnly
              disabled
              className="text-right font-bold"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleApply} disabled={isFaturado || loading || (!discountAmount && !discountPercentage)} className="save-button">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DiscountDialog;