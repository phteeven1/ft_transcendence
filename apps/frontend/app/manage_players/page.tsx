'use client';

/*
layout structure for manage players. Fetches user and group on mount and builds players array
child components report back via callbacks once their server request succeeds.
Parent updates its own local copy without refetching full list from backend.
players always belong to both a group and a user
*/

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';
import { playersApi } from '@/lib/api';
import { Player } from '../types';
import PlayerList from './_components/player-list';
import CreatePlayer from './_components/create-player';
import RenamePlayer from './_components/rename-player';
import EditPassphrase from './_components/edit-passphrase';
import DeletePlayer from './_components/delete-player';
import InviteToPlay from './_components/invite-to-play';
import EndGameSession from './_components/end-game-session';
import { PageShell } from '../components/ui/page-shell';
import { Button } from '../components/ui/button';

export default function ManagePlayers() {
  const { user, group, player } = useAuth();
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlayers = useCallback(async () => {
    if (!user || !group) return;
    try {
      const data = await playersApi.findByParentInGroup(user.id, group.id);
      setPlayers(data);
    } catch (error) {
      console.error('fetchPlayers failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, group]);

  // guard. if no group or user then back to landing page — unless parent just
  // handed off to a player session (Invite to Play), in which case select_game loads next
  useEffect(() => {
    if (!user || !group) {
      if (player) return;
      router.push('/');
      return;
    }
    fetchPlayers();
  }, [user, group, player, router, fetchPlayers]);

  // guards against no user or no group. fetches only the players belonging to current user in current group
  // displays eventual error, then closes state isLoading regardless of success or failure

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

  // filters out the player whose id matches. Then clears selectedPlayer, since selected player is gone
  const handleDeleted = (playerId: number) => {
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    setSelectedPlayer(null);
  };

  // exactly the same as handleRenamed, but this is triggered on End Game Session
  const handleCleared = (updated: Player) => {
    setPlayers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setSelectedPlayer(updated);
  };

  if (!user || !group) return null;

  return (
    <PageShell>
      <h1 className="font-heading text-2xl font-bold mb-2 text-center text-foreground">
        {group.name}
      </h1>
      <p className="text-sm text-muted-foreground mb-6 text-center">Manage Players</p>

      <div className="md:grid md:grid-cols-3 gap-6">
        <div className="col-span-1 mb-6 md:mb-0">
          <PlayerList
            players={players}
            selectedPlayer={selectedPlayer}
            isLoading={isLoading}
            onSelect={handleSelect}
          />
        </div>
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
          <EndGameSession
            selectedPlayer={selectedPlayer}
            onCleared={handleCleared}
          />
          <Button
            variant="ghost"
            fullWidth
            className="clay-action-btn"
            onClick={() => router.push('/manage_group')}
          >
            Back to Group
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
