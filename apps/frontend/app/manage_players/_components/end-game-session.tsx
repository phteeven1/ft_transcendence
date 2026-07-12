'use client';
/*
Allows a parent to force-clear a player's active browser session and game state.
On confirm, calls clearSession on the backend and reports back via onCleared.
*/
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { playersApi } from '@/lib/api';
import { Player } from '../../types';
import { Button } from '../../components/ui/button';
import { Dialog } from '../../components/ui/dialog';

type Props = {
  selectedPlayer: Player | null;
  onCleared: (updated: Player) => void;
};

export default function EndGameSession({ selectedPlayer, onCleared }: Props) {
  const t = useTranslations('players');
  const tCommon = useTranslations('common');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasActiveSession, setHasActiveSession] = useState(false);

  useEffect(() => {
    if (!selectedPlayer) {
      setHasActiveSession(false);
      return;
    }

    let active = true;
    playersApi
      .getActiveSession(selectedPlayer.id)
      .then((session) => {
        if (active) setHasActiveSession(session !== null);
      })
      .catch(() => {
        if (active) setHasActiveSession(false);
      });

    return () => {
      active = false;
    };
  }, [selectedPlayer]);

  const isActive =
    selectedPlayer !== null &&
    (selectedPlayer.currentGameId !== null || hasActiveSession);

  const handleConfirm = async () => {
    if (!selectedPlayer) return;
    setIsLoading(true);
    setError('');
    try {
      await playersApi.clearSession(selectedPlayer.id);
      const updated = await playersApi.getById(selectedPlayer.id);
      setHasActiveSession(false);
      setIsConfirmOpen(false);
      onCleared(updated);
    } catch {
      setError(t('endSession.failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        fullWidth
        className="clay-action-btn"
        onClick={() => isActive && setIsConfirmOpen(true)}
        disabled={!isActive}
      >
        {t('endGameSession')}
      </Button>

      {selectedPlayer && (
        <Dialog
          open={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          title={t('endSession.title')}
          confirmLabel={isLoading ? tCommon('ending') : t('endSession.endSessionButton')}
          confirmVariant="destructive"
          onConfirm={handleConfirm}
          confirmDisabled={isLoading}
        >
          <p className="text-sm">
            {t('endSession.confirmMessage', { name: selectedPlayer.name })}
          </p>
          {error && <p className="text-destructive text-sm mt-2">{error}</p>}
        </Dialog>
      )}
    </>
  );
}
