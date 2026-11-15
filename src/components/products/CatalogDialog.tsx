import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import type { Catalog } from '@/lib/types';

interface CatalogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopId: string;
  catalog: Catalog | null;
  nextPosition: number;
  onSaved: (catalogId: string) => void;
}

export function CatalogDialog({ open, onOpenChange, shopId, catalog, nextPosition, onSaved }: CatalogDialogProps) {
  const [name, setName] = useState(catalog?.name ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setName(catalog?.name ?? '');
      setError(null);
    }
    onOpenChange(next);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    setSubmitting(true);
    setError(null);

    const request = catalog
      ? supabase.from('catalogs').update({ name: clean }).eq('id', catalog.id).select('id').single()
      : supabase
          .from('catalogs')
          .insert({ shop_id: shopId, name: clean, position: nextPosition })
          .select('id')
          .single();

    const { data, error: saveError } = await request;
    setSubmitting(false);
    if (saveError || !data) {
      setError("Le catalogue n'a pas pu être enregistré. Réessayez.");
      return;
    }
    onSaved(data.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{catalog ? 'Renommer le catalogue' : 'Nouveau catalogue'}</DialogTitle>
          <DialogDescription>Un catalogue regroupe des produits, par exemple « Vêtements » ou « Prestations ».</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="catalog-name">Nom du catalogue</Label>
            <Input
              id="catalog-name"
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Accessoires"
              className="h-11"
            />
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
            <Button type="submit" disabled={submitting || !name.trim()} className="bg-emerald-600 text-white hover:bg-emerald-700">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
