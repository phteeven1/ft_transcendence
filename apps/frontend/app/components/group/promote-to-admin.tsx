'use client';
import { useState } from 'react';
import { useAuth } from '../../context/auth-context';
import { Member } from '../../types';

type Props = {
  currentGroupMembers: Member[];
  syncAndRefresh: () => Promise<void>;
};

export default function PromoteToAdmin({ currentGroupMembers, syncAndRefresh }: Props) {
  const { group } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [resultMessage, setResultMessage] = useState('');
  const [showResult, setShowResult] = useState(false);

  if (!group) return null;

  const nonAdmins = currentGroupMembers.filter(m => !m.isAdmin);
  const admins = currentGroupMembers.filter(m => m.isAdmin);

  const handleOpen = () => {
    setSelectedIds([]);
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setSelectedIds([]);
  };

  const handleCloseResult = () => {
    setShowResult(false);
    setResultMessage('');
  };

  const toggleSelect = (memberId: number) => {
    setSelectedIds(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handlePromote = async () => {
    if (selectedIds.length === 0) {
      setShowModal(false);
      setResultMessage('No members were selected for promotion to admin.');
      setShowResult(true);
      return;
    }

    try {
      await Promise.all(
        selectedIds.map(userId =>
          fetch('http://localhost:4000/groups/promote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groupId: group.groupId, userId }),
          })
        )
      );

      const promotedNames = currentGroupMembers
        .filter(m => selectedIds.includes(m.memberId))
        .map(m => m.memberName);

      const namesString = promotedNames.length === 1
        ? promotedNames[0]
        : promotedNames.slice(0, -1).join(', ') + ' and ' + promotedNames[promotedNames.length - 1];

      const wasWere = promotedNames.length === 1 ? 'was' : 'were';
      const adminText = promotedNames.length === 1 ? 'an admin' : 'admins';

      await syncAndRefresh();
      setShowModal(false);
      setResultMessage(`${namesString} ${wasWere} promoted to ${adminText} in group ${group.groupName}.`);
      setShowResult(true);
    } catch (error) {
      console.error('Promotion failed:', error);
      setShowModal(false);
      setResultMessage('Something went wrong. Please try again.');
      setShowResult(true);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="bg-purple-500 hover:bg-purple-600 text-white font-medium py-3 px-4 rounded transition-colors"
      >
        Promote to Admin
      </button>

      {/* Selection modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[80vh]">
            <div className="p-6 pb-2">
              <h2 className="text-xl font-bold mb-1">Promote to Admin</h2>
              <p className="text-sm text-gray-600 mb-4">Select members to promote.</p>
            </div>

            <div className="overflow-y-auto flex-1 px-6">
              <ul>
                {admins.map(member => (
                  <li
                    key={member.memberId}
                    className="flex items-center justify-between py-2 border-b border-gray-100"
                  >
                    <span className="text-gray-400">{member.memberName}</span>
                    <span className="text-xs text-gray-400">Admin</span>
                  </li>
                ))}
                {nonAdmins.map(member => (
                  <li
                    key={member.memberId}
                    className="flex items-center justify-between py-2 border-b border-gray-100 cursor-pointer"
                    onClick={() => toggleSelect(member.memberId)}
                  >
                    <span>{member.memberName}</span>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(member.memberId)}
                      onChange={() => {}}
                      onClick={e => e.stopPropagation()}
                      readOnly
                      className="w-4 h-4 accent-purple-500 pointer-events-none"
                    />
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-6 pt-4 flex gap-3 justify-end border-t border-gray-100">
              <button
                onClick={handleClose}
                className="bg-gray-400 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePromote}
                className="bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Promote
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result modal */}
      {showResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <p className="mb-6 text-gray-700">{resultMessage}</p>
            <div className="flex justify-end">
              <button
                onClick={handleCloseResult}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}