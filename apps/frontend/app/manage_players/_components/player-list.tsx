'use client';
/*
  Display component of player list. No state and makes no fetch.
  Just renders what it receives, and reports clicks back up.
  - players: the array to render
  - selectedPlayer: used to highlight current player
  - isLoading: controls loading state
  - onSelect: callback to the parent when player is clicked
*/
import { useTranslations } from 'next-intl';
import { Player } from '../../types';

type Props = {
  players: Player[];
  selectedPlayer: Player | null;
  isLoading: boolean;
  onSelect: (player: Player) => void;
};

export default function PlayerList({
  players,
  selectedPlayer,
  isLoading,
  onSelect,
}: Props) {
  const t = useTranslations('players');
  const tCommon = useTranslations('common');

  return (
    <ul className="clay-panel overflow-y-auto max-h-64 md:max-h-full md:h-full">
      <li className="border-b border-border px-3 py-2">
        <span className="font-heading text-lg font-semibold text-foreground">{t('yourPlayers')}</span>
      </li>
      {isLoading && (
        <li className="px-3 py-2 text-muted-foreground text-sm">{tCommon('loadingEllipsis')}</li>
      )}
      {!isLoading && players.length === 0 && (
        <li className="px-3 py-2 text-muted-foreground text-sm italic">{t('noPlayers')}</li>
      )}
      {!isLoading && players.map((player) => (
        <li key={player.id} className="border-b border-border last:border-b-0">
          <button
            onClick={() => onSelect(player)}
            className={`w-full text-left px-3 py-2 transition-colors ${
              selectedPlayer?.id === player.id
                ? 'bg-muted font-medium text-foreground'
                : 'text-foreground hover:bg-muted/50'
            }`}
          >
            {player.name}
          </button>
        </li>
      ))}
    </ul>
  );
}
