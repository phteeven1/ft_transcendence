'use client';
/*
this is the bridge between parent session and player session
only prop is selectedPlayer, with no callback, since it doesn't modify players
Play Now checks for an active backend session token before proceeding.
Create Play Button and Send Invite to Play are not yet implemented.
*/
import { useState } from 'react';
import { useAuth } from '../../context/auth-context';
import { useRouter } from 'next/navigation';
import { ApiError, playersApi } from '@/lib/api';
import { savePlayerSession } from '@/lib/player-session';
import { Player } from '../../types';
import { Button } from '../../components/ui/button';
import { Dialog } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';

type Props = {
  selectedPlayer: Player | null;
};

const SESSION_SHORTCUTS = [30, 45, 60];

export default function InviteToPlay({ selectedPlayer }: Props) {
  const { loginAsPlayer, setSessionExpiresAt, group } = useAuth();
  const router = useRouter();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isSessionOpen, setIsSessionOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [startError, setStartError] = useState('');
  const [sessionMinutes, setSessionMinutes] = useState('');

  const isActive = selectedPlayer !== null && !!group?.currentVocabulary;

  const handlePlayNow = async () => {
    if (!selectedPlayer) return;
    setIsChecking(true);
    setHasActiveSession(false);
    try {
      const activeSession = await playersApi.getActiveSession(selectedPlayer.id);
      if (activeSession) {
        setHasActiveSession(true);
        return;
      }
      setIsInviteOpen(false);
      setSessionMinutes('');
      setStartError('');
      setIsSessionOpen(true);
    } catch {
      setHasActiveSession(true);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSessionStart = async () => {
    if (!selectedPlayer) return;
    const minutes = parseInt(sessionMinutes, 10);
    if (!minutes || minutes <= 0) return;

    setIsStarting(true);
    setStartError('');
    try {
      const session = await playersApi.startSession({
        playerId: selectedPlayer.id,
        minutes,
      });

      savePlayerSession(
        selectedPlayer.id,
        session.token,
        session.expiresAt,
      );

      loginAsPlayer(selectedPlayer);
      setSessionExpiresAt(new Date(session.expiresAt).getTime());
      setIsSessionOpen(false);
      router.replace('/select_game');
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setStartError(
          `${selectedPlayer.name} already has an active session. End it first.`,
        );
      } else {
        setStartError('Could not start session. Please try again.');
      }
    } finally {
      setIsStarting(false);
    }
  };

  const closeInvite = () => {
    setIsInviteOpen(false);
    setHasActiveSession(false);
  };

  const canStart =
    !isStarting &&
    sessionMinutes !== '' &&
    parseInt(sessionMinutes, 10) > 0;

  return (
    <>
      <Button
        variant="accent"
        fullWidth
        className="clay-action-btn"
        onClick={() => isActive && setIsInviteOpen(true)}
        disabled={!isActive}
      >
        Invite to Play
      </Button>

      {selectedPlayer && (
        <Dialog
          open={isInviteOpen}
          onClose={closeInvite}
          title={`Invite ${selectedPlayer.name} to Play`}
          footer={
            <div className="flex flex-col gap-3 shrink-0 border-t border-border pt-4">
              <Button
                variant="primary"
                fullWidth
                onClick={handlePlayNow}
                disabled={isChecking}
              >
                {isChecking ? 'Checking…' : 'Play Now'}
              </Button>
              <Button variant="ghost" fullWidth disabled>
                Create Play Button
              </Button>
              <Button variant="ghost" fullWidth disabled>
                Send Invite to Play
              </Button>
              <Button variant="ghost" fullWidth onClick={closeInvite}>
                Cancel
              </Button>
            </div>
          }
        >
          {hasActiveSession && (
            <p className="text-destructive text-sm">
              {selectedPlayer.name} already has an active play session.
              Please end it first using the End Game Session button.
            </p>
          )}
        </Dialog>
      )}

      {selectedPlayer && (
        <Dialog
          open={isSessionOpen}
          onClose={() => setIsSessionOpen(false)}
          title={`How long can ${selectedPlayer.name} play?`}
          footer={
            <div className="flex gap-3 shrink-0 border-t border-border pt-4">
              <Button
                variant="ghost"
                fullWidth
                onClick={() => setIsSessionOpen(false)}
                disabled={isStarting}
              >
                Cancel
              </Button>
              <Button
                variant="accent"
                fullWidth
                onClick={handleSessionStart}
                disabled={!canStart}
              >
                {isStarting ? 'Starting…' : 'Start'}
              </Button>
            </div>
          }
        >
          <div className="space-y-2">
            <Input
              label="Minutes"
              type="number"
              min="1"
              value={sessionMinutes}
              onChange={(e) => setSessionMinutes(e.target.value)}
              placeholder="Enter minutes"
            />
            <div className="flex gap-2 pt-1">
              {SESSION_SHORTCUTS.map((mins) => (
                <Button
                  key={mins}
                  variant="ghost"
                  size="sm"
                  className="w-10 h-10 rounded-full p-0"
                  onClick={() => setSessionMinutes(String(mins))}
                >
                  {mins}
                </Button>
              ))}
            </div>
            {startError && (
              <p className="text-destructive text-sm">{startError}</p>
            )}
          </div>
        </Dialog>
      )}
    </>
  );
}
