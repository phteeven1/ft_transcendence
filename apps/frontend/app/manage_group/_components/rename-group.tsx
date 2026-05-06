'use client';
import { useState } from 'react';
import { useAuth } from '../../context/auth-context';

type Props = {
  syncAndRefresh: () => Promise<void>;
};

export default function RenameGroup({ syncAndRefresh }: Props) {
  const { group } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [resultMessage, setResultMessage] = useState('');

  if (!group) return null;

  const handleOpen = () => {
    setNewName(group.groupName);
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setNewName('');
  };

  const handleRename = async () => {
    if (!newName.trim()) return;
    if (newName.trim() === group.groupName) {
      setShowModal(false);
      setResultMessage('The group name was not changed.');
      setShowResult(true);
      return;
    }

    try {
      const res = await fetch('http://localhost:4000/groups/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: group.groupId, groupName: newName.trim() }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      await syncAndRefresh();
      setShowModal(false);
      setResultMessage(`Group successfully renamed to ${newName.trim()}.`);
      setShowResult(true);
    } catch (error) {
      console.error('Rename failed:', error);
      setShowModal(false);
      setResultMessage('Something went wrong. Please try again.');
      setShowResult(true);
    }
  };

  const handleCloseResult = () => {
    setShowResult(false);
    setResultMessage('');
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-4 rounded transition-colors"
      >
        Rename Group
      </button>

      {/* Rename modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Rename Group</h2>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1">New Group Name</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="Enter new group name"
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleClose}
                className="bg-gray-400 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                disabled={!newName.trim()}
                className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Rename
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