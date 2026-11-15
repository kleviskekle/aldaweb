import { useState, type FormEvent } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import type { ExpenseType } from '@/lib/types';

interface ExpenseTypesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopId: string;
  types: ExpenseType[];
  onChanged: () => void;
}

export function ExpenseTypesDialog({ open, onOpenChange, shopId, types, onChanged }: ExpenseTypesDialogProps) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addType = async (e: FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    setSubmitting(true);
    setError(null);
    const { error: insertError } = await supabase.from('expense_types').insert({ shop_id: shopId, name: clean });
    setSubmitting(false);
    if (insertError) {
      setError("Le type n'a pas pu être ajouté. Réessayez.");
      return;
    }
    setName('');
    onChanged();
  };

  const removeType = async (type: ExpenseType) => {
    setError(null);
    const { error: deleteError } = await supabase.from('expense_types').delete().eq('id', type.id);
    if (deleteError) {
      setError("Le type n'a pas pu être supprimé. Réessayez.");
      return;
    }
    onChanged();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Types de dépenses</DialogTitle>
          <DialogDescription>
            Créez les catégories utilisées par cette boutique, comme Loyer, Marchandises ou Charges.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={addType} className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nouveau type, ex : Électricité"
            className="h-11"
          />
          <Button type="submit" disabled={submitting || !name.trim()} className="h-11 bg-emerald-600 text-white hover:bg-emerald-700">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span className="ml-2">Ajouter</span>
          </Button>
        </form>

        {error && (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {types.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            Aucun type pour le moment.
          </p>
        ) : (
          <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
            {types.map((type) => (
              <li key={type.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-medium text-slate-800">{type.name}</span>
                <button
                  type="button"
                  aria-label={`Supprimer le type ${type.name}`}
                  onClick={() => void removeType(type)}
                  className="rounded p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
