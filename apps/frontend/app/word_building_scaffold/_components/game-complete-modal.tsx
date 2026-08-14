'use client';

import { useTranslations } from 'next-intl';
import { Button } from '../../components/ui/button';

type ScoreEntry = {
  playerId: number;
  score: number;
};

type Props = {
  scores: ScoreEntry[];
  playerNames: Map<number, string>;
  onReturnToLobby: () => void;
  isRedirecting: boolean;
};

/**
 * End-game modal shown when the word building puzzle is successfully completed.
 * Displays final scores and offers an option to return to lobby.
 *
 * @param scores Array of player scores from the game state.
 * @param playerNames Map of player IDs to display names.
 * @param onReturnToLobby Callback to return to the game selection lobby.
 * @param isRedirecting Whether the component is currently redirecting.
 */
export default function GameCompleteModal({
  scores,
  playerNames,
  onReturnToLobby,
  isRedirecting,
}: Props) {
  const t = useTranslations('games.wordBuilding');
  const tCommon = useTranslations('common');

  // Rank players top-to-bottom (rank 1 first), mirroring Word Soup's winner-first order.
  const sortedScores = [...scores].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.playerId - b.playerId;
  });
  const topScore = sortedScores.length > 0 ? sortedScores[0].score : 0;

  return (
    <div className="clay-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="clay-modal text-center max-w-md mx-4 w-full">
        {/* Celebration emoji */}
        <div className="text-6xl mb-4" role="img" aria-label="celebration">
          🎉
        </div>

        {/* Title */}
        <h2 className="font-heading text-3xl font-bold text-primary mb-2">
          {t('gameComplete.title')}
        </h2>

        {/* Subtitle */}
        <p className="text-muted-foreground mb-6">
          {t('gameComplete.subtitle')}
        </p>

        {/* Scores section */}
        {sortedScores.length > 0 && (
          <div className="clay-panel mb-6 p-4">
            <h3 className="font-heading font-semibold text-foreground mb-3 text-lg">
              {t('gameComplete.finalScores')}
            </h3>
            <ul className="space-y-2">
              {sortedScores.map(({ playerId, score }, index) => {
                const isWinner = index === 0 && score === topScore;
                return (
                  <li
                    key={playerId}
                    className={[
                      'flex justify-between items-center px-3 py-2 rounded-lg',
                      isWinner
                        ? 'bg-accent/10 border-2 border-accent'
                        : 'bg-surface/50',
                    ].join(' ')}
                  >
                    <span className="flex items-center gap-2">
                      {isWinner && (
                        <span className="text-xl" role="img" aria-label="trophy">
                          🏆
                        </span>
                      )}
                      <span className="font-medium text-foreground">
                        {playerNames.get(playerId) ?? tCommon('playerNumber', { id: playerId })}
                      </span>
                    </span>
                    <span className="font-mono font-bold text-lg text-primary">
                      {score}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="primary"
            onClick={onReturnToLobby}
            disabled={isRedirecting}
            className="w-full sm:w-auto"
          >
            {isRedirecting
              ? t('returningToLobby')
              : t('gameComplete.returnToLobby')}
          </Button>
        </div>
      </div>
    </div>
  );
}
