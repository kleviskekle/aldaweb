import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, parseISO, startOfMonth } from 'date-fns';
import { Pencil, Plus, Receipt, Settings2, Trash2 } from 'lucide-react';
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
import { supabase } from '@/lib/supabase';
import { formatMoney } from '@/lib/format';
import type { Catalog, Expense, ExpenseType } from '@/lib/types';
import { ExpenseFormDialog } from './ExpenseFormDialog';
import { ExpenseTypesDialog } from './ExpenseTypesDialog';

const LIST_LIMIT = 200;

export function ExpensesPage() {
  const { currentShop, workspace } = useWorkspace();
  const currency = workspace?.company.currency ?? 'FCFA';
  const shopId = currentShop?.id ?? null;

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [types, setTypes] = useState<ExpenseType[]>([]);
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formState, setFormState] = useState<{ open: boolean; expense: Expense | null }>({
    open: false,
    expense: null,
  });
  const [typesOpen, setTypesOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    setError(null);
    const [expenseRes, typeRes, catalogRes] = await Promise.all([
      supabase
        .from('expenses')
        .select('id, shop_id, expense_type_id, catalog_id, label, amount, spent_on')
        .eq('shop_id', shopId)
        .order('spent_on', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(LIST_LIMIT),
      supabase.from('expense_types').select('id, shop_id, name').eq('shop_id', shopId).order('name'),
      supabase.from('catalogs').select('id, shop_id, name, position').eq('shop_id', shopId).order('position'),
    ]);

    if (expenseRes.error || typeRes.error || catalogRes.error || !expenseRes.data || !typeRes.data || !catalogRes.data) {
      setError('Impossible de charger les dépenses. Réessayez.');
    } else {
      setExpenses(expenseRes.data as Expense[]);
      setTypes(typeRes.data as ExpenseType[]);
      setCatalogs(catalogRes.data as Catalog[]);
    }
    setLoading(false);
  }, [shopId]);

  useEffect(() => {
    void load();
  }, [load]);

  const monthTotal = useMemo(() => {
    const start = startOfMonth(new Date());
    return expenses
      .filter((e) => parseISO(e.spent_on) >= start)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const typeName = (id: string | null) => types.find((t) => t.id === id)?.name ?? 'Sans type';
  const catalogName = (id: string | null) => catalogs.find((c) => c.id === id)?.name ?? 'Frais généraux';

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    const { error: removeError } = await supabase.from('expenses').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    if (removeError) {
      setDeleteError("La dépense n'a pas pu être supprimée. Réessayez.");
      return;
    }
    setDeleteTarget(null);
    await load();
  };

  if (!shopId) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Dépenses</h2>
          <p className="mt-1 text-sm text-slate-600">Suivez les charges de {currentShop?.name}.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setTypesOpen(true)} className="h-10">
            <Settings2 className="mr-2 h-4 w-4" /> Types de dépenses
          </Button>
          <Button
            onClick={() => setFormState({ open: true, expense: null })}
            className="h-10 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Plus className="mr-2 h-4 w-4" /> Nouvelle dépense
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Dépenses du mois en cours</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{formatMoney(monthTotal, currency)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Types configurés</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{types.length}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">Historique</h3>
        </div>

        {loading && expenses.length === 0 ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-slate-100" />
            ))}
          </div>
        ) : error ? (
          <p role="alert" className="p-5 text-sm text-red-700">
            {error}
          </p>
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
              <Receipt className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">Aucune dépense enregistrée</h3>
            <p className="mt-1 max-w-sm text-sm text-slate-600">
              Ajoutez loyer, marchandises ou charges pour suivre la rentabilité réelle.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {expenses.map((expense) => (
              <li key={expense.id} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {expense.label || typeName(expense.expense_type_id)}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {format(parseISO(expense.spent_on), 'dd/MM/yyyy')} · {typeName(expense.expense_type_id)} ·{' '}
                    {catalogName(expense.catalog_id)}
                  </p>
                </div>
                <p className="whitespace-nowrap text-sm font-semibold tabular-nums text-slate-900">
                  {formatMoney(expense.amount, currency)}
                </p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    aria-label="Modifier la dépense"
                    onClick={() => setFormState({ open: true, expense })}
                    className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Supprimer la dépense"
                    onClick={() => setDeleteTarget(expense)}
                    className="rounded-md p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ExpenseFormDialog
        open={formState.open}
        onOpenChange={(open) => setFormState((s) => ({ ...s, open }))}
        shopId={shopId}
        currency={currency}
        expense={formState.expense}
        types={types}
        catalogs={catalogs}
        onSaved={() => void load()}
      />

      <ExpenseTypesDialog
        open={typesOpen}
        onOpenChange={setTypesOpen}
        shopId={shopId}
        types={types}
        onChanged={() => void load()}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette dépense ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action retire la dépense de vos statistiques.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p role="alert" className="text-sm text-red-600">{deleteError}</p>}
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
