import { useAuth } from '../../context/auth-context';
import { useRouter } from 'next/navigation';

export default function BackToDashboard() {
  const { leaveGroup } = useAuth();
  const router = useRouter();

  // this button sends the user back to dashboard
  const handleBackToDashboard = () => {
    leaveGroup();
    router.push('/dashboard');
  };

  return (
    <button
      onClick={handleBackToDashboard}
      className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded transition-colors"
    >
      Back to Dashboard
    </button>
  );
}