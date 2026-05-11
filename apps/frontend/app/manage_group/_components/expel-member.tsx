'use client';

// Expel Member button drives a three step modal flow.
// 1. showModal: Shows all group members - admins greyed out - and allows user to select.
//    'Expel' button stays disabled until a selection is made. Clicking 'Expel' closes modal.
// 2. showConfirm: Asks user to confirm expelling the selected members. 
//    'Back' returns to showModal, 'Expel' calls handleConfirmExpel, which POSTs to /groups/expel
//    with id's of group and selected members. On success, it calls syncAndRefresh to update.
// 3. showResult: shows either successful result or error message. 'OK' button to close.

import { useState } from 'react';
import { useAuth } from '../../context/auth-context';
import { Member } from '../../types';

// defines shape of props that ExpelMember must receive from parent
type Props = {
  currentGroupMembers: Member[];
  syncAndRefresh: () => Promise<void>;
};

export default function ExpelMember({ currentGroupMembers, syncAndRefresh }: Props) {
  const { group } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [showResult, setShowResult] = useState(false);

  // Guard. Returns null if no group
  if (!group) return null;

  const nonAdmins = currentGroupMembers.filter(m => !m.isAdmin);
  const admins = currentGroupMembers.filter(m => m.isAdmin);

  const selectedMember = currentGroupMembers.find(m => m.memberId === selectedId) ?? null;

  // resets selectedId to null and opens selection modal.
  const handleOpen = () => {
    setSelectedId(null);
    setShowModal(true);
  };

  // hides the selection modal and resets selectedId to null
  const handleClose = () => {
    setShowModal(false);
    setSelectedId(null);
  };

  // hides the result modal and clears the result message
  const handleCloseResult = () => {
    setShowResult(false);
    setResultMessage('');
  };

  // toggles the selection of a member. Already selected -> unselected -> selected
  const handleSelect = (memberId: number) => {
    setSelectedId(prev => prev === memberId ? null : memberId);
  };

  // guards against no selection, then closes selection modal and opens confirmation modal
  const handleExpelClick = () => {
    if (!selectedId) return;
    setShowModal(false);
    setShowConfirm(true);
  };

  // is called when 'Expel' is clicked in confirmation modal. Guards against no selected group or member
  // POSTS to /groups/expel with group id and 
  const handleConfirmExpel = async () => {
    if (!selectedId || !selectedMember) return;
    try {
      const res = await fetch('http://localhost:4000/groups/expel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: group.groupId, userId: selectedId }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      await syncAndRefresh();
      setShowConfirm(false);
      setSelectedId(null);
      setResultMessage(`${selectedMember.memberName} has been expelled from ${group.groupName}.`);
      setShowResult(true);
    } catch (error) {
      console.error('Expel failed:', error);
      setShowConfirm(false);
      setResultMessage('Something went wrong. Please try again.');
      setShowResult(true);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-4 rounded transition-colors"
      >
        Expel Member
      </button>

      {/* Selection modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[80vh]">
            <div className="p-6 pb-2">
              <h2 className="text-xl font-bold mb-1">Expel Member</h2>
              <p className="text-sm text-gray-600 mb-4">Select a member to expel.</p>
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
                    onClick={() => handleSelect(member.memberId)}
                  >
                    <span>{member.memberName}</span>
                    <input
                      type="radio"
                      checked={selectedId === member.memberId}
                      onChange={() => {}}
                      onClick={e => e.stopPropagation()}
                      readOnly
                      className="w-4 h-4 accent-red-500 pointer-events-none"
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
                onClick={handleExpelClick}
                disabled={!selectedId}
                className={`font-medium py-2 px-4 rounded transition-colors text-white ${
                  selectedId
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                Expel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation modal */}
      {showConfirm && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-3">Are you sure?</h2>
            <p className="text-gray-700 mb-6">
              This will expel <span className="font-semibold">{selectedMember.memberName}</span> from{' '}
              <span className="font-semibold">{group.groupName}</span>. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowConfirm(false); setShowModal(true); }}
                className="bg-gray-400 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleConfirmExpel}
                className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Expel
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