import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2, Plus, Store, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const CURRENCIES = ['FCFA', 'EUR', 'USD', 'MAD', 'GNF', 'CAD'];
const SUGGESTED_CATALOGS = ['Prestations', 'Produits de beauté', 'Vêtements', 'Accessoires', 'Bijoux', 'Boissons', 'Plats'];

const STEPS = ['Entreprise', 'Boutique', 'Catalogues'];

export function OnboardingWizard() {
  const { signOut } = useAuth();
  const { reload } = useWorkspace();
  const [step, setStep] = useState(0);
  const [companyName, setCompanyName] = useState('');
  const [currency, setCurrency] = useState('FCFA');
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [catalogs, setCatalogs] = useState<string[]>([]);
  const [catalogInput, setCatalogInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addCatalog = (name: string) => {
    const clean = name.trim();
    if (!clean || catalogs.some((c) => c.toLowerCase() === clean.toLowerCase())) return;
    setCatalogs((prev) => [...prev, clean]);
    setCatalogInput('');
  };

  const goNext = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const finish = async () => {
    setError(null);
    setSubmitting(true);
    const { data: companyId, error: createError } = await supabase.rpc('create_company', {
      p_name: companyName,
      p_currency: currency,
      p_shop_name: shopName,
      p_shop_address: shopAddress,
    });

    if (createError || !companyId) {
      setSubmitting(false);
      setError("Nous n'avons pas pu créer votre espace. Réessayez.");
      return;
    }

    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('id')
      .eq('company_id', companyId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (shopError || !shop) {
      setSubmitting(false);
      setError("Votre espace est créé, mais la boutique est introuvable. Rechargez la page.");
      await reload();
      return;
    }

    if (catalogs.length > 0) {
      const { error: catalogError } = await supabase.from('catalogs').insert(
        catalogs.map((name, index) => ({ shop_id: shop.id, name, position: index }))
      );
      if (catalogError) {
        setSubmitting(false);
        setError("Votre espace est créé, mais les catalogues n'ont pas été enregistrés. Vous pourrez les ajouter depuis la page Produits.");
        await reload();
        return;
      }
    }

    await reload();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600">
            <Store className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold text-slate-900">Caisse Pro</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <ol className="mb-8 flex items-center gap-3">
            {STEPS.map((label, index) => {
              const done = index < step;
              const active = index === step;
              return (
                <li key={label} className="flex flex-1 items-center gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                      done
                        ? 'bg-emerald-600 text-white'
                        : active
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : index + 1}
                  </span>
                  <span className={`hidden text-sm sm:block ${active ? 'font-medium text-slate-900' : 'text-slate-500'}`}>
                    {label}
                  </span>
                  {index < STEPS.length - 1 && <span className="h-px flex-1 bg-slate-200" />}
                </li>
              );
            })}
          </ol>

          {step === 0 && (
            <form onSubmit={goNext} className="space-y-6">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Votre entreprise</h1>
                <p className="mt-1 text-sm text-slate-600">Ces informations apparaîtront sur vos rapports.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-name">Nom de l'entreprise</Label>
                <Input
                  id="company-name"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ex : Salon Éclat"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Devise</Label>
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={!companyName.trim()} className="h-11 bg-emerald-600 px-6 text-white hover:bg-emerald-700">
                  Continuer <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          )}

          {step === 1 && (
            <form onSubmit={goNext} className="space-y-6">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Votre première boutique</h1>
                <p className="mt-1 text-sm text-slate-600">Vous pourrez en ajouter d'autres plus tard.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="shop-name">Nom de la boutique</Label>
                <Input
                  id="shop-name"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="Ex : Boutique Plateau"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shop-address">Adresse (facultatif)</Label>
                <Input
                  id="shop-address"
                  value={shopAddress}
                  onChange={(e) => setShopAddress(e.target.value)}
                  placeholder="Ex : Avenue Lumumba, Dakar"
                  className="h-11"
                />
              </div>
              <div className="flex justify-between">
                <Button type="button" variant="ghost" onClick={() => setStep(0)} className="h-11">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Retour
                </Button>
                <Button type="submit" disabled={!shopName.trim()} className="h-11 bg-emerald-600 px-6 text-white hover:bg-emerald-700">
                  Continuer <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Vos catalogues</h1>
                <p className="mt-1 text-sm text-slate-600">
                  Regroupez vos produits par rayon ou par famille. Vous pouvez en créer autant que nécessaire.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {SUGGESTED_CATALOGS.filter((name) => !catalogs.includes(name)).map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => addCatalog(name)}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition-colors hover:border-emerald-500 hover:text-emerald-700"
                  >
                    <Plus className="h-3.5 w-3.5" /> {name}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addCatalog(catalogInput);
                }}
                className="flex gap-2"
              >
                <Input
                  value={catalogInput}
                  onChange={(e) => setCatalogInput(e.target.value)}
                  placeholder="Nom d'un catalogue personnalisé"
                  className="h-11"
                />
                <Button type="submit" variant="outline" className="h-11" disabled={!catalogInput.trim()}>
                  Ajouter
                </Button>
              </form>

              {catalogs.length > 0 ? (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {catalogs.map((name) => (
                    <li key={name} className="flex items-center justify-between px-4 py-3 text-sm">
                      <span className="font-medium text-slate-800">{name}</span>
                      <button
                        type="button"
                        aria-label={`Retirer ${name}`}
                        onClick={() => setCatalogs((prev) => prev.filter((c) => c !== name))}
                        className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                  Aucun catalogue pour l'instant. Vous pouvez aussi passer cette étape.
                </p>
              )}

              {error && (
                <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <div className="flex justify-between">
                <Button type="button" variant="ghost" onClick={() => setStep(1)} disabled={submitting} className="h-11">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Retour
                </Button>
                <Button
                  type="button"
                  onClick={finish}
                  disabled={submitting}
                  className="h-11 bg-emerald-600 px-6 text-white hover:bg-emerald-700"
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Terminer la configuration
                </Button>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-6 block w-full text-center text-sm text-slate-500 transition-colors hover:text-slate-800"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
