import { useEffect, useState } from 'react';
import { Package, Pencil, Plus, Trash2 } from 'lucide-react';
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
} from '@/components/ui/alert-dialog';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useShopCatalogs, type CatalogWithProducts } from '@/hooks/use-shop-catalogs';
import { supabase } from '@/lib/supabase';
import { formatMoney, formatPercent } from '@/lib/format';
import type { Catalog, Product } from '@/lib/types';
import { CatalogDialog } from './CatalogDialog';
import { ProductDialog } from './ProductDialog';
import { cn } from '@/lib/utils';

type DeleteTarget =
  | { kind: 'catalog'; catalog: CatalogWithProducts }
  | { kind: 'product'; product: Product }
  | null;

export function ProductsPage() {
  const { currentShop, workspace } = useWorkspace();
  const currency = workspace?.company.currency ?? 'FCFA';
  const shopId = currentShop?.id ?? null;
  const { catalogs, loading, error, reload } = useShopCatalogs(shopId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [catalogDialog, setCatalogDialog] = useState<{ open: boolean; catalog: Catalog | null }>({
    open: false,
    catalog: null,
  });
  const [productDialog, setProductDialog] = useState<{ open: boolean; product: Product | null }>({
    open: false,
    product: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (catalogs.length === 0) {
      setSelectedId(null);
    } else if (!catalogs.some((c) => c.id === selectedId)) {
      setSelectedId(catalogs[0].id);
    }
  }, [catalogs, selectedId]);

  const selected = catalogs.find((c) => c.id === selectedId) ?? null;

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    const { error: removeError } =
      deleteTarget.kind === 'catalog'
        ? await supabase.from('catalogs').delete().eq('id', deleteTarget.catalog.id)
        : await supabase.from('products').delete().eq('id', deleteTarget.product.id);
    setDeleting(false);
    if (removeError) {
      setDeleteError("La suppression n'a pas abouti. Réessayez.");
      return;
    }
    setDeleteTarget(null);
    await reload();
  };

  if (!shopId) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Catalogues et produits</h2>
          <p className="mt-1 text-sm text-slate-600">Gérez les produits de {currentShop?.name}.</p>
        </div>
        <Button
          onClick={() => setCatalogDialog({ open: true, catalog: null })}
          className="h-10 bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <Plus className="mr-2 h-4 w-4" /> Nouveau catalogue
        </Button>
      </div>

      {loading && catalogs.length === 0 ? (
        <div className="h-64 animate-pulse rounded-xl bg-slate-200/60" />
      ) : error ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error}
        </div>
      ) : catalogs.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <Package className="h-6 w-6 text-emerald-600" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900">Aucun catalogue</h3>
          <p className="mt-1 max-w-sm text-sm text-slate-600">Créez votre premier catalogue pour commencer à ajouter des produits.</p>
          <Button
            onClick={() => setCatalogDialog({ open: true, catalog: null })}
            className="mt-6 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Plus className="mr-2 h-4 w-4" /> Créer un catalogue
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {catalogs.map((catalog) => (
              <button
                key={catalog.id}
                type="button"
                onClick={() => setSelectedId(catalog.id)}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                  catalog.id === selectedId
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                )}
              >
                {catalog.name}
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs tabular-nums',
                    catalog.id === selectedId ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {catalog.products.length}
                </span>
              </button>
            ))}
          </div>

          {selected && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{selected.name}</h3>
                  <p className="text-sm text-slate-500">
                    {selected.products.length} produit{selected.products.length > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCatalogDialog({ open: true, catalog: selected })}
                  >
                    <Pencil className="mr-2 h-3.5 w-3.5" /> Renommer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteTarget({ kind: 'catalog', catalog: selected })}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Supprimer
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setProductDialog({ open: true, product: null })}
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <Plus className="mr-2 h-3.5 w-3.5" /> Produit
                  </Button>
                </div>
              </div>

              {selected.products.length === 0 ? (
                <p className="px-5 py-12 text-center text-sm text-slate-500">
                  Ce catalogue ne contient pas encore de produit.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Produit</th>
                        <th className="px-5 py-3 text-right">Achat</th>
                        <th className="px-5 py-3 text-right">Vente</th>
                        <th className="hidden px-5 py-3 text-right md:table-cell">Marge brute</th>
                        <th className="hidden px-5 py-3 text-right md:table-cell">Taux</th>
                        <th className="px-5 py-3 text-right">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selected.products.map((product) => {
                        const margin = product.price - product.cost_price;
                        const rate = product.price > 0 ? (margin / product.price) * 100 : 0;
                        return (
                          <tr key={product.id} className="transition-colors hover:bg-slate-50">
                            <td className="px-5 py-3.5 font-medium text-slate-900">{product.name}</td>
                            <td className="whitespace-nowrap px-5 py-3.5 text-right tabular-nums text-slate-600">
                              {formatMoney(product.cost_price, currency)}
                            </td>
                            <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium tabular-nums text-slate-900">
                              {formatMoney(product.price, currency)}
                            </td>
                            <td
                              className={cn(
                                'hidden whitespace-nowrap px-5 py-3.5 text-right tabular-nums md:table-cell',
                                margin < 0 ? 'text-red-600' : 'text-emerald-700'
                              )}
                            >
                              {formatMoney(margin, currency)}
                            </td>
                            <td className="hidden px-5 py-3.5 text-right tabular-nums text-slate-600 md:table-cell">
                              {formatPercent(rate)}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <div className="flex justify-end gap-1">
                                <button
                                  type="button"
                                  aria-label={`Modifier ${product.name}`}
                                  onClick={() => setProductDialog({ open: true, product })}
                                  className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Supprimer ${product.name}`}
                                  onClick={() => setDeleteTarget({ kind: 'product', product })}
                                  className="rounded-md p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <CatalogDialog
        open={catalogDialog.open}
        onOpenChange={(open) => setCatalogDialog((s) => ({ ...s, open }))}
        shopId={shopId}
        catalog={catalogDialog.catalog}
        nextPosition={catalogs.length}
        onSaved={(id) => {
          setSelectedId(id);
          void reload();
        }}
      />

      {selected && (
        <ProductDialog
          open={productDialog.open}
          onOpenChange={(open) => setProductDialog((s) => ({ ...s, open }))}
          catalogId={selected.id}
          currency={currency}
          product={productDialog.product}
          onSaved={() => void reload()}
        />
      )}

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.kind === 'catalog' ? 'Supprimer ce catalogue ?' : 'Supprimer ce produit ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.kind === 'catalog'
                ? `Le catalogue « ${deleteTarget.catalog.name} » et ses ${deleteTarget.catalog.products.length} produit(s) seront supprimés. Les ventes passées sont conservées.`
                : `Le produit « ${deleteTarget?.kind === 'product' ? deleteTarget.product.name : ''} » sera retiré. Les ventes passées sont conservées.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p role="alert" className="text-sm text-red-600">
              {deleteError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
