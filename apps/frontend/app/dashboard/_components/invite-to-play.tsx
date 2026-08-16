'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../context/auth-context';
import { useRouter } from 'next/navigation';
import { ApiError, playersApi } from '@/lib/api';
import { savePlayerSession } from '@/lib/player-session';
import { Player } from '../../types';
import { Button } from '../../components/ui/button';
import { Dialog } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';

type Props = {
  player: Player | null;
  open: boolean;
  onClose: () => void;
};

const SESSION_SHORTCUTS = [30, 45, 60];

export default function InviteToPlay({ player, open, onClose }: Props) {
  const t = useTranslations('players');
  const tCommon = useTranslations('common');
  const { loginAsPlayer, setSessionExpiresAt, group } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [startError, setStartError] = useState('');
  const [sessionMinutes, setSessionMinutes] = useState('');

  useEffect(() => {
    if (!open || !player) return;
    let cancelled = false;
    setHasActiveSession(false);
    setStartError('');
    setSessionMinutes('');
    setIsEnding(false);
    setIsChecking(true);

    void (async () => {
      try {
        const activeSession = await playersApi.getActiveSession(player.id);
        if (!cancelled) setHasActiveSession(Boolean(activeSession));
      } catch {
        if (!cancelled) setHasActiveSession(true);
      } finally {
        if (!cancelled) setIsChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, player]);

  const handleClose = () => {
    setHasActiveSession(false);
    setStartError('');
    setSessionMinutes('');
    onClose();
  };

  const handleEndSession = async () => {
    if (!player) return;
    setIsEnding(true);
    setStartError('');
    try {
      await playersApi.clearSession(player.id);
      setHasActiveSession(false);
    } catch {
      setStartError(t('invite.endSessionFailed'));
    } finally {
      setIsEnding(false);
    }
  };

  const handleSessionStart = async () => {
    if (!player) return;
    const minutes = parseInt(sessionMinutes, 10);
    if (!minutes || minutes <= 0) return;

    setIsStarting(true);
    setStartError('');
    try {
      const session = await playersApi.startSession({
        playerId: player.id,
        minutes,
      });

      savePlayerSession(player.id, session.token, session.expiresAt);

      loginAsPlayer(player);
      setSessionExpiresAt(new Date(session.expiresAt).getTime());
      router.replace('/select_game');
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setStartError(t('invite.activeSessionExists', { name: player.name }));
      } else {
        setStartError(t('invite.startFailed'));
      }
    } finally {
      setIsStarting(false);
    }
  };

  const canStart =
    !isStarting &&
    !isEnding &&
    !isChecking &&
    !hasActiveSession &&
    sessionMinutes !== '' &&
    parseInt(sessionMinutes, 10) > 0;

  if (!player || !group) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={t('invite.sessionDurationTitle', { name: player.name })}
      footer={
        <div className="flex gap-3 shrink-0 border-t border-border pt-4">
          <Button
            variant="ghost"
            fullWidth
            onClick={handleClose}
            disabled={isStarting || isEnding}
          >
            {tCommon('cancel')}
          </Button>
          <Button
            variant="accent"
            fullWidth
            onClick={handleSessionStart}
            disabled={!canStart}
          >
            {isStarting ? tCommon('starting') : tCommon('start')}
          </Button>
        </div>
      }
    >
      <div className="space-y-2">
        {hasActiveSession && (
          <div className="space-y-2">
            <p className="text-destructive text-sm">
              {t('invite.activeSessionWarning', { name: player.name })}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleEndSession()}
              disabled={isEnding || isStarting}
            >
              {isEnding ? tCommon('ending') : t('invite.endSession')}
            </Button>
          </div>
        )}
        <Input
          label={t('invite.minutesLabel')}
          type="number"
          min="1"
          value={sessionMinutes}
          onChange={(e) => setSessionMinutes(e.target.value)}
          placeholder={t('invite.minutesPlaceholder')}
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
  );
}
