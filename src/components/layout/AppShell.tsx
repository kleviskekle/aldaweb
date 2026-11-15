import { useState, type ComponentType } from 'react';
import { BarChart3, LogOut, Package, Receipt, ShoppingCart, Store } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { PosPage } from '@/components/pos/PosPage';
import { ProductsPage } from '@/components/products/ProductsPage';
import { ExpensesPage } from '@/components/expenses/ExpensesPage';
import { cn } from '@/lib/utils';

export type Section = 'pos' | 'products' | 'expenses';

interface NavItem {
  id: Section;
  label: string;
  icon: ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'pos', label: 'Caisse', icon: ShoppingCart },
  { id: 'products', label: 'Produits', icon: Package },
  { id: 'expenses', label: 'Dépenses', icon: Receipt },
];

export function AppShell() {
  const { user, signOut } = useAuth();
  const { workspace, isAdmin, currentShop, setCurrentShopId } = useWorkspace();
  const [section, setSection] = useState<Section>('pos');

  if (!workspace) return null;

  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);
  const shops = workspace.shops;

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600">
            <Store className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{workspace.company.name}</p>
            <p className="text-xs text-slate-500">{isAdmin ? 'Administrateur' : 'Gérant'}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {items.map((item) => (
            <NavButton key={item.id} item={item} active={section === item.id} onSelect={setSection} />
          ))}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <p className="truncate px-2 text-xs text-slate-500">{user?.email}</p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut className="h-4 w-4" /> Se déconnecter
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col pb-20 lg:pb-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3 lg:hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600">
              <Store className="h-4 w-4 text-white" />
            </div>
            <span className="truncate text-sm font-semibold text-slate-900">{workspace.company.name}</span>
          </div>
          <h1 className="hidden text-base font-semibold text-slate-900 lg:block">
            {items.find((i) => i.id === section)?.label}
          </h1>

          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="shop-switch">Boutique active</label>
            {shops.length > 1 && isAdmin ? (
              <select
                id="shop-switch"
                value={currentShop?.id ?? ''}
                onChange={(e) => setCurrentShopId(e.target.value)}
                className="h-9 max-w-[200px] rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 transition-colors hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="flex h-9 items-center gap-2 rounded-md bg-slate-100 px-3 text-sm font-medium text-slate-700">
                <Store className="h-4 w-4 text-slate-500" />
                <span className="max-w-[160px] truncate">{currentShop?.name}</span>
              </span>
            )}
          </div>
        </header>

        <main className="min-w-0 flex-1">
          {currentShop ? (
            <SectionView section={section} shopId={currentShop.id} />
          ) : (
            <div className="p-8 text-sm text-slate-600">Aucune boutique n'est disponible pour votre compte.</div>
          )}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const Icon = item.icon;
          const active = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={cn(
                'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                active ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-800'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function NavButton({
  item,
  active,
  onSelect,
}: {
  item: NavItem;
  active: boolean;
  onSelect: (id: Section) => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        active
          ? 'bg-emerald-50 text-emerald-800'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      )}
    >
      <Icon className={cn('h-4 w-4', active && 'text-emerald-600')} />
      {item.label}
    </button>
  );
}

function SectionView({ section, shopId }: { section: Section; shopId: string }) {
  switch (section) {
    case 'pos':
      return <PosPage key={shopId} />;
    case 'products':
      return <ProductsPage key={shopId} />;
    case 'expenses':
      return <ExpensesPage key={shopId} />;
  }
}
