import { useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { parseAmount } from '@/lib/format';
import type { Catalog, Expense, ExpenseType } from '@/lib/types';

interface ExpenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopId: string;
  currency: string;
  expense: Expense | null;
  types: ExpenseType[];
  catalogs: Catalog[];
  onSaved: () => void;
}

const selectClass =
  'flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';

export function ExpenseFormDialog({
  open,
  onOpenChange,
  shopId,
  currency,
  expense,
  types,
  catalogs,
  onSaved,
}: ExpenseFormDialogProps) {
  const [label, setLabel] = useState('');
  const [amountText, setAmountText] = useState('');
  const [spentOn, setSpentOn] = useState('');
  const [typeId, setTypeId] = useState('');
  const [catalogId, setCatalogId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setLabel(expense?.label ?? '');
      setAmountText(expense ? String(expense.amount) : '');
      setSpentOn(expense?.spent_on ?? format(new Date(), 'yyyy-MM-dd'));
      setTypeId(expense?.expense_type_id ?? '');
      setCatalogId(expense?.catalog_id ?? '');
      setError(null);
    }
    onOpenChange(next);
  };

  const amount = parseAmount(amountText);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (amount === null || amount <= 0) {
      setError('Saisissez un montant supérieur à zéro.');
      return;
    }
    if (!spentOn) {
      setError('Choisissez la date de la dépense.');
      return;
    }
    setSubmitting(true);
    setError(null);

    const values = {
      label: label.trim(),
      amount,
      spent_on: spentOn,
      expense_type_id: typeId || null,
      catalog_id: catalogId || null,
    };
    const request = expense
      ? supabase.from('expenses').update(values).eq('id', expense.id)
      : supabase.from('expenses').insert({ ...values, shop_id: shopId });

    const { error: saveError } = await request;
    setSubmitting(false);
    if (saveError) {
      setError("La dépense n'a pas pu être enregistrée. Réessayez.");
      return;
    }
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{expense ? 'Modifier la dépense' : 'Nouvelle dépense'}</DialogTitle>
          <DialogDescription>
            Imputez la charge à un catalogue précis, ou gardez-la en frais généraux.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="expense-amount">Montant ({currency})</Label>
              <Input
                id="expense-amount"
                inputMode="decimal"
                placeholder="0"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                className="h-11 tabular-nums"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-date">Date</Label>
              <Input
                id="expense-date"
                type="date"
                value={spentOn}
                max={format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => setSpentOn(e.target.value)}
                className="h-11"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-label">Libellé (facultatif)</Label>
            <Input
              id="expense-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex : Facture électricité de mars"
              className="h-11"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="expense-type">Type de dépense</Label>
              <select id="expense-type" value={typeId} onChange={(e) => setTypeId(e.target.value)} className={selectClass}>
                <option value="">Sans type</option>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-catalog">Imputation</Label>
              <select
                id="expense-catalog"
                value={catalogId}
                onChange={(e) => setCatalogId(e.target.value)}
                className={selectClass}
              >
                <option value="">Frais généraux</option>
                {catalogs.map((catalog) => (
                  <option key={catalog.id} value={catalog.id}>
                    {catalog.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting} className="bg-emerald-600 text-white hover:bg-emerald-700">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
