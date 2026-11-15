import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { Company, Membership, Shop } from '@/lib/types';
import { useAuth } from './AuthContext';

interface WorkspaceData {
  company: Company;
  membership: Membership;
  shops: Shop[];
}

interface WorkspaceContextValue {
  loading: boolean;
  error: string | null;
  workspace: WorkspaceData | null;
  isAdmin: boolean;
  currentShop: Shop | null;
  setCurrentShopId: (id: string) => void;
  reload: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const LOAD_ERROR = 'Impossible de charger votre espace. Vérifiez votre connexion et réessayez.';

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [currentShopId, setCurrentShopId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const { error: claimError } = await supabase.rpc('claim_my_invitations');
    if (claimError) {
      setError(LOAD_ERROR);
      setLoading(false);
      return;
    }

    const { data: memberRows, error: memberError } = await supabase
      .from('company_members')
      .select('company_id, role, shop_id, companies(id, name, currency)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1);

    if (memberError || !memberRows) {
      setError(LOAD_ERROR);
      setLoading(false);
      return;
    }

    const row = memberRows[0];
    if (!row) {
      setWorkspace(null);
      setLoading(false);
      return;
    }

    const company = Array.isArray(row.companies) ? row.companies[0] : row.companies;
    if (!company) {
      setError(LOAD_ERROR);
      setLoading(false);
      return;
    }

    const { data: shopRows, error: shopError } = await supabase
      .from('shops')
      .select('id, company_id, name, address')
      .eq('company_id', row.company_id)
      .order('created_at', { ascending: true });

    if (shopError || !shopRows) {
      setError(LOAD_ERROR);
      setLoading(false);
      return;
    }

    const membership: Membership = {
      company_id: row.company_id,
      role: row.role as Membership['role'],
      shop_id: row.shop_id,
    };
    setWorkspace({ company, membership, shops: shopRows as Shop[] });
    setCurrentShopId((prev) => {
      if (membership.role === 'manager') return membership.shop_id;
      if (prev && shopRows.some((s) => s.id === prev)) return prev;
      return shopRows[0]?.id ?? null;
    });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setWorkspace(null);
      setLoading(false);
      return;
    }
    void load();
  }, [user, load]);

  const isAdmin = workspace?.membership.role === 'admin';
  const currentShop =
    workspace?.shops.find((s) => s.id === currentShopId) ?? workspace?.shops[0] ?? null;

  return (
    <WorkspaceContext.Provider
      value={{
        loading,
        error,
        workspace,
        isAdmin: Boolean(isAdmin),
        currentShop,
        setCurrentShopId,
        reload: load,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
