import { useState, type FormEvent } from 'react';
import { Loader2, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';

type Mode = 'signin' | 'signup';

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignup = mode === 'signup';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = isSignup ? await signUp(email, password) : await signIn(email, password);
    setSubmitting(false);
    if (result) setError(result);
  };

  const switchMode = () => {
    setMode(isSignup ? 'signin' : 'signup');
    setError(null);
  };

  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-slate-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500">
            <Store className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold">Caisse Pro</span>
        </div>
        <div className="max-w-md space-y-4">
          <h2 className="text-4xl font-semibold leading-tight">
            Pilotez toutes vos boutiques depuis un seul espace.
          </h2>
          <p className="text-base leading-relaxed text-slate-300">
            Catalogues, caisse rapide, dépenses et rentabilité réelle, pour salons, boutiques,
            bijouteries et points de restauration rapide.
          </p>
        </div>
        <p className="text-sm text-slate-400">Conçu pour les commerçants de proximité.</p>
      </aside>

      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600">
              <Store className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-slate-900">Caisse Pro</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {isSignup ? 'Créer un compte' : 'Connexion'}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {isSignup
              ? 'Commencez en quelques minutes, sans carte bancaire.'
              : 'Accédez à votre caisse et à vos statistiques.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Adresse email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                className="h-11 bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6 caractères minimum"
                className="h-11 bg-white"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <Button type="submit" disabled={submitting} className="h-11 w-full bg-emerald-600 text-white hover:bg-emerald-700">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSignup ? 'Créer mon compte' : 'Se connecter'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            {isSignup ? 'Vous avez déjà un compte ?' : 'Pas encore de compte ?'}{' '}
            <button
              type="button"
              onClick={switchMode}
              className="font-medium text-emerald-700 underline-offset-4 transition-colors hover:text-emerald-800 hover:underline"
            >
              {isSignup ? 'Se connecter' : 'Créer un compte'}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
