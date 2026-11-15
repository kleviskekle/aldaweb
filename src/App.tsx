import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { WorkspaceProvider, useWorkspace } from '@/contexts/WorkspaceContext';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { AppShell } from '@/components/layout/AppShell';

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
    </div>
  );
}

function WorkspaceGate() {
  const { loading, error, workspace, reload } = useWorkspace();

  if (loading) return <FullScreenLoader />;

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
          <Button onClick={() => void reload()} className="mt-6 bg-emerald-600 text-white hover:bg-emerald-700">
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  if (!workspace) return <OnboardingWizard />;

  return <AppShell />;
}

function Root() {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenLoader />;
  if (!user) return <AuthScreen />;

  return (
    <WorkspaceProvider>
      <WorkspaceGate />
    </WorkspaceProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <Root />
      <Toaster />
    </AuthProvider>
  );
}

export default App;
