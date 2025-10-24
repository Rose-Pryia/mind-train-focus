import { useUser } from '@/contexts/UserContext';
import { LoginPrompt } from './LoginPrompt';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPrompt />;
  }

  return <>{children}</>;
}