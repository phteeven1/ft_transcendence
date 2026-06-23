import { useAuth } from '../../context/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/ui';

export default function BackToDashboard() {
  const { leaveGroup } = useAuth();
  const router = useRouter();

  // this button sends the user back to dashboard
  const handleBackToDashboard = () => {
    leaveGroup();
    router.push('/dashboard');
  };

  return (
    <Button
      onClick={handleBackToDashboard}
      variant="ghost"
      fullWidth
      className="clay-action-btn"
    >
      Back to Dashboard
    </Button>
  );
}
