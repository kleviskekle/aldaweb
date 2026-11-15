import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { formatMoney, parseAmount } from '@/lib/format';
import type { Product } from '@/lib/types';

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalogId: string;
  currency: string;
  product: Product | null;
  onSaved: () => void;
}

export function ProductDialog({ open, onOpenChange, catalogId, currency, product, onSaved }: ProductDialogProps) {
  const [name, setName] = useState('');
  const [costText, setCostText] = useState('');
  const [priceText, setPriceText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setName(product?.name ?? '');
      setCostText(product ? String(product.cost_price) : '');
      setPriceText(product ? String(product.price) : '');
      setError(null);
    }
    onOpenChange(next);
  };

  const cost = parseAmount(costText);
  const price = parseAmount(priceText);
  const margin = cost !== null && price !== null ? price - cost : null;
  const marginPercent = margin !== null && price ? (margin / price) * 100 : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || cost === null || price === null) {
      setError('Renseignez un nom et des montants valides (chiffres uniquement).');
      return;
    }
    setSubmitting(true);
    setError(null);

    const values = { name: name.trim(), cost_price: cost, price };
    const request = product
      ? supabase.from('products').update(values).eq('id', product.id)
      : supabase.from('products').insert({ ...values, catalog_id: catalogId });

    const { error: saveError } = await request;
    setSubmitting(false);
    if (saveError) {
      setError("Le produit n'a pas pu être enregistré. Réessayez.");
      return;
    }
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{product ? 'Modifier le produit' : 'Nouveau produit'}</DialogTitle>
          <DialogDescription>Saisissez les montants librement. La marge se calcule automatiquement.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="product-name">Nom du produit</Label>
            <Input
              id="product-name"
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Coupe femme"
              className="h-11"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="product-cost">Prix d'achat ({currency})</Label>
              <Input
                id="product-cost"
                inputMode="decimal"
                placeholder="0"
                value={costText}
                onChange={(e) => setCostText(e.target.value)}
                className="h-11 tabular-nums"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-price">Prix de vente ({currency})</Label>
              <Input
                id="product-price"
                inputMode="decimal"
                placeholder="0"
                value={priceText}
                onChange={(e) => setPriceText(e.target.value)}
                className="h-11 tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Marge brute unitaire</p>
              <p className={`mt-1 text-lg font-semibold tabular-nums ${margin !== null && margin < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                {margin !== null ? formatMoney(margin, currency) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Taux de marge</p>
              <p className={`mt-1 text-lg font-semibold tabular-nums ${marginPercent !== null && marginPercent < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                {marginPercent !== null ? `${marginPercent.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %` : '—'}
              </p>
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
