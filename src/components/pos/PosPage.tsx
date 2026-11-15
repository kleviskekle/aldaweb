import { useMemo, useState } from 'react';
import { PackageOpen, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useShopCatalogs } from '@/hooks/use-shop-catalogs';
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/format';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CartPanel, type CartLine } from './CartPanel';

const MAX_QUANTITY = 1000;

interface ProductEntry {
  product: Product;
  catalogName: string;
}

export function PosPage() {
  const { currentShop, workspace } = useWorkspace();
  const currency = workspace?.company.currency ?? 'FCFA';
  const shopId = currentShop?.id ?? null;
  const { catalogs, loading, error } = useShopCatalogs(shopId);

  const [activeCatalogId, setActiveCatalogId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const activeCatalog = catalogs.find((c) => c.id === activeCatalogId) ?? catalogs[0] ?? null;

  const visibleProducts: ProductEntry[] = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (query) {
      return catalogs.flatMap((catalog) =>
        catalog.products
          .filter((p) => p.name.toLowerCase().includes(query))
          .map((product) => ({ product, catalogName: catalog.name }))
      );
    }
    return (activeCatalog?.products ?? []).map((product) => ({
      product,
      catalogName: activeCatalog?.name ?? '',
    }));
  }, [catalogs, activeCatalog, search]);

  const quantityById = useMemo(() => {
    const map = new Map<string, number>();
    cart.forEach((line) => map.set(line.product.id, line.quantity));
    return map;
  }, [cart]);

  const total = cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  const addToCart = (product: Product, catalogName: string) => {
    setCart((prev) => {
      const existing = prev.find((line) => line.product.id === product.id);
      if (existing) {
        return prev.map((line) =>
          line.product.id === product.id
            ? { ...line, quantity: Math.min(line.quantity + 1, MAX_QUANTITY) }
            : line
        );
      }
      return [...prev, { product, catalogName, quantity: 1 }];
    });
  };

  const changeQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((line) =>
        line.product.id === productId
          ? { ...line, quantity: Math.min(Math.max(line.quantity + delta, 1), MAX_QUANTITY) }
          : line
      )
    );
  };

  const removeLine = (productId: string) => {
    setCart((prev) => prev.filter((line) => line.product.id !== productId));
  };

  const validateSale = async () => {
    if (!shopId || cart.length === 0) return;
    setSubmitting(true);
    const { error: saleError } = await supabase.rpc('create_sale', {
      p_shop: shopId,
      p_items: cart.map((line) => ({ product_id: line.product.id, quantity: line.quantity })),
    });
    setSubmitting(false);

    if (saleError) {
      toast.error("La vente n'a pas pu être validée", {
        description: 'Vérifiez le panier et réessayez.',
      });
      return;
    }

    toast.success('Vente validée', {
      description: `${itemCount} article${itemCount > 1 ? 's' : ''} · ${formatMoney(total, currency)}`,
    });
    setCart([]);
    setCartOpen(false);
  };

  const cartPanelProps = {
    lines: cart,
    currency,
    total,
    itemCount,
    submitting,
    onChangeQuantity: changeQuantity,
    onRemove: removeLine,
    onClear: () => setCart([]),
    onValidate: () => void validateSale(),
  };

  if (!shopId) return null;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row">
      <section className="min-w-0 flex-1 space-y-5 p-4 pb-28 sm:p-6 lg:pb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {catalogs.map((catalog) => {
              const isActive = !search.trim() && activeCatalog?.id === catalog.id;
              return (
                <button
                  key={catalog.id}
                  type="button"
                  onClick={() => {
                    setActiveCatalogId(catalog.id);
                    setSearch('');
                  }}
                  className={cn(
                    'shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                  )}
                >
                  {catalog.name}
                </button>
              );
            })}
          </div>
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit"
            className="h-10 bg-white sm:w-64"
          />
        </div>

        {loading && catalogs.length === 0 ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200/60" />
            ))}
          </div>
        ) : error ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {error}
          </div>
        ) : catalogs.length === 0 ? (
          <EmptyState
            title="Aucun catalogue pour le moment"
            description="Créez un catalogue et ajoutez vos produits dans la page Produits pour commencer à vendre."
          />
        ) : visibleProducts.length === 0 ? (
          <EmptyState
            title={search.trim() ? 'Aucun produit trouvé' : 'Ce catalogue est vide'}
            description={
              search.trim()
                ? 'Essayez un autre mot-clé.'
                : 'Ajoutez des produits à ce catalogue depuis la page Produits.'
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {visibleProducts.map(({ product, catalogName }) => {
              const quantity = quantityById.get(product.id) ?? 0;
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addToCart(product, catalogName)}
                  className={cn(
                    'group relative flex min-h-28 flex-col justify-between rounded-xl border bg-white p-4 text-left shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md active:translate-y-0 active:scale-[0.98]',
                    quantity > 0 ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-200'
                  )}
                >
                  {quantity > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-xs font-semibold tabular-nums text-white shadow">
                      {quantity}
                    </span>
                  )}
                  <div>
                    <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">{product.name}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{catalogName}</p>
                  </div>
                  <p className="mt-3 text-base font-semibold tabular-nums text-slate-900">
                    {formatMoney(product.price, currency)}
                  </p>
                </button>
              );
            })}
          </div>
        )}
        {catalogs.length > 0 && visibleProducts.length > 0 && (
          <p className="flex items-center gap-2 text-xs text-slate-400">
            <PackageOpen className="h-3.5 w-3.5" /> Touchez un produit pour l'ajouter au panier.
          </p>
        )}
      </section>

      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[380px] shrink-0 border-l border-slate-200 bg-white lg:block">
        <CartPanel {...cartPanelProps} />
      </aside>

      <div className="fixed inset-x-0 bottom-16 z-30 px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="flex h-14 w-full items-center justify-between rounded-xl bg-slate-900 px-5 text-white shadow-lg transition-transform active:scale-[0.99]"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <ShoppingBag className="h-4 w-4" />
            Panier ({itemCount})
          </span>
          <span className="text-base font-semibold tabular-nums">{formatMoney(total, currency)}</span>
        </button>
      </div>

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="bottom" className="h-[85vh] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Panier</SheetTitle>
            <SheetDescription>Articles sélectionnés pour la vente</SheetDescription>
          </SheetHeader>
          <CartPanel {...cartPanelProps} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
        <PackageOpen className="h-6 w-6 text-emerald-600" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-600">{description}</p>
    </div>
  );
}
