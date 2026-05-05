'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';
import { Player } from '../types';

export default function ManagePlayers() {
  const { user, group, logout, loginAsPlayer } = useAuth();
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Create Player popup
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPassQuestion, setNewPassQuestion] = useState('');
  const [newPassAnswer, setNewPassAnswer] = useState('');
  const [createError, setCreateError] = useState('');

  // Rename popup
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameName, setRenameName] = useState('');

  // Edit PassPhrase popup
  const [isPassPhraseOpen, setIsPassPhraseOpen] = useState(false);
  const [editPassQuestion, setEditPassQuestion] = useState('');
  const [editPassAnswer, setEditPassAnswer] = useState('');

  // Delete popup
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Invite to Play popup
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  useEffect(() => {
    if (!user || !group) {
      router.push('/');
      return;
    }
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    if (!user || !group) return;
    try {
      const res = await fetch(
        `http://localhost:4000/players/parent/${user.userId}/group/${group.groupId}`
      );
      if (!res.ok) throw new Error(`Failed to fetch players: ${res.status}`);
      const data: Player[] = await res.json();
      setPlayers(data);
    } catch (error) {
      console.error('fetchPlayers failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPlayer = (player: Player) => {
    setSelectedPlayer(prev =>
      prev?.playerId === player.playerId ? null : player
    );
  };

  // Create Player
  const handleCreate = async () => {
    if (!user || !group) return;
    if (!newPlayerName.trim() || !newPassQuestion.trim() || !newPassAnswer.trim()) {
      setCreateError('All fields are required.');
      return;
    }
    try {
      const res = await fetch('http://localhost:4000/players/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerInGroup: group.groupId,
          playerParent: user.userId,
          playerName: newPlayerName.trim(),
          playerPassQuestion: newPassQuestion.trim(),
          playerPassAnswer: newPassAnswer.trim(),
        }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const created: Player = await res.json();
      setPlayers(prev => [...prev, created]);
      setIsCreateOpen(false);
      setNewPlayerName('');
      setNewPassQuestion('');
      setNewPassAnswer('');
      setCreateError('');
    } catch (error) {
      console.error('createPlayer failed:', error);
      setCreateError('Failed to create player. Please try again.');
    }
  };

  // Rename Player
  const handleRename = async () => {
    if (!selectedPlayer || !renameName.trim()) return;
    try {
      const res = await fetch('http://localhost:4000/players/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: selectedPlayer.playerId,
          playerName: renameName.trim(),
        }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const updated: Player = await res.json();
      setPlayers(prev =>
        prev.map(p => (p.playerId === updated.playerId ? updated : p))
      );
      setSelectedPlayer(updated);
      setIsRenameOpen(false);
      setRenameName('');
    } catch (error) {
      console.error('renamePlayer failed:', error);
    }
  };

  // Edit PassPhrase
  const handleEditPassPhrase = async () => {
    if (!selectedPlayer || !editPassQuestion.trim() || !editPassAnswer.trim()) return;
    try {
      const res = await fetch('http://localhost:4000/players/updatePassPhrase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: selectedPlayer.playerId,
          playerPassQuestion: editPassQuestion.trim(),
          playerPassAnswer: editPassAnswer.trim(),
        }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const updated: Player = await res.json();
      setPlayers(prev =>
        prev.map(p => (p.playerId === updated.playerId ? updated : p))
      );
      setSelectedPlayer(updated);
      setIsPassPhraseOpen(false);
      setEditPassQuestion('');
      setEditPassAnswer('');
    } catch (error) {
      console.error('editPassPhrase failed:', error);
    }
  };

  // Delete Player
  const handleDelete = async () => {
    if (!selectedPlayer) return;
    try {
      const res = await fetch('http://localhost:4000/players/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: selectedPlayer.playerId }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      setPlayers(prev => prev.filter(p => p.playerId !== selectedPlayer.playerId));
      setSelectedPlayer(null);
      setIsDeleteOpen(false);
    } catch (error) {
      console.error('deletePlayer failed:', error);
    }
  };

  // Invite to Play — Play Now
  const handlePlayNow = () => {
    if (!selectedPlayer) return;
    logout();
    loginAsPlayer(selectedPlayer);
    router.push('/select_game');
  };

  if (!user || !group) return null;

  const hasSelection = selectedPlayer !== null;

  const actionButtonClass = (active: boolean) =>
    `w-full p-2 rounded transition-colors ${
      active
        ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer'
        : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
    }`;

  return (
    <div className="min-h-screen bg-emerald-200">
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-2 text-center">{group.groupName}</h1>
        <p className="text-sm text-gray-600 mb-6 text-center">Manage Players</p>

        <div className="md:grid md:grid-cols-3 gap-6">
          {/* Player list */}
          <div className="col-span-1 mb-6 md:mb-0">
            <h2 className="text-lg font-semibold mb-2">Your Players</h2>
            {isLoading ? (
              <p className="text-gray-500 text-sm">Loading...</p>
            ) : players.length === 0 ? (
              <p className="text-gray-500 text-sm italic">No players yet.</p>
            ) : (
              <div className="space-y-2">
                {players.map(player => (
                  <button
                    key={player.playerId}
                    onClick={() => handleSelectPlayer(player)}
                    className={`w-full text-left p-3 rounded border-2 transition-colors ${
                      selectedPlayer?.playerId === player.playerId
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    {player.playerName}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="col-span-2 grid grid-cols-2 gap-3 content-start">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="w-full bg-emerald-500 text-white p-2 rounded hover:bg-emerald-600"
            >
              Create Player
            </button>
            <button
              onClick={() => hasSelection && setIsRenameOpen(true)}
              disabled={!hasSelection}
              className={actionButtonClass(hasSelection)}
            >
              Rename Player
            </button>
            <button
              onClick={() => {
                if (!hasSelection) return;
                setEditPassQuestion(selectedPlayer?.playerPassQuestion ?? '');
                setEditPassAnswer('');
                setIsPassPhraseOpen(true);
              }}
              disabled={!hasSelection}
              className={actionButtonClass(hasSelection)}
            >
              Edit PassPhrase
            </button>
            <button
              onClick={() => hasSelection && setIsDeleteOpen(true)}
              disabled={!hasSelection}
              className={actionButtonClass(hasSelection)}
            >
              Delete Player
            </button>
            <button
              onClick={() => hasSelection && setIsInviteOpen(true)}
              disabled={!hasSelection}
              className={actionButtonClass(hasSelection)}
            >
              Invite to Play
            </button>
            <button
              onClick={() => router.push('/manage_group')}
              className="w-full bg-gray-300 text-gray-700 p-2 rounded hover:bg-gray-400"
            >
              Back to Group
            </button>
          </div>
        </div>
      </div>

      {/* Create Player popup */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h2 className="text-xl font-bold">Create Player Profile</h2>
            <div>
              <label className="block mb-1">Player Name</label>
              <input
                type="text"
                value={newPlayerName}
                onChange={e => setNewPlayerName(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="e.g. Adam"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block mb-1">Secret Question</label>
              <input
                type="text"
                value={newPassQuestion}
                onChange={e => setNewPassQuestion(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="e.g. What is your dog's name?"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block mb-1">Answer</label>
              <input
                type="text"
                value={newPassAnswer}
                onChange={e => setNewPassAnswer(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="e.g. Rex"
                autoComplete="new-password"
              />
            </div>
            {createError && <p className="text-red-500 text-sm">{createError}</p>}
            <div className="flex gap-3">
              <button
                onClick={handleCreate}
                className="flex-1 bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  setNewPlayerName('');
                  setNewPassQuestion('');
                  setNewPassAnswer('');
                  setCreateError('');
                }}
                className="flex-1 bg-gray-300 text-gray-700 p-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename popup */}
      {isRenameOpen && selectedPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h2 className="text-xl font-bold">Rename {selectedPlayer.playerName}</h2>
            <input
              type="text"
              value={renameName}
              onChange={e => setRenameName(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="New name"
              autoComplete="new-password"
            />
            <div className="flex gap-3">
              <button
                onClick={handleRename}
                disabled={!renameName.trim()}
                className={`flex-1 p-2 rounded text-white ${
                  renameName.trim()
                    ? 'bg-blue-500 hover:bg-blue-600'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                Rename
              </button>
              <button
                onClick={() => { setIsRenameOpen(false); setRenameName(''); }}
                className="flex-1 bg-gray-300 text-gray-700 p-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit PassPhrase popup */}
      {isPassPhraseOpen && selectedPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h2 className="text-xl font-bold">Edit PassPhrase for {selectedPlayer.playerName}</h2>
            <div>
              <label className="block mb-1">Secret Question</label>
              <input
                type="text"
                value={editPassQuestion}
                onChange={e => setEditPassQuestion(e.target.value)}
                className="w-full p-2 border rounded"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block mb-1">Answer</label>
              <input
                type="text"
                value={editPassAnswer}
                onChange={e => setEditPassAnswer(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="New answer"
                autoComplete="new-password"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleEditPassPhrase}
                disabled={!editPassQuestion.trim() || !editPassAnswer.trim()}
                className={`flex-1 p-2 rounded text-white ${
                  editPassQuestion.trim() && editPassAnswer.trim()
                    ? 'bg-blue-500 hover:bg-blue-600'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                Save
              </button>
              <button
                onClick={() => { setIsPassPhraseOpen(false); setEditPassQuestion(''); setEditPassAnswer(''); }}
                className="flex-1 bg-gray-300 text-gray-700 p-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation popup */}
      {isDeleteOpen && selectedPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h2 className="text-xl font-bold">Delete {selectedPlayer.playerName}?</h2>
            <p className="text-gray-600">
              This will permanently delete this player profile. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-500 text-white p-2 rounded hover:bg-red-600"
              >
                Delete
              </button>
              <button
                onClick={() => setIsDeleteOpen(false)}
                className="flex-1 bg-gray-300 text-gray-700 p-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite to Play popup */}
      {isInviteOpen && selectedPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h2 className="text-xl font-bold">Invite {selectedPlayer.playerName} to Play</h2>
            <div className="space-y-3">
              <button
                onClick={handlePlayNow}
                className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
              >
                Play Now
              </button>
              <button
                disabled
                className="w-full bg-gray-200 text-gray-400 p-2 rounded cursor-not-allowed opacity-50"
              >
                Create Play Button
              </button>
              <button
                disabled
                className="w-full bg-gray-200 text-gray-400 p-2 rounded cursor-not-allowed opacity-50"
              >
                Send Invite to Play
              </button>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="w-full bg-gray-300 text-gray-700 p-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}