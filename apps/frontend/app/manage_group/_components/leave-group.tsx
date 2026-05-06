'use client';
import { useAuth } from '../../context/auth-context';
import { useRouter } from 'next/navigation';

type Props = {
  syncAndRefresh: () => Promise<void>;
};

export default function LeaveGroup({ syncAndRefresh }: Props) {
  const { user, group, refreshUser, leaveGroup } = useAuth();
  const router = useRouter();

  const handleLeaveGroup = async () => {
    if (!user || !group) return;

    const totalMembers = group.groupMembers.length + group.groupAdmins.length;
    const isOnlyAdmin = group.groupAdmins.includes(user.userId) &&
      group.groupAdmins.length === 1;
    const isLastMember = totalMembers === 1;

    const confirmed = window.confirm(
      `Are you sure you want to permanently leave ${group.groupName}?`
    );
    if (!confirmed) return;

    if (isOnlyAdmin && !isLastMember) {
      window.alert(
        'You are the only admin of this group. Before leaving, you need to make another member admin.'
      );
      return;
    }

    if (isLastMember) {
      const confirmedDelete = window.confirm(
        `You are the last member of ${group.groupName}. If you leave, the group will be permanently removed.`
      );
      if (!confirmedDelete) return;
    }

    try {
      const res = await fetch('http://localhost:4000/groups/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: group.groupId, userId: user.userId }),
      });
      if (!res.ok) throw new Error(`Failed to leave group: ${res.status}`);
      await refreshUser();
      leaveGroup();
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to leave group:', error);
      window.alert('Something went wrong. Please try again.');
    }
  };

  return (
    <button
      onClick={handleLeaveGroup}
      className="bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded transition-colors"
    >
      Leave Group
    </button>
  );
}