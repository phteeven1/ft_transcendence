import type { useTranslations } from 'next-intl';
import type { GameFinishOutcomeDto, GameFinishPlayerOutcomeDto } from '@/lib/api/games/types';
import { computeXpAwarded, isMultiplayerGame } from '@/lib/api/progression';

export type OutroTranslateFn = ReturnType<
  typeof useTranslations<'games.wordSoup.outro'>
>;

export function getGameOverClosingText(
  players: GameFinishPlayerOutcomeDto[],
  t: OutroTranslateFn,
): string {
  if (players.length === 1) {
    return t('closingSolo', {
      name: players[0]?.playerName ?? 'everyone',
    });
  }
  return t('closingMulti');
}

export type GameOverAnnouncement = {
  playerId: number;
  speech: string;
};

export function buildGameOverAnnouncements(
  players: GameFinishPlayerOutcomeDto[],
  t: OutroTranslateFn,
): GameOverAnnouncement[] {
  if (players.length === 0) return [];

  const sorted = [...players].sort((a, b) => a.score - b.score);
  const winners = sorted.filter((player) => player.isWinner);
  const nonWinners = sorted.filter((player) => !player.isWinner);
  const totalPlayers = sorted.length;
  const announcements: GameOverAnnouncement[] = [];

  for (let index = 0; index < nonWinners.length; index += 1) {
    const player = nonWinners[index]!;
    const place = totalPlayers - index;
    announcements.push({
      playerId: player.playerId,
      speech: t('placeAnnouncement', {
        place,
        name: player.playerName,
        score: player.score,
        xp: player.xpAwarded,
      }),
    });
  }

  for (let index = 0; index < winners.length; index += 1) {
    const player = winners[index]!;
    if (totalPlayers === 1) {
      announcements.push({
        playerId: player.playerId,
        speech: t('firstPlaceSolo', {
          name: player.playerName,
          score: player.score,
          xp: player.xpAwarded,
        }),
      });
      continue;
    }
    const prefix =
      index === 0
        ? winners.length > 1
          ? t('winnersPrefix')
          : t('winnerPrefix')
        : '';
    announcements.push({
      playerId: player.playerId,
      speech: `${prefix}${t('winnerAnnouncement', {
        name: player.playerName,
        score: player.score,
        xp: player.xpAwarded,
      })}`,
    });
  }

  return announcements;
}

export function buildFallbackFinishOutcome(
  players: Array<{ id: number; name: string }>,
  playerScores: Record<number, number>,
): GameFinishOutcomeDto {
  const scores = players.map((player) => playerScores[player.id] ?? 0);
  const maxScore = scores.length > 0 ? Math.max(...scores) : 0;

  return {
    players: players.map((player) => {
      const score = playerScores[player.id] ?? 0;
      const isWinner =
        isMultiplayerGame(players.length) &&
        players.length > 0 &&
        score === maxScore;
      return {
        playerId: player.id,
        playerName: player.name,
        score,
        xpAwarded: computeXpAwarded(players.length, isWinner),
        isWinner,
        newlyUnlockedTier: null,
      };
    }),
  };
}
