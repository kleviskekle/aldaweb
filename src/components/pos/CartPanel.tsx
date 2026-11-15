import { Loader2, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatMoney, formatNumber } from '@/lib/format';
import type { Product } from '@/lib/types';

export interface CartLine {
  product: Product;
  catalogName: string;
  quantity: number;
}

interface CartPanelProps {
  lines: CartLine[];
  currency: string;
  total: number;
  itemCount: number;
  submitting: boolean;
  onChangeQuantity: (productId: string, delta: number) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
  onValidate: () => void;
}

export function CartPanel({
  lines,
  currency,
  total,
  itemCount,
  submitting,
  onChangeQuantity,
  onRemove,
  onClear,
  onValidate,
}: CartPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Panier</h2>
          <p className="text-sm text-slate-500">
            {itemCount} article{itemCount > 1 ? 's' : ''}
          </p>
        </div>
        {lines.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-sm font-medium text-slate-500 transition-colors hover:text-red-600"
          >
            Vider
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2">
        {lines.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <ShoppingBag className="h-5 w-5 text-slate-500" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-800">Le panier est vide</p>
            <p className="mt-1 max-w-[220px] text-sm text-slate-500">Touchez un produit pour l'ajouter.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {lines.map((line) => (
              <li key={line.product.id} className="flex items-center gap-3 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{line.product.name}</p>
                  <p className="text-xs tabular-nums text-slate-500">
                    {formatMoney(line.product.price, currency)} × {line.quantity}
                  </p>
                </div>
                <div className="flex items-center rounded-lg border border-slate-200 bg-white">
                  <button
                    type="button"
                    aria-label={`Diminuer ${line.product.name}`}
                    onClick={() => onChangeQuantity(line.product.id, -1)}
                    disabled={line.quantity <= 1}
                    className="flex h-9 w-9 items-center justify-center rounded-l-lg text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold tabular-nums text-slate-900">{line.quantity}</span>
                  <button
                    type="button"
                    aria-label={`Augmenter ${line.product.name}`}
                    onClick={() => onChangeQuantity(line.product.id, 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-r-lg text-slate-600 transition-colors hover:bg-slate-100"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="w-24 text-right">
                  <p className="text-sm font-semibold tabular-nums text-slate-900">
                    {formatMoney(line.product.price * line.quantity, currency)}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Retirer ${line.product.name}`}
                  onClick={() => onRemove(line.product.id)}
                  className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-4 border-t border-slate-200 bg-slate-50/60 px-5 py-5">
        <div className="flex items-end justify-between">
          <span className="text-sm font-medium text-slate-600">Total net</span>
          <span className="text-3xl font-semibold tracking-tight tabular-nums text-slate-900">
            {formatNumber(total)} <span className="text-base font-medium text-slate-500">{currency}</span>
          </span>
        </div>
        <Button
          type="button"
          onClick={onValidate}
          disabled={lines.length === 0 || submitting}
          className="h-12 w-full bg-emerald-600 text-base font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-[0.99] disabled:bg-slate-300"
        >
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Valider la vente
        </Button>
      </div>
    </div>
  );
}
