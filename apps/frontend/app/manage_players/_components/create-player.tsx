'use client';
import { useState } from 'react';
import { useAuth } from '../../context/auth-context';
import { Player } from '../../types';

type Props = {
  onCreated: (player: Player) => void;
};

export default function CreatePlayer({ onCreated }: Props) {
  const { user, group } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [passQuestion, setPassQuestion] = useState('');
  const [passAnswer, setPassAnswer] = useState('');
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!user || !group) return;
    if (!playerName.trim() || !passQuestion.trim() || !passAnswer.trim()) {
      setError('All fields are required.');
      return;
    }
    try {
      const res = await fetch('http://localhost:4000/players/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerInGroup: group.groupId,
          playerParent: user.userId,
          playerName: playerName.trim(),
          playerPassQuestion: passQuestion.trim(),
          playerPassAnswer: passAnswer.trim(),
        }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const created: Player = await res.json();
      onCreated(created);
      handleClose();
    } catch (error) {
      console.error('createPlayer failed:', error);
      setError('Failed to create player. Please try again.');
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setPlayerName('');
    setPassQuestion('');
    setPassAnswer('');
    setError('');
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full bg-emerald-500 text-white p-2 rounded hover:bg-emerald-600"
      >
        Create Player
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h2 className="text-xl font-bold">Create Player Profile</h2>
            <div>
              <label className="block mb-1">Player Name</label>
              <input
                type="text"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="e.g. Adam"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block mb-1">Secret Question</label>
              <input
                type="text"
                value={passQuestion}
                onChange={e => setPassQuestion(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="e.g. What is your dog's name?"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block mb-1">Answer</label>
              <input
                type="text"
                value={passAnswer}
                onChange={e => setPassAnswer(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="e.g. Rex"
                autoComplete="new-password"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={handleCreate}
                className="flex-1 bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
              >
                Create
              </button>
              <button
                onClick={handleClose}
                className="flex-1 bg-gray-300 text-gray-700 p-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}