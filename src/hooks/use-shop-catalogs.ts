import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Catalog, Product } from '@/lib/types';

export interface CatalogWithProducts extends Catalog {
  products: Product[];
}

export function useShopCatalogs(shopId: string | null) {
  const [catalogs, setCatalogs] = useState<CatalogWithProducts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!shopId) {
      setCatalogs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from('catalogs')
      .select('id, shop_id, name, position, products(id, catalog_id, name, cost_price, price)')
      .eq('shop_id', shopId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (queryError || !data) {
      setError('Impossible de charger les catalogues. Réessayez.');
    } else {
      const rows = data as unknown as CatalogWithProducts[];
      setCatalogs(
        rows.map((catalog) => ({
          ...catalog,
          products: [...catalog.products].sort((a, b) => a.name.localeCompare(b.name, 'fr')),
        }))
      );
    }
    setLoading(false);
  }, [shopId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { catalogs, loading, error, reload: load };
}
