'use client';
import { useState } from 'react';
import { Player } from '../../types';

type Props = {
  selectedPlayer: Player | null;
  onUpdated: (player: Player) => void;
};

export default function EditPassphrase({ selectedPlayer, onUpdated }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [passQuestion, setPassQuestion] = useState('');
  const [passAnswer, setPassAnswer] = useState('');

  const isActive = selectedPlayer !== null;

  const handleOpen = () => {
    if (!selectedPlayer) return;
    setPassQuestion(selectedPlayer.playerPassQuestion);
    setPassAnswer('');
    setIsOpen(true);
  };

  const handleSave = async () => {
    if (!selectedPlayer || !passQuestion.trim() || !passAnswer.trim()) return;
    try {
      const res = await fetch('http://localhost:4000/players/updatePassPhrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: selectedPlayer.playerId,
          playerPassQuestion: passQuestion.trim(),
          playerPassAnswer: passAnswer.trim(),
        }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const updated: Player = await res.json();
      onUpdated(updated);
      setIsOpen(false);
      setPassQuestion('');
      setPassAnswer('');
    } catch (error) {
      console.error('editPassPhrase failed:', error);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        disabled={!isActive}
        className={`w-full p-2 rounded transition-colors ${
          isActive
            ? 'bg-green-500 text-white hover:bg-green-600 cursor-pointer'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
        }`}
      >
        Edit PassPhrase
      </button>

      {isOpen && selectedPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h2 className="text-xl font-bold">Edit PassPhrase for {selectedPlayer.playerName}</h2>
            <div>
              <label className="block mb-1">Secret Question</label>
              <input
                type="text"
                value={passQuestion}
                onChange={e => setPassQuestion(e.target.value)}
                className="w-full p-2 border rounded"
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
                placeholder="New answer"
                autoComplete="new-password"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={!passQuestion.trim() || !passAnswer.trim()}
                className={`flex-1 p-2 rounded text-white ${
                  passQuestion.trim() && passAnswer.trim()
                    ? 'bg-blue-500 hover:bg-blue-600'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                Save
              </button>
              <button
                onClick={() => setIsOpen(false)}
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