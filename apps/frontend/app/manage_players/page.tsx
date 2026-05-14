'use client';

/*
layout structure for manage players. Fetches user and group on mount and builds players array
child components report back via callbacks once their server request succeeds.
Parent updates its own local copy without refetching full list from backend.
players always belong to both a group and a user
*/

import { useEffect, useState } from 'react';
import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';
import { Player } from '../types';
import PlayerList from './_components/player-list';
import CreatePlayer from './_components/create-player';
import RenamePlayer from './_components/rename-player';
import EditPassphrase from './_components/edit-passphrase';
import DeletePlayer from './_components/delete-player';
import InviteToPlay from './_components/invite-to-play';

export default function ManagePlayers() {
  const { user, group } = useAuth();
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // guard. if no group or user then back to landing page
  useEffect(() => {
    if (!user || !group) {
      router.push('/');
      return;
    }
    fetchPlayers();
  }, []);

  // guards against no user or no group. fetches only the players belonging to current user in current group
  // displays eventual error, then closes state isLoading regardless of success or failure
  const fetchPlayers = async () => {
    if (!user || !group) return;
    try {
      const res = await fetch(
        `http://localhost:4000/players/parent/${user.id}/group/${group.id}`,
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

  // toggle. If already selected -> null, if not selected
  const handleSelect = (player: Player) => {
    setSelectedPlayer((prev) => (prev?.id === player.id ? null : player));
  };

  // appends new player to end of array 'players' using setPlayers
  const handleCreated = (player: Player) => {
    setPlayers((prev) => [...prev, player]);
  };

  // maps over array 'players' and for the player whose id matches, replaces with updated version
  // also updates selectedPlayer to reflect new name immediatelly
  const handleRenamed = (updated: Player) => {
    setPlayers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setSelectedPlayer(updated);
  };

  // exactly the same as handleRenamed, but this is triggered by passphrase edit. To differentiate
  const handleUpdated = (updated: Player) => {
    setPlayers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setSelectedPlayer(updated);
  };

  // filetrs out the player whose id matches. Then clears selectedPlayer, since selected player is gone
  const handleDeleted = (playerId: number) => {
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    setSelectedPlayer(null);
  };

  if (!user || !group) return null;

  return (
    <div className="min-h-screen bg-emerald-200">
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-2 text-center">{group.name}</h1>
        <p className="text-sm text-gray-600 mb-6 text-center">Manage Players</p>

        <div className="md:grid md:grid-cols-3 gap-6">
          {' '}
          {/* overrides with pc layout if md */}
          {/* Player list */}
          <div className="col-span-1 mb-6 md:mb-0">
            <h2 className="text-lg font-semibold mb-2">Your Players</h2>
            <PlayerList
              players={players}
              selectedPlayer={selectedPlayer}
              isLoading={isLoading}
              onSelect={handleSelect}
            />
          </div>
          {/* Action buttons */}
          <div className="col-span-2 grid grid-cols-2 gap-3 content-start">
            <CreatePlayer onCreated={handleCreated} />
            <RenamePlayer
              selectedPlayer={selectedPlayer}
              onRenamed={handleRenamed}
            />
            <EditPassphrase
              selectedPlayer={selectedPlayer}
              onUpdated={handleUpdated}
            />
            <DeletePlayer
              selectedPlayer={selectedPlayer}
              onDeleted={handleDeleted}
            />
            <InviteToPlay selectedPlayer={selectedPlayer} />
            <button
              onClick={() => router.push('/manage_group')}
              className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            >
              Back to Group
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
